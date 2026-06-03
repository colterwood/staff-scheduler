import { createClient } from "@/app/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("full_name")
    .eq("user_id", user!.id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Welcome{firstName ? `, ${firstName}` : ""}!
      </h1>
      <p className="text-gray-700">
        Your upcoming shifts and notifications will appear here.
      </p>
    </div>
  );
}

