"use client";

import { useState } from "react";
import {
  format,
  getDaysInMonth,
  startOfMonth,
  getDay,
  addDays,
} from "date-fns";
import { saveAvailability, submitAvailability } from "./actions";

type WeeklyAvailRow = {
  day_of_week: number;
  available_from: string;
  available_to: string;
};

type Submission = {
  id: string;
  month: number;
  year: number;
  preferred_shifts_per_week: number | null;
  is_submitted: boolean;
};

type SavedDay = {
  submission_id: string;
  date: string;
  available_from: string | null;
  available_to: string | null;
  is_unavailable: boolean;
};

type DayState = {
  unavailable: boolean;
  from: string;
  to: string;
};

interface Props {
  upcomingMonths: { month: number; year: number }[];
  weeklyAvail: WeeklyAvailRow[];
  submissions: Submission[];
  savedDays: SavedDay[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildDefaultsFromWeekly(
  month: number,
  year: number,
  weeklyAvail: WeeklyAvailRow[]
): Record<string, DayState> {
  const weeklyMap: Record<number, WeeklyAvailRow> = {};
  weeklyAvail.forEach((r) => (weeklyMap[r.day_of_week] = r));

  const result: Record<string, DayState> = {};
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dow = getDay(date);
    const key = format(date, "yyyy-MM-dd");
    const weekly = weeklyMap[dow];
    result[key] = weekly
      ? { unavailable: false, from: weekly.available_from.slice(0, 5), to: weekly.available_to.slice(0, 5) }
      : { unavailable: true, from: "09:00", to: "17:00" };
  }
  return result;
}

function buildFromSaved(
  month: number,
  year: number,
  submissions: Submission[],
  savedDays: SavedDay[],
  weeklyAvail: WeeklyAvailRow[]
): Record<string, DayState> {
  const sub = submissions.find((s) => s.month === month && s.year === year);
  if (!sub) return buildDefaultsFromWeekly(month, year, weeklyAvail);

  const days = savedDays.filter((d) => d.submission_id === sub.id);
  if (!days.length) return buildDefaultsFromWeekly(month, year, weeklyAvail);

  const result: Record<string, DayState> = buildDefaultsFromWeekly(month, year, weeklyAvail);
  days.forEach((d) => {
    result[d.date] = {
      unavailable: d.is_unavailable,
      from: d.available_from?.slice(0, 5) ?? "09:00",
      to: d.available_to?.slice(0, 5) ?? "17:00",
    };
  });
  return result;
}

export default function AvailabilityCalendar({
  upcomingMonths,
  weeklyAvail,
  submissions,
  savedDays,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dayStates, setDayStates] = useState<Record<string, DayState>>(() =>
    buildFromSaved(
      upcomingMonths[0].month,
      upcomingMonths[0].year,
      submissions,
      savedDays,
      weeklyAvail
    )
  );
  const [preferredShifts, setPreferredShifts] = useState<string>(
    () =>
      submissions
        .find(
          (s) =>
            s.month === upcomingMonths[0].month &&
            s.year === upcomingMonths[0].year
        )
        ?.preferred_shifts_per_week?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "submitted" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const selected = upcomingMonths[selectedIdx];
  const existingSub = submissions.find(
    (s) => s.month === selected.month && s.year === selected.year
  );
  const isAlreadySubmitted = existingSub?.is_submitted ?? false;

  function switchMonth(idx: number) {
    setSelectedIdx(idx);
    setStatus("idle");
    const m = upcomingMonths[idx];
    setDayStates(buildFromSaved(m.month, m.year, submissions, savedDays, weeklyAvail));
    setPreferredShifts(
      submissions
        .find((s) => s.month === m.month && s.year === m.year)
        ?.preferred_shifts_per_week?.toString() ?? ""
    );
  }

  function applyWeeklyPattern() {
    setDayStates(buildDefaultsFromWeekly(selected.month, selected.year, weeklyAvail));
    setStatus("idle");
  }

  function toggleUnavailable(dateKey: string) {
    setDayStates((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], unavailable: !prev[dateKey].unavailable },
    }));
  }

  function updateTime(dateKey: string, field: "from" | "to", value: string) {
    setDayStates((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], [field]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    const entries = Object.entries(dayStates).map(([date, state]) => ({
      date,
      unavailable: state.unavailable,
      from: state.unavailable ? null : state.from,
      to: state.unavailable ? null : state.to,
    }));
    const result = await saveAvailability(
      selected.month,
      selected.year,
      preferredShifts ? parseInt(preferredShifts) : null,
      entries
    );
    setSaving(false);
    if (result?.error) { setStatus("error"); setErrorMsg(result.error); }
    else setStatus("saved");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setStatus("idle");
    // Save first, then mark submitted
    const entries = Object.entries(dayStates).map(([date, state]) => ({
      date,
      unavailable: state.unavailable,
      from: state.unavailable ? null : state.from,
      to: state.unavailable ? null : state.to,
    }));
    const saveResult = await saveAvailability(
      selected.month,
      selected.year,
      preferredShifts ? parseInt(preferredShifts) : null,
      entries
    );
    if (saveResult?.error) { setSubmitting(false); setStatus("error"); setErrorMsg(saveResult.error); return; }

    const submitResult = await submitAvailability(selected.month, selected.year);
    setSubmitting(false);
    if (submitResult?.error) { setStatus("error"); setErrorMsg(submitResult.error); }
    else setStatus("submitted");
  }

  // Build calendar grid
  const firstDay = getDay(startOfMonth(new Date(selected.year, selected.month - 1)));
  const daysInMonth = getDaysInMonth(new Date(selected.year, selected.month - 1));
  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex gap-3">
        {upcomingMonths.map((m, i) => {
          const sub = submissions.find((s) => s.month === m.month && s.year === m.year);
          return (
            <button
              key={i}
              onClick={() => switchMonth(i)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium relative ${
                selectedIdx === i
                  ? "bg-[#E5003B] text-white border-[#C5002E]"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {format(new Date(m.year, m.month - 1), "MMM yyyy")}
              {sub?.is_submitted && (
                <span className="ml-2 text-xs opacity-75">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={applyWeeklyPattern}
          disabled={isAlreadySubmitted}
          className="text-sm px-4 py-2 border border-[#E5003B] text-[#E5003B] rounded-lg hover:bg-[#E5003B]/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply my weekly pattern
        </button>

        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-700 font-medium">Preferred shifts/week:</label>
          <input
            type="number"
            min={1}
            max={7}
            value={preferredShifts}
            onChange={(e) => setPreferredShifts(e.target.value)}
            disabled={isAlreadySubmitted}
            placeholder="e.g. 3"
            className="border rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-[#E5003B] disabled:opacity-40"
          />
        </div>

        {isAlreadySubmitted && (
          <span className="text-sm text-green-700 font-medium">
            ✓ Submitted for {format(new Date(selected.year, selected.month - 1), "MMMM")}
          </span>
        )}
      </div>

      {/* Calendar grid */}
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-600 pb-1">
          {DAY_LABELS.map((d) => <div key={d}>{d}</div>)}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;

            const date = new Date(selected.year, selected.month - 1, day);
            const dateKey = format(date, "yyyy-MM-dd");
            const state = dayStates[dateKey];
            if (!state) return <div key={dateKey} />;

            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div
                key={dateKey}
                className={`border rounded-lg p-2 text-xs space-y-1 ${
                  state.unavailable
                    ? "bg-gray-50 border-gray-200"
                    : "bg-white border-green-200"
                } ${isPast ? "opacity-50" : ""}`}
              >
                <div className="font-semibold text-gray-800">{day}</div>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!state.unavailable}
                    onChange={() => toggleUnavailable(dateKey)}
                    disabled={isAlreadySubmitted || isPast}
                    className="accent-[#E5003B]"
                  />
                  <span className={state.unavailable ? "text-gray-400" : "text-green-700"}>
                    {state.unavailable ? "Off" : "Avail"}
                  </span>
                </label>

                {!state.unavailable && (
                  <div className="space-y-1">
                    <input
                      type="time"
                      value={state.from}
                      onChange={(e) => updateTime(dateKey, "from", e.target.value)}
                      disabled={isAlreadySubmitted || isPast}
                      className="border rounded px-1 py-0.5 w-full text-[10px] focus:outline-none focus:ring-1 focus:ring-[#E5003B]"
                    />
                    <input
                      type="time"
                      value={state.to}
                      onChange={(e) => updateTime(dateKey, "to", e.target.value)}
                      disabled={isAlreadySubmitted || isPast}
                      className="border rounded px-1 py-0.5 w-full text-[10px] focus:outline-none focus:ring-1 focus:ring-[#E5003B]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save / Submit */}
      {!isAlreadySubmitted && (
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || submitting}
            className="px-5 py-2 border border-[#E5003B] text-[#E5003B] rounded-lg text-sm font-medium hover:bg-[#E5003B]/5 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving || submitting}
            className="px-5 py-2 bg-[#E5003B] hover:bg-[#C5002E] text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit availability"}
          </button>

          {status === "saved" && (
            <span className="text-sm text-green-700">Draft saved.</span>
          )}
          {status === "submitted" && (
            <span className="text-sm text-green-700 font-medium">Submitted!</span>
          )}
          {status === "error" && (
            <span className="text-sm text-red-600">{errorMsg}</span>
          )}
        </div>
      )}
    </div>
  );
}
