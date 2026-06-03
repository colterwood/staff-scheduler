"use server";

import { createClient } from "@/app/utils/supabase/server";
import { revalidatePath } from "next/cache";

type TimeSlot = { from: string; to: string };

type DayAvailability = {
  dayOfWeek: number;
  available: boolean;
  slots: TimeSlot[];
};

export async function adminSaveWeeklyAvailability(staffProfileId: string, days: DayAvailability[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  await supabase.from("weekly_availability").delete().eq("staff_id", staffProfileId);

  const availableDays = days.filter((d) => d.available && d.slots.length > 0);
  if (availableDays.length > 0) {
    const { error } = await supabase.from("weekly_availability").insert(
      availableDays.map((d) => ({
        staff_id: staffProfileId,
        day_of_week: d.dayOfWeek,
        slots: d.slots.filter((s) => s.from && s.to),
      }))
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/staff/${staffProfileId}`);
  return { success: true };
}

type DayEntry = { date: string; unavailable: boolean; slots: TimeSlot[] };

export async function adminSaveAvailability(
  staffProfileId: string,
  month: number,
  year: number,
  preferredShiftsPerWeek: number | null,
  days: DayEntry[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: submission, error: subError } = await supabase
    .from("availability_submissions")
    .upsert(
      { staff_id: staffProfileId, month, year, preferred_shifts_per_week: preferredShiftsPerWeek, is_submitted: false },
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

  revalidatePath(`/admin/staff/${staffProfileId}`);
  return { success: true };
}
