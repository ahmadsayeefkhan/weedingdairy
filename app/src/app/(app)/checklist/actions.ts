"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeWedding, EDITORS, PermissionError } from "@/lib/wedding";
import { fail, ok, str, type ActionResult } from "@/lib/result";
import { parseDateInput, today } from "@/lib/today";
import { TASK_CATEGORIES } from "@/lib/constants";
import { audit } from "@/lib/log";

async function guard() {
  try { return await authorizeWedding(EDITORS); } catch (e) { if (e instanceof PermissionError) return null; throw e; }
}

export async function toggleTask(fd: FormData) {
  const g = await guard(); if (!g) return;
  const t = await db.task.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId } });
  if (!t) return;
  await db.task.update({ where: { id: t.id }, data: { done: !t.done, doneAt: t.done ? null : today() } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: t.done ? "task.reopened" : "task.completed", entity: "Task", entityId: t.id, detail: t.title });
  revalidatePath("/", "layout");
}

export async function addTask(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let g;
  try { g = await authorizeWedding(EDITORS); } catch (e) { if (e instanceof PermissionError) return fail(e.message); throw e; }
  const title = str(fd, "title");
  const category = str(fd, "category");
  const due = str(fd, "due");
  const eventId = str(fd, "eventId");
  if (title.length < 3) return fail("Describe the task in a few words.");
  if (!TASK_CATEGORIES[category]) return fail("Choose a category.");
  const dueDate = due ? parseDateInput(due) : null;
  if (due && !dueDate) return fail("Enter a valid due date.");
  if (eventId && !(await db.event.findFirst({ where: { id: eventId, weddingId: g.weddingId } }))) return fail("That event no longer exists.");
  const max = await db.task.aggregate({ where: { weddingId: g.weddingId }, _max: { order: true } });
  await db.task.create({ data: { weddingId: g.weddingId, title, category, dueDate, eventId: eventId || null, order: (max._max.order ?? 0) + 1 } });
  revalidatePath("/", "layout");
  return ok("Task added.");
}

export async function moveTask(fd: FormData) {
  const g = await guard(); if (!g) return;
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const tasks = await db.task.findMany({ where: { weddingId: g.weddingId }, orderBy: [{ order: "asc" }, { id: "asc" }] });
  const i = tasks.findIndex((t) => t.id === str(fd, "id"));
  const j = i + dir;
  if (i < 0 || j < 0 || j >= tasks.length) return;
  [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
  await db.$transaction(tasks.map((t, k) => db.task.update({ where: { id: t.id }, data: { order: k } })));
  revalidatePath("/checklist");
}

export async function deleteTask(fd: FormData) {
  const g = await guard(); if (!g) return;
  await db.task.deleteMany({ where: { id: str(fd, "id"), weddingId: g.weddingId } });
  revalidatePath("/", "layout");
}
