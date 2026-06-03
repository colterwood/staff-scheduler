import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";

export default async function StaffLayout({
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
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin/dashboard");

  return (
    <div className="min-h-screen bg-[#FBD9DC]">
      <header className="bg-white border-b border-[#E5003B]/20 px-8 py-4">
        <NavBar />
      </header>
      <main className="px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm p-6">{children}</div>
      </main>
    </div>
  );
}
