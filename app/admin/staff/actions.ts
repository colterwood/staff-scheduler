"use server";

import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createInvitation(formData: FormData) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as "staff" | "admin";

  if (!email || !role) throw new Error("Email and role are required.");

  // Verify caller is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "admin") throw new Error("Unauthorized");

  // Check for an existing pending invite for this email
  const adminClient = createAdminClient();
  const { data: existing } = await adminClient
    .from("invitations")
    .select("id, accepted_at, expires_at")
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (existing) {
    throw new Error(`An active invitation already exists for ${email}.`);
  }

  const { data, error } = await adminClient
    .from("invitations")
    .insert({ email, role, invited_by: profile.id })
    .select("token")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/staff");
  return { token: data.token };
}

export async function revokeInvitation(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "admin") throw new Error("Unauthorized");

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("invitations")
    .delete()
    .eq("id", id)
    .is("accepted_at", null);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/staff");
}
