import { getInvitation } from "./actions";
import AcceptForm from "./AcceptForm";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getInvitation(token);

  if ("error" in result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBD9DC]">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-sm w-full text-center space-y-4">
          <h1 className="text-xl font-semibold text-red-600">Invalid Invitation</h1>
          <p className="text-gray-600">{result.error}</p>
          <a href="/login" className="text-[#E5003B] hover:underline text-sm">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  const { invitation } = result;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-sm w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">You&apos;re invited!</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Set up your account to join the team.
          </p>
        </div>

        <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{invitation.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="font-medium capitalize">{invitation.role}</span>
          </div>
        </div>

        <AcceptForm token={token} email={invitation.email} />
      </div>
    </div>
  );
}
