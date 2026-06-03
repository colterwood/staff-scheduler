"use client";

import { useState } from "react";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type NotificationPref = "email" | "text" | "both" | "none";

interface Props {
  fullName: string;
  email: string;
  phone: string | null;
  notificationPref: NotificationPref;
}

export default function ProfileForm({ fullName, email, phone: initialPhone, notificationPref: initialNotif }: Props) {
  const [emailVal, setEmailVal] = useState(email);
  const [phoneVal, setPhoneVal] = useState(initialPhone ?? "");
  const [notification, setNotification] = useState<NotificationPref>(initialNotif);
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [preferredShifts, setPreferredShifts] = useState<string[]>([]);

  const toggleDay = (day: string) =>
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  const toggleShift = (label: string) =>
    setPreferredShifts((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return raw;
  };

  return (
    <div className="space-y-10 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <label className="text-lg font-semibold w-32">Name</label>
          <div className="text-gray-800">{fullName}</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <label className="text-lg font-semibold w-32">Email</label>
          <input
            type="email"
            className="px-4 py-2 border rounded w-[260px] focus:outline-none focus:ring-2 focus:ring-[#E5003B]"
            value={emailVal}
            onChange={(e) => setEmailVal(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <label className="text-lg font-semibold w-32">Phone</label>
          <input
            type="text"
            className="px-4 py-2 border rounded w-[200px] focus:outline-none focus:ring-2 focus:ring-[#E5003B]"
            value={phoneVal}
            placeholder="(555) 555-5555"
            onChange={(e) => setPhoneVal(e.target.value.replace(/\D/g, ""))}
            onBlur={() => setPhoneVal(formatPhone(phoneVal))}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <label className="text-lg font-semibold w-32">Notifications</label>
          <select
            value={notification}
            onChange={(e) => setNotification(e.target.value as NotificationPref)}
            className="px-4 py-2 border rounded w-[180px] bg-white focus:outline-none focus:ring-2 focus:ring-[#E5003B]"
          >
            <option value="email">Email</option>
            <option value="text">Text</option>
            <option value="both">Email and Text</option>
            <option value="none">None</option>
          </select>
        </div>

      </div>

      <div>
        <label className="text-lg font-semibold mb-2 block">Preferred Days</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {days.map((day) => (
            <label key={day} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferredDays.includes(day)}
                onChange={() => toggleDay(day)}
              />
              {day}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-lg font-semibold mb-2 block">Preferred Shifts</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["Open", "Mid", "Close"] as const).map((type) => (
            <div key={type} className="space-y-2">
              {days.map((day) => {
                const label = `${day} ${type}`;
                return (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferredShifts.includes(label)}
                      onChange={() => toggleShift(label)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => alert("Profile saving — coming soon.")}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
      >
        Save Profile
      </button>
    </div>
  );
}
