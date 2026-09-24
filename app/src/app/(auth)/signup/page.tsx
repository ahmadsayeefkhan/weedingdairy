import Link from "next/link";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Logo } from "@/components/icons";
import { CITIES, VENDOR_CATEGORIES } from "@/lib/constants";
import { signup } from "../actions";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ kind?: string; invite?: string; email?: string }> }) {
  const sp = await searchParams;
  const vendor = sp.kind === "vendor";
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
          <div className="tabs" role="tablist">
            <Link href="/signup" aria-current={!vendor ? "true" : undefined}>I&apos;m getting married</Link>
            <Link href="/signup?kind=vendor" aria-current={vendor ? "true" : undefined}>I&apos;m a vendor</Link>
          </div>
          <div>
            <h1 style={{ fontSize: 24 }}>{vendor ? "List your business" : sp.invite ? "Join the wedding team" : "Start your wedding diary"}</h1>
            <p className="muted" style={{ fontStyle: "italic", fontWeight: 300 }}>
              {vendor ? "Reach couples planning across Bangladesh. We review every listing before it goes live." : "Plan every Holud, Mehendi and Reception in one place."}
            </p>
          </div>
          <ActionForm action={signup} className="stack">
            <input type="hidden" name="kind" value={vendor ? "vendor" : "couple"} />
            <input type="hidden" name="invite" value={sp.invite ?? ""} />
            <label className="field"><span>Your name</span><input className="input" name="name" autoComplete="name" required /></label>
            <label className="field"><span>Email</span><input className="input" name="email" type="email" defaultValue={sp.email ?? ""} autoComplete="email" required /></label>
            <label className="field"><span>Password</span><input className="input" name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
            {vendor && (
              <>
                <label className="field"><span>Business name</span><input className="input" name="business" required /></label>
                <div className="form-grid">
                  <label className="field"><span>Category</span>
                    <select className="input" name="category" required>
                      {Object.entries(VENDOR_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>City</span>
                    <select className="input" name="city">{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
                  </label>
                </div>
              </>
            )}
            <Submit className="btn block" pendingText="Creating account…">{vendor ? "Submit for review" : "Create account"}</Submit>
          </ActionForm>
          <p className="small muted" style={{ textAlign: "center" }}>Already have an account? <Link className="linkish" href={sp.invite ? `/login?next=/join/${sp.invite}` : "/login"}>Sign in</Link></p>
        </div>
      </div>
    </main>
  );
}
