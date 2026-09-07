"use client";

import { useActionState } from "react";

import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5" noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-800" htmlFor="email">
          כתובת אימייל
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-left text-stone-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          dir="ltr"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-800" htmlFor="password">
          סיסמה
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-left text-stone-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          dir="ltr"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {state.error ? (
        <p aria-live="polite" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <button
        className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "מתחבר…" : "כניסה"}
      </button>
    </form>
  );
}
