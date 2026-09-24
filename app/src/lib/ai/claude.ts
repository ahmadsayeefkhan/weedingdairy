import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { runTool, toolsFor, type ToolCtx } from "./tools";

/** Model and price table live here; override the model with AI_MODEL. */
export const AI_MODEL = process.env.AI_MODEL || "claude-opus-5";
const PRICES: Record<string, [number, number]> = { "claude-opus-5": [5, 25], "claude-sonnet-5": [2, 10], "claude-haiku-4-5": [1, 5], "claude-opus-5-5": [4, 20] };

export const aiEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const SYSTEM = `You are Wedding AI, the planning assistant inside Wedding Diary Bangladesh (powered by WeddingOS.ai).
You help a Bangladeshi couple and their family plan Gaye Holud, Mehendi, Wedding and Reception events.
Answer from the wedding's real data using the tools; never invent numbers, vendors or dates. If a tool isn't available, the user's role can't see that data, so say so.
Money is in Bangladeshi taka with lakh grouping (৳25,00,000). Reply in the user's language: English, Bangla, or Banglish (romanised Bangla) as they wrote.
Be warm and brief: a few sentences or a short list. You can't change data; point to the right screen (Budget, Guests, Checklist, Vendors, Events) for actions.`;

export type Turn = { role: "user" | "assistant"; text: string };

export async function claudeAnswer(ctx: ToolCtx, question: string, history: Turn[]) {
  const client = new Anthropic();
  const tools = toolsFor(ctx.role).map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.slice(-6).map((h) => ({ role: h.role, content: h.text }) as Anthropic.Beta.BetaMessageParam),
    { role: "user", content: question },
  ];
  const used: string[] = [];
  let tokensIn = 0, tokensOut = 0;
  for (let step = 0; step < 6; step++) {
    // Server-side refusal fallback is on by default for the Opus 5 / Fable tier.
    const fallback = /^claude-(opus-5|fable)/.test(AI_MODEL) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {};
    const res = await client.beta.messages.create({
      ...fallback,
      model: AI_MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      tools,
      messages,
    });
    tokensIn += res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0);
    tokensOut += res.usage.output_tokens;
    if (res.stop_reason === "refusal") return { answer: "I can't help with that one. Try asking about your budget, guests, schedule or vendors.", used, tokensIn, tokensOut, cost: cost(tokensIn, tokensOut) };
    if (res.stop_reason !== "tool_use") {
      const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      return { answer: text || "I don't have an answer for that yet.", used, tokensIn, tokensOut, cost: cost(tokensIn, tokensOut) };
    }
    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const b of res.content) {
      if (b.type !== "tool_use") continue;
      used.push(b.name);
      const out = await runTool(ctx, b.name, (b.input ?? {}) as Record<string, unknown>);
      results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out), ...(out && typeof out === "object" && "error" in out ? { is_error: true } : {}) });
    }
    messages.push({ role: "user", content: results });
  }
  return { answer: "That took too many steps. Try a more specific question.", used, tokensIn, tokensOut, cost: cost(tokensIn, tokensOut) };
}

function cost(i: number, o: number) {
  const [pi, po] = PRICES[AI_MODEL] ?? [5, 25];
  return (i * pi + o * po) / 1_000_000;
}
