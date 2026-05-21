"use client";

import { useMemo, useState } from "react";
import { Icon } from "./icons";

interface DayCell {
  date: Date;
  inCurrentMonth: boolean;
  available: boolean;
  isSuggested: boolean;
}

function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtMonth(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function fmtSlot(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function InstallerCalendar({
  shipDate,
  onConfirm,
}: {
  shipDate: Date;
  onConfirm?: (date: Date) => void;
}) {
  // Show the month that contains the suggested slot.
  const suggested = useMemo(() => {
    // First weekday at least 3 days after shipping.
    let d = addDays(shipDate, 3);
    while (isWeekend(d)) d = addDays(d, 1);
    return d;
  }, [shipDate]);

  const [selected, setSelected] = useState<Date | null>(suggested);
  const [confirmed, setConfirmed] = useState(false);

  const cells: DayCell[] = useMemo(() => {
    const monthStart = new Date(suggested.getFullYear(), suggested.getMonth(), 1);
    const monthEnd = new Date(suggested.getFullYear(), suggested.getMonth() + 1, 0);
    // Week starts Monday (en-GB convention).
    const offset = (monthStart.getDay() + 6) % 7;
    const gridStart = addDays(monthStart, -offset);
    const total = Math.ceil((offset + monthEnd.getDate()) / 7) * 7;
    const out: DayCell[] = [];
    const today = new Date();
    for (let i = 0; i < total; i++) {
      const d = addDays(gridStart, i);
      const inCurrent = d.getMonth() === suggested.getMonth();
      const available =
        inCurrent && !isWeekend(d) && d.getTime() >= today.getTime() - 86400000;
      out.push({
        date: d,
        inCurrentMonth: inCurrent,
        available,
        isSuggested: sameDay(d, suggested),
      });
    }
    return out;
  }, [suggested]);

  if (confirmed && selected) {
    return (
      <div className="cal-confirmed">
        <div className="cal-confirmed-icon">
          <Icon.Check />
        </div>
        <div className="cal-confirmed-body">
          <div className="cal-confirmed-title">Installer booked</div>
          <div className="cal-confirmed-sub">
            {fmtSlot(selected)} · 10:00 – 11:30
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cal-widget">
      <div className="cal-head">
        <div>
          <div className="cal-eyebrow">Smart meter installation</div>
          <div className="cal-title">We found a perfect slot in your area</div>
        </div>
      </div>

      <div className="cal-month">
        <span className="cal-month-name">{fmtMonth(suggested)}</span>
        <span className="cal-month-hint">Helios suggests</span>
      </div>

      <div className="cal-grid">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          const isSel = selected && sameDay(cell.date, selected);
          const cls = [
            "cal-day",
            !cell.inCurrentMonth ? "muted" : "",
            cell.available ? "avail" : "off",
            cell.isSuggested ? "suggested" : "",
            isSel ? "selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={i}
              type="button"
              className={cls}
              disabled={!cell.available}
              onClick={() => setSelected(cell.date)}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="cal-slot">
          <div className="cal-slot-info">
            <Icon.Calendar />
            <div>
              <div className="cal-slot-date">{fmtSlot(selected)}</div>
              <div className="cal-slot-window">10:00 – 11:30 · 90 min</div>
            </div>
          </div>
          <button
            type="button"
            className="cal-confirm"
            onClick={() => {
              setConfirmed(true);
              onConfirm?.(selected);
            }}
          >
            Confirm appointment <Icon.Arrow />
          </button>
        </div>
      )}
    </div>
  );
}
