"use client";

import { useState, useEffect } from "react";
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameWeek,
} from "date-fns";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const generateTimeSlots = () => {
  const slots = [];
  let hour = 9;
  let minute = 0;
  while (hour < 21 || (hour === 21 && minute <= 30)) {
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    slots.push(`${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`);
    minute += 15;
    if (minute === 60) { minute = 0; hour += 1; }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<Record<string, Record<string, boolean>>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<boolean | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(null);

  useEffect(() => {
    const initial: Record<string, Record<string, boolean>> = {};
    days.forEach((d) => {
      initial[d] = {};
      timeSlots.forEach((slot) => (initial[d][slot] = false));
    });
    setAvailability(initial);
  }, []);

  if (!availability || Object.keys(availability).length === 0) {
    return <div>Loading...</div>;
  }

  const toggleSlot = (day: string, slot: string, value?: boolean) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: value !== undefined ? value : !prev[day][slot] },
    }));
  };

  const selectAllDay = (day: string) => {
    setAvailability((prev) => {
      const updated = { ...prev };
      timeSlots.forEach((slot) => (updated[day][slot] = true));
      return updated;
    });
  };

  const clearDay = (day: string) => {
    setAvailability((prev) => {
      const updated = { ...prev };
      timeSlots.forEach((slot) => (updated[day][slot] = false));
      return updated;
    });
  };

  const handleMouseDown = (day: string, slot: string) => {
    const newValue = !availability[day][slot];
    setIsDragging(true);
    setDragValue(newValue);
    toggleSlot(day, slot, newValue);
  };

  const handleMouseEnter = (day: string, slot: string) => {
    if (!isDragging || dragValue === null) return;
    toggleSlot(day, slot, dragValue);
  };

  const today = new Date();
  const calendarMonths = Array.from({ length: 4 }, (_, i) =>
    addMonths(startOfMonth(today), i)
  );

  const getWeeksInMonth = (month: Date) => {
    const weeks = [];
    let current = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    while (current <= end) {
      weeks.push({ start: current, end: endOfWeek(current, { weekStartsOn: 0 }) });
      current = addDays(current, 7);
    }
    return weeks;
  };

  return (
    <div className="space-y-6 select-none" onMouseUp={() => { setIsDragging(false); setDragValue(null); }}>
      <h1 className="text-2xl font-semibold">Your Availability</h1>

      {/* View toggle */}
      <div className="flex gap-4 items-center">
        {(["month", "week"] as const).map((mode) => (
          <label key={mode} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value={mode}
              checked={viewMode === mode}
              onChange={() => {
                setViewMode(mode);
                setSelectedMonth(null);
                setSelectedWeekStart(null);
              }}
            />
            {mode === "month" ? "By Month" : "By Week"}
          </label>
        ))}
      </div>

      {/* Month picker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {calendarMonths.map((month) => (
          <button
            key={month.toISOString()}
            onClick={() => { setSelectedMonth(month); setSelectedWeekStart(null); }}
            className={`p-3 rounded border text-center font-medium ${
              selectedMonth?.getMonth() === month.getMonth() &&
              selectedMonth?.getFullYear() === month.getFullYear()
                ? "bg-[#E5003B] text-white border-[#C5002E]"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {format(month, "MMMM yyyy")}
          </button>
        ))}
      </div>

      {/* Week picker (week mode) */}
      {viewMode === "week" && selectedMonth && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {getWeeksInMonth(selectedMonth).map(({ start, end }) => (
            <button
              key={start.toISOString()}
              onClick={() => setSelectedWeekStart(start)}
              className={`p-3 rounded border text-center text-sm font-medium ${
                selectedWeekStart &&
                isSameWeek(selectedWeekStart, start, { weekStartsOn: 0 })
                  ? "bg-[#E5003B] text-white border-[#C5002E]"
                  : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {format(start, "MMM d")} – {format(end, "MMM d")}
            </button>
          ))}
        </div>
      )}

      {/* Context label */}
      {(selectedMonth || selectedWeekStart) && (
        <div className="text-xl font-semibold pt-2">
          {viewMode === "week" && selectedWeekStart
            ? `Week of ${format(selectedWeekStart, "MMM d")} – ${format(addDays(selectedWeekStart, 6), "MMM d")}`
            : selectedMonth
            ? `${format(selectedMonth, "MMMM yyyy")}`
            : null}
        </div>
      )}

      {/* Save */}
      {(selectedMonth || selectedWeekStart) && (
        <button
          onClick={() => alert("Saving availability — coming soon.")}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
        >
          Save Availability
        </button>
      )}

      {/* Grid */}
      {(selectedMonth || selectedWeekStart) && (
        <div className="hidden md:grid grid-cols-7 gap-4">
          {days.map((day) => (
            <div key={day} className="border rounded-lg p-2">
              <h2 className="text-center font-semibold mb-2">{day}</h2>
              <div className="flex justify-center gap-2 mb-3">
                <button
                  onClick={() => selectAllDay(day)}
                  className="px-2 py-1 bg-[#E5003B] hover:bg-[#E5003B] text-white text-xs rounded"
                >
                  All
                </button>
                <button
                  onClick={() => clearDay(day)}
                  className="px-2 py-1 bg-gray-300 hover:bg-gray-400 text-black text-xs rounded"
                >
                  Clear
                </button>
              </div>
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  onMouseDown={() => handleMouseDown(day, slot)}
                  onMouseEnter={() => handleMouseEnter(day, slot)}
                  className={`w-20 mx-auto border text-center text-xs py-0.5 mb-1 rounded cursor-pointer select-none ${
                    availability[day][slot]
                      ? "bg-green-400 text-white border-green-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                >
                  {slot}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
