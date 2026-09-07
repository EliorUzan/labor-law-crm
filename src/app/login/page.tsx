import { redirect } from "next/navigation";

import { getAuthenticatedUserId } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAuthenticatedUserId()) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-8 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center rounded-2xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-medium text-teal-700">ניהול משרד</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900">כניסה למערכת</h1>
        <p className="mt-3 leading-7 text-stone-600">
          הכניסה מיועדת לחשבון שהוגדר מראש במערכת.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
