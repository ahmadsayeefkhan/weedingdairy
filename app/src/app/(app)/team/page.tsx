import { db } from "@/lib/db";
import { requireWedding } from "@/lib/wedding";
import { fmtShort, initials } from "@/lib/format";
import { PageHead } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/icons";
import { changeRole, inviteMember, removeMember, revokeInvite } from "./actions";

export const metadata = { title: "Family & team" };

const ROLES: Record<string, { label: string; desc: string }> = {
  COUPLE: { label: "The Couple (Admin)", desc: "Full access to budget, guest list and settings." },
  PLANNER: { label: "Planner (Editor)", desc: "Can manage vendors, timeline, guests and checklists. No budget amounts." },
  FAMILY: { label: "Family (Viewer)", desc: "View-only access to the schedule, guests and vendors." },
};

export default async function TeamPage() {
  const { wedding, user } = await requireWedding(["COUPLE"]);
  const members = await db.weddingMember.findMany({ where: { weddingId: wedding.id }, include: { user: true }, orderBy: { createdAt: "asc" } });
  const invites = await db.invite.findMany({ where: { weddingId: wedding.id, acceptedAt: null }, orderBy: { createdAt: "desc" } });
  const activity = await db.auditLog.findMany({ where: { weddingId: wedding.id }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 25 });

  return (
    <div className="stack-lg">
      <PageHead title="Family & team" sub="Plan together, with the right access for everyone" />
      <section className="grid g3">
        {Object.entries(ROLES).map(([k, r]) => (
          <div key={k} className="card"><div className="row" style={{ gap: 8 }}><span className="icon-chip"><Icon name={k === "COUPLE" ? "heart" : k === "PLANNER" ? "edit" : "users"} /></span><b style={{ fontWeight: 500 }}>{r.label}</b></div><p className="small muted mt-s">{r.desc}</p></div>
        ))}
      </section>
      <div className="split">
        <section className="card">
          <div className="card-title"><h2>Members</h2><span className="badge">{members.length}</span></div>
          <div className="list">
            {members.map((m) => (
              <div key={m.id} className="row wrap" style={{ gap: 10 }}>
                <span className="avatar">{initials(m.user.name)}</span>
                <div className="grow"><div>{m.user.name}{m.userId === user.id && <span className="faint"> (you)</span>}</div><div className="tiny muted">{m.user.email}</div></div>
                {m.userId === user.id ? <span className="badge coral">{ROLES[m.role].label}</span> : (
                  <div className="row" style={{ gap: 6 }}>
                    <form action={changeRole} className="row" style={{ gap: 4 }}>
                      <input type="hidden" name="id" value={m.id} />
                      <select className="input" name="role" defaultValue={m.role} style={{ padding: "5px 8px", fontSize: 13 }} aria-label={`Role for ${m.user.name}`}>{Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select>
                      <button className="btn quiet sm">Save</button>
                    </form>
                    <form action={removeMember}><input type="hidden" name="id" value={m.id} /><button className="linkish bad" aria-label={`Remove ${m.user.name}`}><Icon name="trash" width={15} height={15} /></button></form>
                  </div>
                )}
              </div>
            ))}
          </div>
          {invites.length > 0 && (
            <>
              <h3 className="mt" style={{ fontSize: 14 }}>Pending invitations</h3>
              <div className="list">
                {invites.map((i) => (
                  <div key={i.id} className="row wrap small" style={{ gap: 8 }}>
                    <span className="grow">{i.email} · {ROLES[i.role]?.label}</span>
                    <code className="tiny">/join/{i.token.slice(0, 10)}…</code>
                    <a className="linkish" href={`/join/${i.token}`}>Link</a>
                    <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><button className="linkish bad">Revoke</button></form>
                  </div>
                ))}
              </div>
            </>
          )}
          <ActionForm action={inviteMember} className="form-grid mt" reset>
            <label className="field"><span>Email</span><input className="input" type="email" name="email" placeholder="ammu@example.com" required /></label>
            <label className="field"><span>Role</span><select className="input" name="role" defaultValue="FAMILY">{Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></label>
            <div style={{ alignSelf: "end" }}><Submit><Icon name="send" />Invite</Submit></div>
          </ActionForm>
        </section>
        <section className="card">
          <div className="card-title"><h2>Activity</h2><span className="small muted">who changed what</span></div>
          <div className="list">
            {activity.map((a) => (
              <div key={a.id} className="small">
                <div><b style={{ fontWeight: 500 }}>{a.user?.name ?? "A guest"}</b> <span className="muted">{a.action.replace(".", " · ")}</span></div>
                <div className="tiny faint">{a.detail} · {fmtShort(a.createdAt)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
