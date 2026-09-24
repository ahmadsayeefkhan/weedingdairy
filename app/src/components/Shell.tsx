"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, Logo, type IconName } from "./icons";
import { logout } from "@/app/(auth)/actions";

export type NavItem = { href: string; label: string; icon: IconName; group?: string; badge?: number };

function isActive(path: string, href: string) {
  if (href === "/vendor" || href === "/admin") return path === href;
  return path === href || (href !== "/" && path.startsWith(href + "/"));
}

export function Shell({ items, tabs, children, who, footer, brandSub = "BANGLADESH" }: { items: NavItem[]; tabs: NavItem[]; children: ReactNode; who: ReactNode; footer: ReactNode; brandSub?: string }) {
  const path = usePathname();
  return (
    <div className="shell">
      <div className="ambient" />
      <aside className="side" aria-label="Main navigation">
        <Link href={items[0]?.href ?? "/"} className="brand">
          <Logo size={34} />
          <div><div className="brand-name">Wedding Diary</div><div className="brand-sub">{brandSub}</div></div>
        </Link>
        <nav className="nav">
          {items.map((it, i) => {
            const header = it.group && it.group !== items[i - 1]?.group ? <div className="nav-group" key={`g-${it.group}`}>{it.group}</div> : null;
            return (
              <div key={it.href}>
                {header}
                <Link href={it.href} aria-current={isActive(path, it.href) ? "page" : undefined}>
                  <Icon name={it.icon} />
                  <span className="grow">{it.label}</span>
                  {!!it.badge && <span className="badge accent" style={{ padding: "1px 7px" }}>{it.badge}</span>}
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="side-foot">{who}{footer}</div>
      </aside>
      <header className="topbar">
        <Link href={items[0]?.href ?? "/"} className="row" style={{ gap: 8 }}><Logo size={28} /><span className="brand-name" style={{ fontSize: 17 }}>Wedding Diary</span></Link>
        <div className="topbar-actions">
          <Link href={items.find((i) => i.icon === "bell")?.href ?? "/more"} aria-label="Notifications" className="row" style={{ position: "relative" }}>
            <Icon name="bell" width={22} height={22} />
            {!!items.find((i) => i.icon === "bell")?.badge && <span style={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, background: "var(--accent)", borderRadius: 9 }} />}
          </Link>
          <form action={logout}>
            <button className="icon-btn" aria-label="Sign out" title="Sign out"><Icon name="logout" width={22} height={22} /></button>
          </form>
        </div>
      </header>
      <main className="main" id="main">{children}</main>
      <nav className="tabbar" aria-label="Quick navigation">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={isActive(path, t.href) ? "page" : undefined}>
            <Icon name={t.icon} />{t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
