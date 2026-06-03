"use client";

import { useState } from "react";
import { createInvitation } from "./actions";

export default function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInviteLink("");

    const formData = new FormData();
    formData.append("email", email);
    formData.append("role", role);

    try {
      const { token } = await createInvitation(formData);
      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);
      setEmail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@example.com"
            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#E5003B]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "staff" | "admin")}
            className="border rounded px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#E5003B]"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-[#E5003B] hover:bg-[#C5002E] disabled:opacity-50 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Generating..." : "Generate Invite Link"}
        </button>
      </form>

      {inviteLink && (
        <div className="bg-green-50 border border-green-200 rounded p-4 space-y-2">
          <p className="text-sm font-medium text-green-800">Invite link generated!</p>
          <p className="text-xs text-gray-600">Copy and send this link. It expires in 7 days.</p>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={inviteLink}
              className="border rounded px-2 py-1 text-xs w-full bg-white"
            />
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="text-xs bg-gray-100 hover:bg-gray-200 border rounded px-2 py-1 whitespace-nowrap"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
