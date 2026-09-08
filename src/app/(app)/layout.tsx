import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireAuthenticatedUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireAuthenticatedUserId();

  return <AppShell>{children}</AppShell>;
}
