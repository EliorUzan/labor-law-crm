import { redirect } from "next/navigation";

import { getAuthenticatedUserId } from "@/lib/auth";
import { FirmBrand } from "@/components/firm-brand";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAuthenticatedUserId()) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f1f6,_#fafaf9_42%)] px-5 py-8 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center rounded-2xl border border-stone-200 bg-white p-8 shadow-[0_18px_48px_-30px_rgba(91,29,85,0.45)] sm:p-10">
        <FirmBrand />
        <div className="mt-7 border-t border-[#6d255f]/15 pt-7">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">כניסה למערכת</h1>
        <p className="mt-3 leading-7 text-stone-600">
          הכניסה מיועדת לחשבון שהוגדר מראש במערכת.
        </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
