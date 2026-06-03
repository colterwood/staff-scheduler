import { createClient } from "@/app/utils/supabase/server";
import { createAdminClient } from "@/app/utils/supabase/admin";
import InviteForm from "./InviteForm";

export default async function AdminStaffPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [{ data: staff }, { data: invitations }] = await Promise.all([
    supabase
      .from("staff_profiles")
      .select("id, full_name, email, role, priority_rank, is_active")
      .eq("role", "staff")
      .order("priority_rank"),
    adminClient
      .from("invitations")
      .select("id, email, role, accepted_at, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const pendingInvites = invitations?.filter(
    (i) => !i.accepted_at && new Date(i.expires_at) > new Date()
  );

  return (
    <div className="space-y-10 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Staff</h1>
      </div>

      {/* Active staff */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Active Staff</h2>
        {!staff?.length ? (
          <p className="text-gray-500 text-sm">No staff members yet. Invite someone below.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{member.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{member.email}</td>
                    <td className="px-4 py-3 text-gray-600">{member.priority_rank}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          member.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pending invitations */}
      {!!pendingInvites?.length && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Pending Invitations</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingInvites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{invite.email}</td>
                    <td className="px-4 py-3 capitalize">{invite.role}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Invite form */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Invite New Staff</h2>
        <InviteForm />
      </section>
    </div>
  );
}
