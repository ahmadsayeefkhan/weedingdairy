import "server-only";
import { runTool, type ToolCtx } from "./tools";

/**
 * Offline answers from real data when no API key is set. Deterministic keyword matching
 * over English, Bangla and Banglish ("koto taka baki?", "kobe holud?").
 */
const has = (q: string, words: string[]) => words.some((w) => q.includes(w));

const CATEGORY_WORDS: [string, string[]][] = [
  ["PHOTOGRAPHY", ["photographer", "photo", "ফটো", "chobi", "ছবি"]],
  ["CINEMATOGRAPHY", ["cinemat", "video", "film", "ভিডিও"]],
  ["VENUE", ["venue", "hall", "convention", "ভেন্যু", "হল"]],
  ["CATERING", ["cater", "food", "kacchi", "biryani", "khabar", "খাবার", "কাচ্চি"]],
  ["DECOR", ["decor", "stage", "flower", "ডেকোর", "সাজ"]],
  ["MAKEUP", ["makeup", "make up", "parlour", "parlor", "মেকআপ"]],
  ["MEHENDI", ["mehendi artist", "henna", "mehndi artist", "মেহেদি আর্টিস্ট"]],
  ["MUSIC", ["dj", "music", "band", "gaan", "গান"]],
  ["TRANSPORT", ["car", "gari", "গাড়ি"]],
];

type R = { answer: string; tools: string[] };

export async function scriptedAnswer(ctx: ToolCtx, question: string): Promise<R> {
  const q = question.toLowerCase();
  const tools: string[] = [];
  const call = async <T,>(name: string, input: Record<string, unknown> = {}) => { tools.push(name); return (await runTool(ctx, name, input)) as T; };
  const money = ctx.role === "COUPLE";

  if (has(q, ["budget", "spent", "koto taka", "baki", "remaining", "left", "khoroch", "বাজেট", "খরচ", "বাকি"]) && !has(q, ["guest", "task"])) {
    if (!money) return { answer: "Budget details are only visible to the couple. Ask them to share the numbers with you.", tools };
    const b = await call<{ total: string; spent: string; remaining: string; percentUsed: number; categories: { name: string; overBudget: boolean; committed: string; allocated: string }[] }>("budget_summary");
    const over = b.categories.filter((c) => c.overBudget);
    return { answer: `You've spent ${b.spent} of your ${b.total} budget (${b.percentUsed}%), so ${b.remaining} is left.${over.length ? ` Watch out: ${over.map((c) => `${c.name} (${c.committed} committed vs ${c.allocated} planned)`).join(", ")} ${over.length > 1 ? "are" : "is"} over plan.` : " Every category is within plan."}`, tools };
  }
  if (has(q, ["payment", "pay", "due", "deposit", "advance", "installment", "টাকা দিতে", "পেমেন্ট", "dite hobe"])) {
    if (!money) return { answer: "Payment details are only visible to the couple.", tools };
    const ps = await call<{ vendor: string; milestone: string; amount: string; due: string; status: string }[]>("payments_due");
    if (!ps.length) return { answer: "No vendor payments are outstanding. Everything scheduled so far is paid.", tools };
    return { answer: `You have ${ps.length} unpaid milestones. The next ones:\n${ps.slice(0, 4).map((p) => `• ${p.vendor}: ${p.milestone} ${p.amount}, due ${p.due} (${p.status})`).join("\n")}\nPay them from Budget → Payment scheduler.`, tools };
  }
  if (has(q, ["guest", "rsvp", "invite", "mehman", "confirm", "অতিথি", "দাওয়াত", "koto jon", "how many people"])) {
    const g = await call<{ invitedSeats: number; confirmedSeats: number; pendingSeats: number; declinedSeats: number; pendingInvitations: string[]; dietaryCounts: Record<string, number> }>("guest_summary");
    return { answer: `${g.confirmedSeats} guests have confirmed, ${g.pendingSeats} seats are still pending and ${g.declinedSeats} declined, out of ${g.invitedSeats} invited.${g.pendingInvitations.length ? ` Still waiting on: ${g.pendingInvitations.slice(0, 6).join(", ")}${g.pendingInvitations.length > 6 ? ` and ${g.pendingInvitations.length - 6} more` : ""}.` : ""}`, tools };
  }
  if (has(q, ["task", "checklist", "to do", "todo", "kaj", "কাজ", "overdue", "what should i do", "next step"])) {
    const t = await call<{ done: number; total: number; overdue: { task: string; due: string }[]; next14Days: { task: string; due: string }[] }>("checklist_status");
    const list = [...t.overdue.map((x) => `• ${x.task} (overdue since ${x.due})`), ...t.next14Days.map((x) => `• ${x.task} (due ${x.due})`)].slice(0, 6);
    return { answer: `You've finished ${t.done} of ${t.total} tasks.${list.length ? ` Focus on these next:\n${list.join("\n")}` : " Nothing is due in the next two weeks."}`, tools };
  }
  for (const [cat, words] of CATEGORY_WORDS) {
    if (has(q, words) && has(q, ["find", "suggest", "recommend", "best", "vendor", "book", "khujo", "lagbe", "chai", "খুঁজ", "দরকার", "who", "which", "?"])) {
      const budget = q.match(/(\d[\d,]*)\s*(k|হাজার|hazar|lakh|lac|l)?/);
      let max: number | undefined;
      if (budget) { const n = Number(budget[1].replace(/,/g, "")); const unit = budget[2]; max = unit && /lakh|lac|l/.test(unit) ? n * 100000 : unit && /k|হাজার|hazar/.test(unit) ? n * 1000 : n > 999 ? n : undefined; }
      const vs = await call<{ name: string; area: string; from: string; rating: number | string; freeOnWeddingDay: boolean }[]>("search_vendors", { category: cat, ...(max ? { max_price: max } : {}) });
      if (!vs.length) return { answer: "I couldn't find a matching vendor. Try a higher budget or another city in the marketplace.", tools };
      return { answer: `Top matches${max ? ` under ৳${max.toLocaleString("en-IN")}` : ""}:\n${vs.slice(0, 4).map((v) => `• ${v.name} (${v.area}), from ${v.from}, ★ ${v.rating}${v.freeOnWeddingDay ? ", free on your date" : ", booked on your date"}`).join("\n")}\nOpen the marketplace to compare packages and send a request.`, tools };
    }
  }
  if (has(q, ["timeline", "schedule", "program", "somoy", "সময়সূচি", "when is", "kobe", "কবে", "event", "holud", "hoLud", "mehendi", "reception", "days", "koydin", "কতদিন", "countdown", "anushthan", "অনুষ্ঠান"])) {
    const o = await call<{ couple: string; weddingDate: string; daysToGo: number; events: { name: string; date: string; daysAway: number; venue: string | null }[] }>("wedding_overview");
    const upcoming = o.events.filter((e) => e.daysAway >= 0);
    return { answer: `${o.couple}'s wedding is on ${o.weddingDate}${o.daysToGo >= 0 ? `, ${o.daysToGo} days from today` : ""}.\n${o.events.map((e) => `• ${e.name}: ${e.date}${e.venue ? ` at ${e.venue}` : ""}${e.daysAway === 0 ? " (today)" : ""}`).join("\n")}${upcoming[0] ? `\nNext up: ${upcoming[0].name}.` : ""}`, tools };
  }
  if (has(q, ["booking", "booked", "vendors", "ভেন্ডর"])) {
    const bs = await call<{ vendor: string; category: string; status: string; date: string }[]>("bookings_status");
    return { answer: bs.length ? `Your vendors:\n${bs.map((b) => `• ${b.vendor} (${b.category}): ${b.status.toLowerCase()} for ${b.date}`).join("\n")}` : "You haven't booked any vendors yet. Start in the marketplace.", tools };
  }
  if (has(q, ["hello", "hi", "salam", "assalamu", "shubho", "হ্যালো", "আসসালামু"])) {
    return { answer: "Assalamu alaikum! I can tell you how much budget is left, who hasn't RSVP'd, which tasks are due, your event schedule, upcoming payments, or suggest vendors. What would you like to know?", tools };
  }
  return { answer: "In offline mode I can answer questions about your budget, payments, guests and RSVPs, checklist, event schedule, bookings, and vendor suggestions (e.g. \"find a photographer under 60k\"). Try one of those.", tools };
}
