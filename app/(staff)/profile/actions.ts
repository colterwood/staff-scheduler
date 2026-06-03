"use server";

import { createClient } from "@/app/utils/supabase/server";
import { revalidatePath } from "next/cache";

type DayAvailability = {
  dayOfWeek: number;
  available: boolean;
  from: string;
  to: string;
};

export async function saveProfile(data: {
  email: string;
  phone: string;
  notification: string;
  weeklyAvailability: DayAvailability[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const notify_email = data.notification === "email" || data.notification === "both";
  const notify_sms = data.notification === "text" || data.notification === "both";

  // Update contact info
  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .update({
      email: data.email,
      phone: data.phone || null,
      notify_email,
      notify_sms,
    })
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (profileError) return { error: profileError.message };

  // Replace weekly availability
  await supabase
    .from("weekly_availability")
    .delete()
    .eq("staff_id", profile.id);

  const availableDays = data.weeklyAvailability.filter((d) => d.available);
  if (availableDays.length > 0) {
    const { error: availError } = await supabase
      .from("weekly_availability")
      .insert(
        availableDays.map((d) => ({
          staff_id: profile.id,
          day_of_week: d.dayOfWeek,
          available_from: d.from,
          available_to: d.to,
        }))
      );
    if (availError) return { error: availError.message };
  }

  revalidatePath("/profile");
  return { success: true };
}
