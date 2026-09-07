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
    return { error: "ההתחברות נכשלה. בדקו את כתובת האימייל והסיסמה." };
  }

  redirect("/");
}

export async function logout(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
