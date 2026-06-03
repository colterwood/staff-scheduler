"use client";

import { useState } from "react";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ProfilePage() {
  const fullName = "Colter Wood";
  const [email, setEmail] = useState("colter@example.com");
  const [phone, setPhone] = useState("123-456-7890");
  const [notification, setNotification] = useState("email");
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

  return (
    <div className="space-y-10 max-w-3xl">
      <h1 className="text-2xl font-semibold">Your Profile</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <label className="text-lg font-semibold w-32">Name</label>
          <div className="text-gray-800">{fullName}</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <label className="text-lg font-semibold w-32">Email</label>
          <input
            type="email"
            className="px-4 py-2 border rounded w-[260px]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <label className="text-lg font-semibold w-32">Phone</label>
          <input
            type="text"
            className="px-4 py-2 border rounded w-[160px]"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            onBlur={() => {
              if (phone.length === 10)
                setPhone(`(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`);
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
          <label className="text-lg font-semibold w-32">Notifications</label>
          <select
            value={notification}
            onChange={(e) => setNotification(e.target.value)}
            className="px-4 py-2 border rounded w-[180px] bg-white"
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
