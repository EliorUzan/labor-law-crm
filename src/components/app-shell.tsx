"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { logout } from "@/app/login/actions";
import { FirmBrand } from "@/components/firm-brand";

const navigationItems = [
  { href: "/", label: "לוח בקרה" },
  { href: "/clients", label: "לקוחות" },
  { href: "/accounting", label: "הנהלת חשבונות" },
  { href: "/settings", label: "הגדרות" },
];

function Navigation({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="ניווט ראשי" className={compact ? "overflow-x-auto" : "mt-8"}>
      <ul className={compact ? "flex min-w-max gap-1" : "space-y-1"}>
        {navigationItems.map((item) => {
          const isCurrent = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

          return (
            <li key={item.href}>
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isCurrent
                    ? "bg-teal-700 text-white"
                    : "text-stone-700 hover:bg-stone-100 hover:text-stone-950"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function LogoutButton() {
  return (
    <form action={logout}>
      <button
        className="w-full rounded-lg px-3 py-2 text-right text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-950"
        type="submit"
      >
        התנתקות
      </button>
    </form>
  );
}

function GlobalSearch({ compact = false }: { compact?: boolean }) {
  return <form action="/search" className={compact ? "w-full" : "mt-6"} role="search">
    <label className="sr-only" htmlFor={compact ? "mobile-global-search" : "global-search"}>חיפוש במערכת</label>
    <input
      className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
      dir="auto"
      id={compact ? "mobile-global-search" : "global-search"}
      maxLength={200}
      name="q"
      placeholder="חיפוש…"
      type="search"
    />
  </form>;
}

function QuickAddLink() {
  return <Link className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-700 px-3 text-sm font-medium text-white transition hover:bg-teal-800" href="/quick-add">+ חדש</Link>;
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-stone-50 lg:flex lg:flex-row-reverse">
      <aside className="hidden w-64 shrink-0 flex-col border-l border-stone-200 bg-white p-5 lg:flex">
        <div>
          <FirmBrand />
          <GlobalSearch />
          <div className="mt-3"><QuickAddLink /></div>
        </div>
        <Navigation />
        <div className="mt-auto border-t border-stone-200 pt-4">
          <LogoutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-stone-200 bg-white lg:hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <FirmBrand compact />
            <div className="flex items-center gap-2"><QuickAddLink /><div className="w-24"><LogoutButton /></div></div>
          </div>
          <div className="px-3 pb-3"><GlobalSearch compact /></div>
          <div className="border-t border-stone-100 px-3 pb-2">
            <Navigation compact />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
