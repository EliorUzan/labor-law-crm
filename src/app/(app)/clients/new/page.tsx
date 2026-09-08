import Link from "next/link";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { ClientForm } from "@/modules/clients/forms";
import { panelClass } from "@/modules/clients/presentation";

export default async function NewClientPage() {
  await requireAuthenticatedUserId();
  return <div className="mx-auto max-w-2xl space-y-4">
    <Link className="text-sm text-teal-700 underline" href="/clients">לקוחות</Link>
    <h1 className="text-2xl font-bold">לקוח חדש</h1>
    <div className={panelClass}><ClientForm /></div>
  </div>;
}
