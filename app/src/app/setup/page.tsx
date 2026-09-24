import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/icons";
import SetupForm from "./SetupForm";
import { toDateInput, addDays, today } from "@/lib/today";

export const metadata = { title: "Profile setup" };

export default async function SetupPage() {
  const user = await requireUser();
  if (user.role !== "USER") redirect(user.role === "ADMIN" ? "/admin" : "/vendor");
  if (await db.weddingMember.findFirst({ where: { userId: user.id } })) redirect("/dashboard");
  return (
    <main className="center-page">
      <div className="ambient" />
      <div className="card stack-lg" style={{ width: "100%", maxWidth: 560, padding: 28 }}>
        <div className="row" style={{ gap: 10 }}><Logo size={28} /><span className="eyebrow">Profile setup</span></div>
        <div className="head-title" style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 14 }}>
          <h1 style={{ fontSize: 28, color: "var(--accent-ink)" }}>Tell us about your big day</h1>
          <p className="muted" style={{ fontStyle: "italic", fontWeight: 300 }}>We&apos;ll build your events, budget and checklist from this. You can change everything later.</p>
        </div>
        <SetupForm minDate={toDateInput(addDays(today(), 1))} defaultDate={toDateInput(addDays(today(), 150))} />
      </div>
    </main>
  );
}
