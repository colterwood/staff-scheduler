"use client";

import { useState } from "react";
import { format, getDaysInMonth, startOfMonth, getDay, addDays } from "date-fns";
import { saveAvailability, submitAvailability } from "./actions";

type TimeSlot = { from: string; to: string };
type DayState = { unavailable: boolean; slots: TimeSlot[] };

type WeeklyAvailRow = { day_of_week: number; slots: TimeSlot[] };
type Submission = { id: string; month: number; year: number; preferred_shifts_per_week: number | null; is_submitted: boolean };
type SavedDay = { submission_id: string; date: string; slots: TimeSlot[] | null; is_unavailable: boolean };

interface Props {
  upcomingMonths: { month: number; year: number }[];
  weeklyAvail: WeeklyAvailRow[];
  submissions: Submission[];
  savedDays: SavedDay[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_SLOT: TimeSlot = { from: "09:00", to: "17:00" };

function buildFromWeekly(month: number, year: number, weeklyAvail: WeeklyAvailRow[]): Record<string, DayState> {
  const map: Record<number, TimeSlot[]> = {};
  weeklyAvail.forEach((r) => { map[r.day_of_week] = r.slots ?? []; });

  const result: Record<string, DayState> = {};
  const total = getDaysInMonth(new Date(year, month - 1));
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month - 1, d);
    const key = format(date, "yyyy-MM-dd");
    const slots = map[getDay(date)] ?? [];
    result[key] = slots.length
      ? { unavailable: false, slots }
      : { unavailable: true, slots: [DEFAULT_SLOT] };
  }
  return result;
}

function buildFromSaved(month: number, year: number, submissions: Submission[], savedDays: SavedDay[], weeklyAvail: WeeklyAvailRow[]): Record<string, DayState> {
  const sub = submissions.find((s) => s.month === month && s.year === year);
  const base = buildFromWeekly(month, year, weeklyAvail);
  if (!sub) return base;

  const days = savedDays.filter((d) => d.submission_id === sub.id);
  if (!days.length) return base;

  days.forEach((d) => {
    base[d.date] = {
      unavailable: d.is_unavailable,
      slots: d.slots?.length ? d.slots : [DEFAULT_SLOT],
    };
  });
  return base;
}

export default function AvailabilityCalendar({ upcomingMonths, weeklyAvail, submissions, savedDays }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dayStates, setDayStates] = useState<Record<string, DayState>>(() =>
    buildFromSaved(upcomingMonths[0].month, upcomingMonths[0].year, submissions, savedDays, weeklyAvail)
  );
  const [preferredShifts, setPreferredShifts] = useState(
    () => submissions.find((s) => s.month === upcomingMonths[0].month && s.year === upcomingMonths[0].year)
      ?.preferred_shifts_per_week?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "submitted" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const selected = upcomingMonths[selectedIdx];
  const isSubmitted = submissions.find((s) => s.month === selected.month && s.year === selected.year)?.is_submitted ?? false;

  function switchMonth(idx: number) {
    setSelectedIdx(idx);
    setStatus("idle");
    const m = upcomingMonths[idx];
    setDayStates(buildFromSaved(m.month, m.year, submissions, savedDays, weeklyAvail));
    setPreferredShifts(submissions.find((s) => s.month === m.month && s.year === m.year)?.preferred_shifts_per_week?.toString() ?? "");
  }

  // Day state mutations
  const toggleUnavailable = (key: string) =>
    setDayStates((prev) => ({ ...prev, [key]: { ...prev[key], unavailable: !prev[key].unavailable } }));

  const addSlot = (key: string) =>
    setDayStates((prev) => ({ ...prev, [key]: { ...prev[key], slots: [...prev[key].slots, { ...DEFAULT_SLOT }] } }));

  const removeSlot = (key: string, si: number) =>
    setDayStates((prev) => ({ ...prev, [key]: { ...prev[key], slots: prev[key].slots.filter((_, i) => i !== si) } }));

  const updateSlot = (key: string, si: number, field: "from" | "to", value: string) =>
    setDayStates((prev) => {
      const slots = [...prev[key].slots];
      slots[si] = { ...slots[si], [field]: value };
      return { ...prev, [key]: { ...prev[key], slots } };
    });

  function getEntries() {
    return Object.entries(dayStates).map(([date, state]) => ({
      date, unavailable: state.unavailable, slots: state.slots,
    }));
  }

  async function handleSave() {
    setSaving(true); setStatus("idle");
    const result = await saveAvailability(selected.month, selected.year, preferredShifts ? parseInt(preferredShifts) : null, getEntries());
    setSaving(false);
    if (result?.error) { setStatus("error"); setErrorMsg(result.error); } else setStatus("saved");
  }

  async function handleSubmit() {
    setSubmitting(true); setStatus("idle");
    const save = await saveAvailability(selected.month, selected.year, preferredShifts ? parseInt(preferredShifts) : null, getEntries());
    if (save?.error) { setSubmitting(false); setStatus("error"); setErrorMsg(save.error); return; }
    const submit = await submitAvailability(selected.month, selected.year);
    setSubmitting(false);
    if (submit?.error) { setStatus("error"); setErrorMsg(submit.error); } else setStatus("submitted");
  }

  // Calendar grid
  const firstDow = getDay(startOfMonth(new Date(selected.year, selected.month - 1)));
  const totalDays = getDaysInMonth(new Date(selected.year, selected.month - 1));
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      {/* Month tabs */}
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

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => { setDayStates(buildFromWeekly(selected.month, selected.year, weeklyAvail)); setStatus("idle"); }}
          disabled={isSubmitted}
          className="text-sm px-4 py-2 border border-[#E5003B] text-[#E5003B] rounded-lg hover:bg-[#E5003B]/5 disabled:opacity-40">
          Apply my weekly pattern
        </button>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-700 font-medium">Preferred shifts/week:</label>
          <input type="number" min={1} max={7} value={preferredShifts}
            onChange={(e) => setPreferredShifts(e.target.value)} disabled={isSubmitted}
            placeholder="e.g. 3" className="border rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-[#E5003B] disabled:opacity-40" />
        </div>
        {isSubmitted && <span className="text-sm text-green-700 font-medium">✓ Submitted</span>}
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
            const isPast = date < today;
            const disabled = isSubmitted || isPast;

            return (
              <div key={key} className={`border rounded-lg p-1.5 text-xs min-h-[80px] ${
                state.unavailable ? "bg-gray-50 border-gray-200" : "bg-white border-green-200"
              } ${isPast ? "opacity-40" : ""}`}>
                <div className="font-semibold text-gray-800 mb-1">{day}</div>

                <label className="flex items-center gap-1 cursor-pointer mb-1">
                  <input type="checkbox" checked={!state.unavailable}
                    onChange={() => !disabled && toggleUnavailable(key)}
                    disabled={disabled} className="accent-[#E5003B]" />
                  <span className={state.unavailable ? "text-gray-400" : "text-green-700"}>
                    {state.unavailable ? "Off" : "Avail"}
                  </span>
                </label>

                {!state.unavailable && (
                  <div className="space-y-1">
                    {state.slots.map((slot, si) => (
                      <div key={si} className="space-y-0.5">
                        <div className="flex items-center gap-0.5">
                          <input type="time" value={slot.from}
                            onChange={(e) => updateSlot(key, si, "from", e.target.value)}
                            disabled={disabled}
                            className="border rounded px-1 py-0.5 w-full text-[10px] focus:outline-none focus:ring-1 focus:ring-[#E5003B]" />
                          {state.slots.length > 1 && !disabled && (
                            <button onClick={() => removeSlot(key, si)}
                              className="text-gray-300 hover:text-red-400 text-sm leading-none flex-shrink-0">×</button>
                          )}
                        </div>
                        <input type="time" value={slot.to}
                          onChange={(e) => updateSlot(key, si, "to", e.target.value)}
                          disabled={disabled}
                          className="border rounded px-1 py-0.5 w-full text-[10px] focus:outline-none focus:ring-1 focus:ring-[#E5003B]" />
                      </div>
                    ))}
                    {!disabled && (
                      <button onClick={() => addSlot(key)}
                        className="text-[#E5003B] text-[10px] hover:underline mt-0.5">
                        + split
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {!isSubmitted && (
        <div className="flex items-center gap-4 pt-2">
          <button onClick={handleSave} disabled={saving || submitting}
            className="px-5 py-2 border border-[#E5003B] text-[#E5003B] rounded-lg text-sm font-medium hover:bg-[#E5003B]/5 disabled:opacity-50">
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button onClick={handleSubmit} disabled={saving || submitting}
            className="px-5 py-2 bg-[#E5003B] hover:bg-[#C5002E] text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit availability"}
          </button>
          {status === "saved" && <span className="text-sm text-green-700">Draft saved.</span>}
          {status === "submitted" && <span className="text-sm text-green-700 font-medium">Submitted!</span>}
          {status === "error" && <span className="text-sm text-red-600">{errorMsg}</span>}
        </div>
      )}
    </div>
  );
}
