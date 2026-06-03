import { createClient } from "@/app/utils/supabase/server";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { addMonths, startOfMonth } from "date-fns";

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("staff_profiles").select("id").eq("user_id", user!.id).single();

  const { data: weeklyAvail } = profile
    ? await supabase
        .from("weekly_availability")
        .select("day_of_week, slots")
        .eq("staff_id", profile.id)
    : { data: [] };

  const today = new Date();
  const upcomingMonths = [0, 1, 2].map((i) => {
    const d = addMonths(startOfMonth(today), i);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });

  const { data: submissions } = profile
    ? await supabase
        .from("availability_submissions")
        .select("id, month, year, preferred_shifts_per_week, is_submitted")
        .eq("staff_id", profile.id)
        .in("month", upcomingMonths.map((m) => m.month))
    : { data: [] };

  const submissionIds = (submissions ?? []).map((s) => s.id);
  const { data: savedDays } = submissionIds.length
    ? await supabase
        .from("availability_days")
        .select("submission_id, date, slots, is_unavailable")
        .in("submission_id", submissionIds)
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Monthly Availability</h1>
        <p className="text-sm text-gray-600 mt-1">
          Select a month, apply your weekly pattern, then adjust individual days as needed.
        </p>
      </div>
      <AvailabilityCalendar
        upcomingMonths={upcomingMonths}
        weeklyAvail={weeklyAvail ?? []}
        submissions={submissions ?? []}
        savedDays={savedDays ?? []}
      />
    </div>
  );
}
