/**
 * Julian Date conversions and calendar time calculations.
 *
 * Implements standard IAU algorithms (Meeus, Astronomical Algorithms, Chapter 7).
 * Valid across the supported 1800 AD to 2050 AD temporal baseline.
 */

import type { CalendarDate } from './types';
export type { CalendarDate };

/** Standard J2000.0 epoch: 2000-01-01 12:00:00 UTC (TT). */
export const J2000_EPOCH_JD = 2451545.0;

/** Days in a Julian century. */
export const DAYS_PER_JULIAN_CENTURY = 36525.0;

/** Astronomical Unit in kilometres (IAU 2012 resolution B2 exact definition). */
export const KM_PER_AU = 149597870.7;

/** Supported temporal boundaries for Standish / JPL Table 1 formulations. */
export const MIN_SUPPORTED_YEAR = 1800;
export const MAX_SUPPORTED_YEAR = 2050;

export const MIN_SUPPORTED_JD = 2378496.5; // 1800-01-01 00:00:00 UTC
export const MAX_SUPPORTED_JD = 2469807.5; // 2050-01-01 00:00:00 UTC

/**
 * Converts a Gregorian calendar date and time into a Julian Date.
 */
export function calendarDateToJulianDate(date: CalendarDate): number {
  let { year, month } = date;
  const { day, hour = 0, minute = 0, second = 0 } = date;

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);

  const dayFraction = (hour + minute / 60 + second / 3600) / 24;

  const jd =
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5 +
    dayFraction;

  return jd;
}

/**
 * Converts a Julian Date into a Gregorian calendar date and time.
 */
export function julianDateToCalendarDate(jd: number): CalendarDate {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;

  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }

  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const dayWithFrac = b - d - Math.floor(30.6001 * e) + f;
  const day = Math.floor(dayWithFrac);
  const fracDay = dayWithFrac - day;

  let month = e < 14 ? e - 1 : e - 13;
  let year = month > 2 ? c - 4716 : c - 4715;

  const totalSeconds = Math.round(fracDay * 86400);
  const hour = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;

  return { year, month, day, hour, minute, second };
}

/**
 * Converts a Julian Date to Julian centuries elapsed since J2000.0.
 */
export function julianCenturiesSinceJ2000(jd: number): number {
  return (jd - J2000_EPOCH_JD) / DAYS_PER_JULIAN_CENTURY;
}

/**
 * Returns current real-world Julian Date from system UTC clock.
 */
export function nowToJulianDate(): number {
  const now = new Date();
  return (
    calendarDateToJulianDate({
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      second: now.getUTCSeconds(),
    }) +
    now.getUTCMilliseconds() / 86400000
  );
}

/**
 * Formats a Julian Date into a clean ISO UTC timestamp string (YYYY-MM-DD HH:mm UTC).
 */
export function formatJulianDateUtc(jd: number): string {
  const cal = julianDateToCalendarDate(jd);
  const pad = (n: number) => String(n).padStart(2, '0');
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const mName = monthNames[cal.month - 1] ?? 'Jan';
  return `${cal.year}-${mName}-${pad(cal.day)} ${pad(cal.hour)}:${pad(cal.minute)} UTC`;
}

/**
 * Formats a Julian Date into standard YYYY-MM-DD format for date pickers.
 */
export function julianDateToIsoDate(jd: number): string {
  const cal = julianDateToCalendarDate(jd);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${cal.year}-${pad(cal.month)}-${pad(cal.day)}`;
}

/**
 * Parses an ISO date string (YYYY-MM-DD) into a Julian Date at 12:00:00 UTC.
 */
export function isoDateToJulianDate(isoDate: string): number {
  const parts = isoDate.split('-');
  if (parts.length < 3) {
    return J2000_EPOCH_JD;
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return J2000_EPOCH_JD;
  }
  return calendarDateToJulianDate({ year, month, day, hour: 12, minute: 0, second: 0 });
}
