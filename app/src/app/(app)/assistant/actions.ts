"use server";
import { db } from "@/lib/db";
import { authorizeWedding, ALL, PermissionError } from "@/lib/wedding";
import { aiEnabled, AI_MODEL, claudeAnswer, type Turn } from "@/lib/ai/claude";
import { scriptedAnswer } from "@/lib/ai/scripted";

const DAILY_LIMIT = 60; // per user, keeps API spend predictable

export type AskResult = { ok: true; answer: string; mode: "claude" | "scripted" } | { ok: false; error: string };

export async function askAssistant(question: string, history: Turn[]): Promise<AskResult> {
  let g;
  try { g = await authorizeWedding(ALL); } catch (e) { if (e instanceof PermissionError) return { ok: false, error: e.message }; throw e; }
  const q = question.trim().slice(0, 1000);
  if (q.length < 2) return { ok: false, error: "Type a question first." };
  const since = new Date(Date.now() - 86_400_000);
  if ((await db.aiLog.count({ where: { userId: g.user.id, createdAt: { gte: since } } })) >= DAILY_LIMIT) return { ok: false, error: `You've asked ${DAILY_LIMIT} questions in the last 24 hours. Wedding AI will be ready again tomorrow.` };
  const ctx = { weddingId: g.weddingId, role: g.role };
  const safeHistory = (Array.isArray(history) ? history : []).filter((h) => (h.role === "user" || h.role === "assistant") && typeof h.text === "string").map((h) => ({ role: h.role, text: h.text.slice(0, 2000) }));
  let answer: string, mode: "claude" | "scripted", tools: string[], tokensIn = 0, tokensOut = 0, costUsd = 0;
  if (aiEnabled()) {
    try {
      const r = await claudeAnswer(ctx, q, safeHistory);
      ({ answer } = r); mode = "claude"; tools = r.used; tokensIn = r.tokensIn; tokensOut = r.tokensOut; costUsd = r.cost;
    } catch (e) {
      // API trouble (key, network, rate limit): fall back to the scripted answer so the planner keeps working.
      console.error("AI assistant error", e instanceof Error ? e.message : e);
      const r = await scriptedAnswer(ctx, q);
      answer = r.answer; mode = "scripted"; tools = r.tools;
    }
  } else {
    const r = await scriptedAnswer(ctx, q);
    answer = r.answer; mode = "scripted"; tools = r.tools;
  }
  await db.aiLog.create({ data: { userId: g.user.id, weddingId: g.weddingId, question: q, answer, mode: mode === "claude" ? `claude:${AI_MODEL}` : "scripted", tools: tools.join(","), tokensIn, tokensOut, costUsd } });
  return { ok: true, answer, mode };
}
