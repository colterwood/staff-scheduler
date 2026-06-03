import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import AdminNavBar from "@/components/AdminNavBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, full_name")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#FBD9DC]">
      <header className="bg-white border-b border-[#E5003B]/20 px-8 py-4">
        <div className="flex items-center justify-between">
          <AdminNavBar />
          <span className="text-sm text-gray-700">{profile.full_name}</span>
        </div>
      </header>
      <main className="px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6">{children}</div>
      </main>
    </div>
  );
}

