"use client";

import { useState } from "react";
import { saveProfile } from "./actions";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type NotificationPref = "email" | "text" | "both" | "none";

type DayState = {
  available: boolean;
  from: string;
  to: string;
};

type WeeklyAvailRow = {
  day_of_week: number;
  available_from: string;
  available_to: string;
};

interface Props {
  fullName: string;
  email: string;
  phone: string | null;
  notificationPref: NotificationPref;
  weeklyAvailability: WeeklyAvailRow[];
}

function buildInitialWeekly(rows: WeeklyAvailRow[]): Record<number, DayState> {
  const initial: Record<number, DayState> = {};
  for (let i = 0; i <= 6; i++) {
    initial[i] = { available: false, from: "09:00", to: "17:00" };
  }
  rows.forEach((r) => {
    initial[r.day_of_week] = {
      available: true,
      from: r.available_from.slice(0, 5),
      to: r.available_to.slice(0, 5),
    };
  });
  return initial;
}

export default function ProfileForm({
  fullName,
  email,
  phone: initialPhone,
  notificationPref: initialNotif,
  weeklyAvailability,
}: Props) {
  const [emailVal, setEmailVal] = useState(email);
  const [phoneVal, setPhoneVal] = useState(initialPhone ?? "");
  const [notification, setNotification] = useState<NotificationPref>(initialNotif);
  const [weekly, setWeekly] = useState<Record<number, DayState>>(
    () => buildInitialWeekly(weeklyAvailability)
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return raw;
  };

  const toggleDay = (i: number) =>
    setWeekly((prev) => ({
      ...prev,
      [i]: { ...prev[i], available: !prev[i].available },
    }));

  const updateTime = (i: number, field: "from" | "to", value: string) =>
    setWeekly((prev) => ({
      ...prev,
      [i]: { ...prev[i], [field]: value },
    }));

  async function handleSave() {
    setSaving(true);
    setStatus("idle");

    const result = await saveProfile({
      email: emailVal,
      phone: phoneVal,
      notification,
      weeklyAvailability: Object.entries(weekly).map(([day, state]) => ({
        dayOfWeek: Number(day),
        available: state.available,
        from: state.from,
        to: state.to,
      })),
    });

    setSaving(false);
    if (result?.error) {
      setStatus("error");
      setErrorMsg(result.error);
    } else {
      setStatus("success");
    }
  }

  return (
    <div className="space-y-10 max-w-2xl">

      {/* Contact info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-gray-200 pb-2">Contact Info</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <div className="px-3 py-2 text-gray-800">{fullName}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
              className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#E5003B]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={phoneVal}
              placeholder="(555) 555-5555"
              onChange={(e) => setPhoneVal(e.target.value.replace(/\D/g, ""))}
              onBlur={() => setPhoneVal(formatPhone(phoneVal))}
              className="border rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#E5003B]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notifications</label>
            <select
              value={notification}
              onChange={(e) => setNotification(e.target.value as NotificationPref)}
              className="border rounded px-3 py-2 w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#E5003B]"
            >
              <option value="email">Email</option>
              <option value="text">Text</option>
              <option value="both">Email and Text</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      </section>

      {/* Weekly availability */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold border-b border-gray-200 pb-2">
            Typical Weekly Availability
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Set the days and times you&apos;re generally available each week. You can
            adjust individual days when submitting monthly availability.
          </p>
        </div>

        <div className="space-y-3">
          {DAY_NAMES.map((name, i) => (
            <div key={i} className="flex items-center gap-4 flex-wrap">
              {/* Day toggle */}
              <label className="flex items-center gap-2 w-32 cursor-pointer">
                <input
                  type="checkbox"
                  checked={weekly[i].available}
                  onChange={() => toggleDay(i)}
                  className="accent-[#E5003B] w-4 h-4"
                />
                <span className="font-medium text-sm">{name}</span>
              </label>

              {/* Time pickers — only shown when day is checked */}
              {weekly[i].available ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">From</span>
                  <input
                    type="time"
                    value={weekly[i].from}
                    onChange={(e) => updateTime(i, "from", e.target.value)}
                    className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#E5003B]"
                  />
                  <span className="text-gray-600">To</span>
                  <input
                    type="time"
                    value={weekly[i].to}
                    onChange={(e) => updateTime(i, "to", e.target.value)}
                    className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#E5003B]"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Not available</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-[#E5003B] hover:bg-[#C5002E] disabled:opacity-50 text-white rounded-lg font-medium"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>

        {status === "success" && (
          <span className="text-green-700 text-sm font-medium">Saved successfully.</span>
        )}
        {status === "error" && (
          <span className="text-red-600 text-sm">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}
