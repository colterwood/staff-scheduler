import { createClient } from "@/app/utils/supabase/server";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { count: staffCount }, { count: pendingTimeOff }] =
    await Promise.all([
      supabase
        .from("staff_profiles")
        .select("full_name")
        .eq("user_id", user!.id)
        .single(),
      supabase
        .from("staff_profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "staff")
        .eq("is_active", true),
      supabase
        .from("time_off_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {firstName ? `Hi, ${firstName}` : "Manager Dashboard"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-2">
          <p className="text-sm text-gray-700">Active Staff</p>
          <p className="text-3xl font-bold">{staffCount ?? "â€”"}</p>
          <Link
            href="/admin/staff"
            className="text-sm text-blue-600 hover:underline"
          >
            Manage staff â†’
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-2">
          <p className="text-sm text-gray-700">Pending Time Off</p>
          <p className="text-3xl font-bold">{pendingTimeOff ?? "â€”"}</p>
          <Link
            href="/admin/time-off"
            className="text-sm text-blue-600 hover:underline"
          >
            Review requests â†’
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-2">
          <p className="text-sm text-gray-700">Next Schedule</p>
          <p className="text-3xl font-bold">â€”</p>
          <Link
            href="/admin/schedule"
            className="text-sm text-blue-600 hover:underline"
          >
            Build schedule â†’
          </Link>
        </div>
      </div>
    </div>
  );
}

