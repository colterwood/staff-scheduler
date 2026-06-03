"use client";

import { useState } from "react";
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { adminSaveWeeklyAvailability, adminSaveAvailability } from "./actions";

type TimeSlot = { from: string; to: string };
type DayState = { unavailable: boolean; slots: TimeSlot[] };
type WeeklyDayState = { available: boolean; slots: TimeSlot[] };

type WeeklyAvailRow = { day_of_week: number; slots: TimeSlot[] };
type Submission = { id: string; month: number; year: number; preferred_shifts_per_week: number | null; is_submitted: boolean };
type SavedDay = { submission_id: string; date: string; slots: TimeSlot[] | null; is_unavailable: boolean };

interface Props {
  staffProfileId: string;
  staffName: string;
  upcomingMonths: { month: number; year: number }[];
  weeklyAvail: WeeklyAvailRow[];
  submissions: Submission[];
  savedDays: SavedDay[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_SLOT: TimeSlot = { from: "09:00", to: "17:00" };

function buildWeekly(rows: WeeklyAvailRow[]): Record<number, WeeklyDayState> {
  const initial: Record<number, WeeklyDayState> = {};
  for (let i = 0; i <= 6; i++) initial[i] = { available: false, slots: [{ ...DEFAULT_SLOT }] };
  rows.forEach((r) => { initial[r.day_of_week] = { available: true, slots: r.slots?.length ? r.slots : [{ ...DEFAULT_SLOT }] }; });
  return initial;
}

function buildMonthly(month: number, year: number, weeklyAvail: WeeklyAvailRow[], submissions: Submission[], savedDays: SavedDay[]): Record<string, DayState> {
  const weeklyMap: Record<number, TimeSlot[]> = {};
  weeklyAvail.forEach((r) => { weeklyMap[r.day_of_week] = r.slots ?? []; });

  const result: Record<string, DayState> = {};
  const total = getDaysInMonth(new Date(year, month - 1));
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month - 1, d);
    const key = format(date, "yyyy-MM-dd");
    const slots = weeklyMap[getDay(date)] ?? [];
    result[key] = slots.length ? { unavailable: false, slots } : { unavailable: true, slots: [{ ...DEFAULT_SLOT }] };
  }

  const sub = submissions.find((s) => s.month === month && s.year === year);
  if (sub) {
    savedDays.filter((d) => d.submission_id === sub.id).forEach((d) => {
      result[d.date] = { unavailable: d.is_unavailable, slots: d.slots?.length ? d.slots : [{ ...DEFAULT_SLOT }] };
    });
  }
  return result;
}

export default function StaffAvailabilityEditor({ staffProfileId, staffName, upcomingMonths, weeklyAvail, submissions, savedDays }: Props) {
  const [weekly, setWeekly] = useState<Record<number, WeeklyDayState>>(() => buildWeekly(weeklyAvail));
  const [weeklySaving, setWeeklySaving] = useState(false);
  const [weeklyStatus, setWeeklyStatus] = useState<"idle" | "saved" | "error">("idle");

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dayStates, setDayStates] = useState<Record<string, DayState>>(() =>
    buildMonthly(upcomingMonths[0].month, upcomingMonths[0].year, weeklyAvail, submissions, savedDays)
  );
  const [preferredShifts, setPreferredShifts] = useState(
    () => submissions.find((s) => s.month === upcomingMonths[0].month && s.year === upcomingMonths[0].year)?.preferred_shifts_per_week?.toString() ?? ""
  );
  const [monthlySaving, setMonthlySaving] = useState(false);
  const [monthlyStatus, setMonthlyStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const selected = upcomingMonths[selectedIdx];

  // Weekly helpers
  const toggleWeekDay = (i: number) => setWeekly((p) => ({ ...p, [i]: { ...p[i], available: !p[i].available } }));
  const addWeekSlot = (i: number) => setWeekly((p) => ({ ...p, [i]: { ...p[i], slots: [...p[i].slots, { ...DEFAULT_SLOT }] } }));
  const removeWeekSlot = (i: number, si: number) => setWeekly((p) => ({ ...p, [i]: { ...p[i], slots: p[i].slots.filter((_, idx) => idx !== si) } }));
  const updateWeekSlot = (i: number, si: number, field: "from" | "to", value: string) =>
    setWeekly((p) => { const s = [...p[i].slots]; s[si] = { ...s[si], [field]: value }; return { ...p, [i]: { ...p[i], slots: s } }; });

  async function saveWeekly() {
    setWeeklySaving(true); setWeeklyStatus("idle");
    const result = await adminSaveWeeklyAvailability(staffProfileId,
      Object.entries(weekly).map(([day, state]) => ({ dayOfWeek: Number(day), available: state.available, slots: state.slots }))
    );
    setWeeklySaving(false);
    setWeeklyStatus(result?.error ? "error" : "saved");
    if (result?.error) setErrorMsg(result.error);
  }

  // Monthly helpers
  const switchMonth = (idx: number) => {
    setSelectedIdx(idx);
    setMonthlyStatus("idle");
    const m = upcomingMonths[idx];
    setDayStates(buildMonthly(m.month, m.year, weeklyAvail, submissions, savedDays));
    setPreferredShifts(submissions.find((s) => s.month === m.month && s.year === m.year)?.preferred_shifts_per_week?.toString() ?? "");
  };

  const toggleUnavail = (key: string) => setDayStates((p) => ({ ...p, [key]: { ...p[key], unavailable: !p[key].unavailable } }));
  const addDaySlot = (key: string) => setDayStates((p) => ({ ...p, [key]: { ...p[key], slots: [...p[key].slots, { ...DEFAULT_SLOT }] } }));
  const removeDaySlot = (key: string, si: number) => setDayStates((p) => ({ ...p, [key]: { ...p[key], slots: p[key].slots.filter((_, i) => i !== si) } }));
  const updateDaySlot = (key: string, si: number, field: "from" | "to", value: string) =>
    setDayStates((p) => { const s = [...p[key].slots]; s[si] = { ...s[si], [field]: value }; return { ...p, [key]: { ...p[key], slots: s } }; });

  async function saveMonthly() {
    setMonthlySaving(true); setMonthlyStatus("idle");
    const entries = Object.entries(dayStates).map(([date, state]) => ({ date, unavailable: state.unavailable, slots: state.slots }));
    const result = await adminSaveAvailability(staffProfileId, selected.month, selected.year, preferredShifts ? parseInt(preferredShifts) : null, entries);
    setMonthlySaving(false);
    setMonthlyStatus(result?.error ? "error" : "saved");
    if (result?.error) setErrorMsg(result.error);
  }

  const firstDow = getDay(startOfMonth(new Date(selected.year, selected.month - 1)));
  const totalDays = getDaysInMonth(new Date(selected.year, selected.month - 1));
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-10">
      {/* Weekly availability */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-gray-200 pb-2">
          {staffName}&apos;s Weekly Availability Pattern
        </h2>
        <div className="space-y-4">
          {DAY_NAMES.map((name, i) => (
            <div key={i} className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={weekly[i].available} onChange={() => toggleWeekDay(i)} className="accent-[#E5003B] w-4 h-4" />
                <span className="font-medium">{name}</span>
              </label>
              {weekly[i].available && (
                <div className="ml-6 space-y-2">
                  {weekly[i].slots.map((slot, si) => (
                    <div key={si} className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-600 w-8">From</span>
                      <input type="time" value={slot.from} onChange={(e) => updateWeekSlot(i, si, "from", e.target.value)}
                        className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#E5003B]" />
                      <span className="text-sm text-gray-600">to</span>
                      <input type="time" value={slot.to} onChange={(e) => updateWeekSlot(i, si, "to", e.target.value)}
                        className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#E5003B]" />
                      {weekly[i].slots.length > 1 && (
                        <button onClick={() => removeWeekSlot(i, si)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addWeekSlot(i)} className="text-sm text-[#E5003B] hover:underline">+ Add window</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={saveWeekly} disabled={weeklySaving}
            className="px-5 py-2 bg-[#E5003B] hover:bg-[#C5002E] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            {weeklySaving ? "Saving…" : "Save Weekly Pattern"}
          </button>
          {weeklyStatus === "saved" && <span className="text-green-700 text-sm">Saved.</span>}
          {weeklyStatus === "error" && <span className="text-red-600 text-sm">{errorMsg}</span>}
        </div>
      </section>

      {/* Monthly availability */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b border-gray-200 pb-2">
          Monthly Availability
        </h2>

        <div className="flex gap-3 flex-wrap">
          {upcomingMonths.map((m, i) => {
            const sub = submissions.find((s) => s.month === m.month && s.year === m.year);
            return (
              <button key={i} onClick={() => switchMonth(i)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                  selectedIdx === i ? "bg-[#E5003B] text-white border-[#C5002E]" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}>
                {format(new Date(m.year, m.month - 1), "MMM yyyy")}
                {sub?.is_submitted && <span className="ml-1.5 opacity-75">✓</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setDayStates(buildMonthly(selected.month, selected.year, weeklyAvail, [], []))}
            className="text-sm px-4 py-2 border border-[#E5003B] text-[#E5003B] rounded-lg hover:bg-[#E5003B]/5">
            Apply weekly pattern
          </button>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-700">Preferred shifts/week:</label>
            <input type="number" min={1} max={7} value={preferredShifts}
              onChange={(e) => setPreferredShifts(e.target.value)}
              className="border rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-[#E5003B]" />
          </div>
        </div>

        {/* Calendar */}
        <div className="space-y-1">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-600 pb-1">
            {DAY_LABELS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const date = new Date(selected.year, selected.month - 1, day);
              const key = format(date, "yyyy-MM-dd");
              const state = dayStates[key];
              if (!state) return <div key={key} />;

              return (
                <div key={key} className={`border rounded-lg p-1.5 text-xs min-h-[80px] ${
                  state.unavailable ? "bg-gray-50 border-gray-200" : "bg-white border-green-200"
                }`}>
                  <div className="font-semibold text-gray-800 mb-1">{day}</div>
                  <label className="flex items-center gap-1 cursor-pointer mb-1">
                    <input type="checkbox" checked={!state.unavailable} onChange={() => toggleUnavail(key)} className="accent-[#E5003B]" />
                    <span className={state.unavailable ? "text-gray-400" : "text-green-700"}>
                      {state.unavailable ? "Off" : "Avail"}
                    </span>
                  </label>
                  {!state.unavailable && (
                    <div className="space-y-1">
                      {state.slots.map((slot, si) => (
                        <div key={si} className="space-y-0.5">
                          <div className="flex items-center gap-0.5">
                            <input type="time" value={slot.from} onChange={(e) => updateDaySlot(key, si, "from", e.target.value)}
                              className="border rounded px-1 py-0.5 w-full text-[10px] focus:outline-none focus:ring-1 focus:ring-[#E5003B]" />
                            {state.slots.length > 1 && (
                              <button onClick={() => removeDaySlot(key, si)} className="text-gray-300 hover:text-red-400 text-sm leading-none flex-shrink-0">×</button>
                            )}
                          </div>
                          <input type="time" value={slot.to} onChange={(e) => updateDaySlot(key, si, "to", e.target.value)}
                            className="border rounded px-1 py-0.5 w-full text-[10px] focus:outline-none focus:ring-1 focus:ring-[#E5003B]" />
                        </div>
                      ))}
                      <button onClick={() => addDaySlot(key)} className="text-[#E5003B] text-[10px] hover:underline">+ split</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={saveMonthly} disabled={monthlySaving}
            className="px-5 py-2 bg-[#E5003B] hover:bg-[#C5002E] disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            {monthlySaving ? "Saving…" : "Save Availability"}
          </button>
          {monthlyStatus === "saved" && <span className="text-green-700 text-sm">Saved.</span>}
          {monthlyStatus === "error" && <span className="text-red-600 text-sm">{errorMsg}</span>}
        </div>
      </section>
    </div>
  );
}
