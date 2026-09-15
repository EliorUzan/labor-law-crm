"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type LoginState = {
  error?: string;
};

/** Signs in an account already provisioned in Supabase; registration is intentionally absent. */
export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const credentials = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!credentials.success) {
    return { error: "יש להזין כתובת אימייל וסיסמה תקינים." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(credentials.data);

  if (error) {
    // Keep the browser message generic, but retain the provider's non-secret
    // status/code for diagnosing account configuration and auth outages.
    console.error(
      "[auth] sign-in failed",
      `name=${error.name}`,
      `code=${error.code ?? "none"}`,
      `status=${error.status ?? "none"}`,
      `message=${error.message}`,
    );
    if (error.code === "email_not_confirmed") {
      return { error: "יש לאשר את כתובת האימייל של המשתמש ב-Supabase לפני ההתחברות." };
    }
    if (error.code === "user_banned") {
      return { error: "המשתמש חסום ב-Supabase. יש להסיר את החסימה לפני ההתחברות." };
    }
    if (error.status === 429) {
      return { error: "בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." };
    }
    return { error: "ההתחברות נכשלה. בדקו את כתובת האימייל והסיסמה." };
  }

  redirect("/");
}

export async function logout(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
