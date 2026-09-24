import Link from "next/link";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Logo } from "@/components/icons";
import { login } from "../actions";

export const metadata = { title: "Sign in" };

const DEMO = [
  ["couple@weddingdiary.test", "Couple (Ayesha)"],
  ["planner@weddingdiary.test", "Planner"],
  ["family@weddingdiary.test", "Family viewer"],
  ["live@weddingdiary.test", "Couple, reception today"],
  ["vendor@weddingdiary.test", "Vendor (Dream Lens)"],
  ["admin@weddingdiary.test", "Platform admin"],
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="center-page">
      <div className="ambient" />
      <div className="auth-card stack-lg">
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          <Logo size={44} />
          <div>
            <div className="brand-name" style={{ fontSize: 24 }}>Wedding Diary</div>
            <div className="brand-sub">BANGLADESH</div>
          </div>
        </div>
        <div className="card stack-lg" style={{ padding: 26 }}>
          <div>
            <h1 style={{ fontSize: 24 }}>Welcome back</h1>
            <p className="muted">Sign in to continue planning your big day.</p>
          </div>
          <ActionForm action={login} className="stack">
            <input type="hidden" name="next" value={next ?? ""} />
            <label className="field"><span>Email</span><input className="input" name="email" type="email" autoComplete="email" required /></label>
            <label className="field"><span>Password</span><input className="input" name="password" type="password" autoComplete="current-password" required /></label>
            <Submit className="btn block" pendingText="Signing in…">Sign in</Submit>
          </ActionForm>
          <p className="small muted" style={{ textAlign: "center" }}>
            New here? <Link className="linkish" href="/signup">Create an account</Link> · <Link className="linkish" href="/signup?kind=vendor">Join as a vendor</Link>
          </p>
        </div>
        <details className="card flat drawer small">
          <summary className="row between"><span>Demo logins</span><span className="faint">password Diary@2026</span></summary>
          <ul className="list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {DEMO.map(([e, r]) => (
              <li key={e} className="row between"><code style={{ fontSize: 12.5 }}>{e}</code><span className="faint tiny">{r}</span></li>
            ))}
          </ul>
        </details>
      </div>
    </main>
  );
}
