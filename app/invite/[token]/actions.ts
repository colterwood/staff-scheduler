"use server";

import { createAdminClient } from "@/app/utils/supabase/admin";
import { createClient } from "@/app/utils/supabase/server";

export async function getInvitation(token: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("invitations")
    .select("id, email, role, accepted_at, expires_at")
    .eq("token", token)
    .single();

  if (error || !data) return { error: "Invalid invitation link." };
  if (data.accepted_at) return { error: "This invitation has already been used." };
  if (new Date(data.expires_at) < new Date()) return { error: "This invitation has expired." };

  return { invitation: data };
}

export async function acceptInvitation(formData: FormData) {
  const token = formData.get("token") as string;
  const fullName = formData.get("fullName") as string;
  const password = formData.get("password") as string;

  if (!token || !fullName || !password) {
    return { error: "All fields are required." };
  }

  const adminClient = createAdminClient();

  // Re-validate the token
  const { data: invitation, error: inviteError } = await adminClient
    .from("invitations")
    .select("id, email, role")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (inviteError || !invitation) {
    return { error: "Invalid or expired invitation." };
  }

  // Create the Supabase auth user
  const supabase = await createClient();
  const { error: signUpError } = await supabase.auth.signUp({
    email: invitation.email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: invitation.role,
      },
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // Mark invitation as accepted
  await adminClient
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  return { success: true };
}
