"use server";

import { createClient } from "@/app/utils/supabase/server";
import { revalidatePath } from "next/cache";

type TimeSlot = { from: string; to: string };

type DayEntry = {
  date: string;
  unavailable: boolean;
  slots: TimeSlot[];
};

export async function saveAvailability(
  month: number,
  year: number,
  preferredShiftsPerWeek: number | null,
  days: DayEntry[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("staff_profiles").select("id").eq("user_id", user.id).single();
  if (!profile) return { error: "Profile not found." };

  const { data: submission, error: subError } = await supabase
    .from("availability_submissions")
    .upsert(
      { staff_id: profile.id, month, year, preferred_shifts_per_week: preferredShiftsPerWeek, is_submitted: false },
      { onConflict: "staff_id,month,year" }
    )
    .select("id")
    .single();

  if (subError) return { error: subError.message };

  await supabase.from("availability_days").delete().eq("submission_id", submission.id);

  if (days.length > 0) {
    const { error: daysError } = await supabase.from("availability_days").insert(
      days.map((d) => ({
        submission_id: submission.id,
        date: d.date,
        slots: d.unavailable ? [] : d.slots.filter((s) => s.from && s.to),
        is_unavailable: d.unavailable,
      }))
    );
    if (daysError) return { error: daysError.message };
  }

  revalidatePath("/availability");
  return { success: true };
}

export async function submitAvailability(month: number, year: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("staff_profiles").select("id").eq("user_id", user.id).single();
  if (!profile) return { error: "Profile not found." };

  const { error } = await supabase
    .from("availability_submissions")
    .update({ is_submitted: true, submitted_at: new Date().toISOString() })
    .eq("staff_id", profile.id).eq("month", month).eq("year", year);

  if (error) return { error: error.message };
  revalidatePath("/availability");
  return { success: true };
}
