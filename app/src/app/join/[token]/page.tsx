import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { Logo } from "@/components/icons";
import { acceptInvite } from "./actions";

export const metadata = { title: "Join the wedding team" };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await db.invite.findUnique({ where: { token }, include: { wedding: true } });
  const user = await currentUser();
  let message: string | null = null;
  if (!inv) message = "This invitation link isn't valid. Ask the couple to send a new one.";
  else if (inv.acceptedAt) message = "This invitation was already used.";
  else if (user && user.email !== inv.email) message = `This invitation is for ${inv.email}. You're signed in as ${user.email}.`;
  else if (user && user.role !== "USER") message = "Vendor and admin accounts can't join a wedding team.";
  else if (user && (await db.weddingMember.findFirst({ where: { userId: user.id } }))) message = "Your account already belongs to a wedding. V1 supports one wedding per account.";

  return (
    <main className="center-page"><div className="ambient" />
      <div className="auth-card card stack-lg" style={{ padding: 28, textAlign: "center", justifyItems: "center" }}>
        <Logo size={40} />
        {message || !inv ? (
          <><p>{message}</p><Link className="btn quiet" href="/">Go to Wedding Diary</Link></>
        ) : (
          <>
            <h1 style={{ fontSize: 22 }}>Join {inv.wedding.brideName} &amp; {inv.wedding.groomName}&apos;s wedding</h1>
            <p className="muted small">You&apos;ve been invited as <b>{inv.role.toLowerCase()}</b>.</p>
            {user ? (
              <form action={acceptInvite} style={{ width: "100%" }}><input type="hidden" name="token" value={token} /><button className="btn block">Accept invitation</button></form>
            ) : (
              <div className="stack" style={{ width: "100%" }}>
                <Link className="btn block" href={`/signup?invite=${token}&email=${encodeURIComponent(inv.email)}`}>Create account with {inv.email}</Link>
                <Link className="btn quiet block" href={`/login?next=/join/${token}`}>I already have an account</Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
