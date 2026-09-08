"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { logout } from "@/app/login/actions";

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

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-stone-50 lg:flex lg:flex-row-reverse">
      <aside className="hidden w-64 shrink-0 flex-col border-l border-stone-200 bg-white p-5 lg:flex">
        <div>
          <p className="text-sm font-semibold text-teal-700">ניהול משרד</p>
          <p className="mt-1 text-sm text-stone-500">דיני עבודה</p>
        </div>
        <Navigation />
        <div className="mt-auto border-t border-stone-200 pt-4">
          <LogoutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-stone-200 bg-white lg:hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-teal-700">ניהול משרד</p>
              <p className="text-xs text-stone-500">דיני עבודה</p>
            </div>
            <div className="w-24">
              <LogoutButton />
            </div>
          </div>
          <div className="border-t border-stone-100 px-3 pb-2">
            <Navigation compact />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
