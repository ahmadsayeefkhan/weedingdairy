import { requireWedding } from "@/lib/wedding";
import { aiEnabled } from "@/lib/ai/claude";
import { PageHead } from "@/components/ui";
import { Icon } from "@/components/icons";
import Chat from "./Chat";

export const metadata = { title: "Wedding AI" };

export default async function AssistantPage() {
  const { user, role } = await requireWedding();
  const first = user.name.split(" ")[0];
  const suggestions = [
    ...(role === "COUPLE" ? ["How much budget is left?", "Which payments are due?"] : []),
    "Who hasn't RSVP'd yet?",
    "What should I do this week?",
    "Find a photographer under 60k",
    "Holud kobe?",
  ];
  return (
    <div className="stack-lg">
      <PageHead title="AI Wedding Assistant" sub="Your 24/7 planning partner, answering from your own wedding data" />
      <div className="split">
        <Chat greeting={`Shubho shokal, ${first}! Ask me about your budget, guests, schedule, tasks or vendors. I read your plan but never change it.`} suggestions={suggestions} live={aiEnabled()} />
        <aside className="stack-lg">
          <div className="card stack">
            <div className="row" style={{ gap: 8 }}><span className="icon-chip"><Icon name="sparkle" /></span><b style={{ fontWeight: 500 }}>What it can see</b></div>
            <p className="small muted">Events and timelines, checklist, guest counts, bookings and the marketplace{role === "COUPLE" ? ", plus your budget and payments" : ". Budget figures stay private to the couple"}.</p>
            <p className="small muted">Guest phone numbers, emails and personal notes are never shared with the AI.</p>
          </div>
          <div className="card stack">
            <div className="row" style={{ gap: 8 }}><span className="icon-chip"><Icon name="globe" /></span><b style={{ fontWeight: 500 }}>Bilingual</b></div>
            <p className="small muted">Ask in English, বাংলা or Banglish, e.g. &ldquo;koto taka baki ache?&rdquo;</p>
          </div>
          {!aiEnabled() && <div className="notice"><Icon name="lock" /><span className="small">Offline mode: answers come from your data using built-in rules. Add an <code>ANTHROPIC_API_KEY</code> to enable full conversations with Claude.</span></div>}
        </aside>
      </div>
    </div>
  );
}
