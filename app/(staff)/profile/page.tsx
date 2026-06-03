import { createClient } from "@/app/utils/supabase/server";
import ProfileForm from "./ProfileForm";

function toNotificationPref(notifyEmail: boolean, notifySms: boolean) {
  if (notifyEmail && notifySms) return "both" as const;
  if (notifySms) return "text" as const;
  if (notifyEmail) return "email" as const;
  return "none" as const;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("id, full_name, email, phone, notify_email, notify_sms")
    .eq("user_id", user!.id)
    .single();

  const { data: weeklyAvailability } = profile
    ? await supabase
        .from("weekly_availability")
        .select("day_of_week, slots")
        .eq("staff_id", profile.id)
    : { data: [] };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Your Profile</h1>
      <ProfileForm
        fullName={profile?.full_name ?? ""}
        email={profile?.email ?? user!.email ?? ""}
        phone={profile?.phone ?? null}
        notificationPref={toNotificationPref(
          profile?.notify_email ?? true,
          profile?.notify_sms ?? false
        )}
        weeklyAvailability={weeklyAvailability ?? []}
      />
    </div>
  );
}
