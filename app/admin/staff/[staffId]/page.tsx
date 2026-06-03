import { createClient } from "@/app/utils/supabase/server";
import { notFound } from "next/navigation";
import { addMonths, startOfMonth } from "date-fns";
import StaffAvailabilityEditor from "./StaffAvailabilityEditor";
import Link from "next/link";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const { staffId } = await params;
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("staff_profiles")
    .select("id, full_name, email, phone, role, priority_rank, is_active")
    .eq("id", staffId)
    .single();

  if (!member) notFound();

  const { data: weeklyAvail } = await supabase
    .from("weekly_availability")
    .select("day_of_week, slots")
    .eq("staff_id", staffId);

  const today = new Date();
  const upcomingMonths = [0, 1, 2].map((i) => {
    const d = addMonths(startOfMonth(today), i);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });

  const { data: submissions } = await supabase
    .from("availability_submissions")
    .select("id, month, year, preferred_shifts_per_week, is_submitted")
    .eq("staff_id", staffId)
    .in("month", upcomingMonths.map((m) => m.month));

  const submissionIds = (submissions ?? []).map((s) => s.id);
  const { data: savedDays } = submissionIds.length
    ? await supabase
        .from("availability_days")
        .select("submission_id, date, slots, is_unavailable")
        .in("submission_id", submissionIds)
    : { data: [] };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/staff" className="text-sm text-[#E5003B] hover:underline">
          &larr; Back to Staff
        </Link>
      </div>

      {/* Staff info */}
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">{member.full_name}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Email</p>
            <p className="font-medium">{member.email}</p>
          </div>
          <div>
            <p className="text-gray-600">Phone</p>
            <p className="font-medium">{member.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-600">Priority</p>
            <p className="font-medium">{member.priority_rank}</p>
          </div>
          <div>
            <p className="text-gray-600">Status</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              member.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}>
              {member.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </section>

      <StaffAvailabilityEditor
        staffProfileId={staffId}
        staffName={member.full_name}
        upcomingMonths={upcomingMonths}
        weeklyAvail={weeklyAvail ?? []}
        submissions={submissions ?? []}
        savedDays={savedDays ?? []}
      />
    </div>
  );
}
