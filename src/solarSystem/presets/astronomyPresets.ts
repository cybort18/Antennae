/**
 * Verified Historic and Future Astronomical & Mission Event Date Presets.
 *
 * Every preset has been cross-referenced with primary NASA and JPL documentation.
 * All presets fall within the validated 1800 AD – 2050 AD Standish / JPL baseline.
 */

import {
  calendarDateToJulianDate,
  type CalendarDate,
} from '../astronomy/julianDate';
import type { SolarSystemBodyId } from '../bodies';

export type AstronomyPresetCategory =
  | 'epoch'
  | 'historic-mission'
  | 'planetary-science'
  | 'future-mission';

export type AstronomyPreset = {
  id: string;
  name: string;
  label: string;
  category: AstronomyPresetCategory;
  calendarDate: CalendarDate;
  isoDateString: string;
  julianDate: number;
  targetBodyId?: SolarSystemBodyId;
  description: string;
  sourceUrl: string;
  sourceLabel: string;
};

function createPreset(
  id: string,
  name: string,
  label: string,
  category: AstronomyPresetCategory,
  date: CalendarDate,
  targetBodyId: SolarSystemBodyId | undefined,
  description: string,
  sourceUrl: string,
  sourceLabel: string,
): AstronomyPreset {
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoDateString = `${date.year}-${pad(date.month)}-${pad(date.day)}`;
  const julianDate = calendarDateToJulianDate(date);

  return {
    id,
    name,
    label,
    category,
    calendarDate: date,
    isoDateString,
    julianDate,
    targetBodyId,
    description,
    sourceUrl,
    sourceLabel,
  };
}

/**
 * Verified event presets with verified UTC dates and primary NASA / JPL sources.
 */
export const ASTRONOMY_PRESETS: readonly AstronomyPreset[] = [
  createPreset(
    'j2000-epoch',
    'J2000 Standard Astronomical Epoch',
    '2000 Jan 01 · J2000.0 Epoch',
    'epoch',
    { year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0 },
    'earth',
    'IAU standard fundamental reference epoch defining the mean equator and equinox of J2000.0 (JD 2451545.0).',
    'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
    'JPL Solar System Dynamics',
  ),
  createPreset(
    'apollo-11-landing',
    'Apollo 11 Lunar Landing',
    '1969 Jul 20 · Apollo 11 Landing',
    'historic-mission',
    { year: 1969, month: 7, day: 20, hour: 20, minute: 17, second: 40 },
    'earth',
    'First crewed lunar landing; Lunar Module Eagle touched down at Mare Tranquillitatis on 20 July 1969, 20:17:40 UTC.',
    'https://www.nasa.gov/mission/apollo-11/',
    'NASA Apollo 11 Mission Overview',
  ),
  createPreset(
    'voyager-1-saturn',
    'Voyager 1 Saturn Flyby',
    '1980 Nov 12 · Voyager 1 Saturn Encounter',
    'planetary-science',
    { year: 1980, month: 11, day: 12, hour: 23, minute: 46, second: 0 },
    'saturn',
    'NASA Voyager 1 reached closest approach to Saturn (124,000 km above cloud tops) and performed a gravity assist at Titan.',
    'https://voyager.jpl.nasa.gov/mission/timeline/',
    'NASA JPL Voyager Mission Timeline',
  ),
  createPreset(
    'curiosity-landing',
    'Curiosity Rover Mars Landing',
    '2012 Aug 06 · Curiosity Mars Landing',
    'historic-mission',
    { year: 2012, month: 8, day: 6, hour: 5, minute: 17, second: 57 },
    'mars',
    'NASA Mars Science Laboratory landed the Curiosity rover at Gale Crater using the sky crane maneuver on 6 August 2012, 05:17 UTC.',
    'https://science.nasa.gov/mission/msl-curiosity/',
    'NASA Mars Science Laboratory',
  ),
  createPreset(
    'perseverance-landing',
    'Perseverance Rover Jezero Crater Touchdown',
    '2021 Feb 18 · Perseverance Jezero Landing',
    'historic-mission',
    { year: 2021, month: 2, day: 18, hour: 20, minute: 55, second: 0 },
    'mars',
    'NASA Mars 2020 Perseverance rover touched down in Jezero Crater—the authentic geographical setting for the 2026 Junior Astronaut Outpost Trainer scenario.',
    'https://science.nasa.gov/mission/mars-2020-perseverance/',
    'NASA Mars 2020 Perseverance',
  ),
  createPreset(
    'osiris-rex-tag',
    'OSIRIS-REx Bennu Sample Collection (TAG)',
    '2020 Oct 20 · OSIRIS-REx Bennu TAG',
    'planetary-science',
    { year: 2020, month: 10, day: 20, hour: 22, minute: 12, second: 0 },
    'bennu',
    'NASA OSIRIS-REx touched asteroid 101955 Bennu at site Nightingale for Touch-and-Go sample collection.',
    'https://science.nasa.gov/mission/osiris-rex/',
    'NASA OSIRIS-REx Mission',
  ),
  createPreset(
    'earth-mars-transfer-2028',
    '2028 Earth-Mars Transit Window (Approximate)',
    '2028 Nov 08 · 2028 Earth-Mars Transit Window',
    'future-mission',
    { year: 2028, month: 11, day: 8, hour: 0, minute: 0, second: 0 },
    'mars',
    'Hohmann minimum-energy orbital alignment window for Earth-to-Mars interplanetary transit opportunities.',
    'https://ssd.jpl.nasa.gov/horizons/',
    'JPL Horizons Ephemeris System',
  ),
] as const;

export function presetById(id: string): AstronomyPreset | undefined {
  return ASTRONOMY_PRESETS.find((p) => p.id === id);
}
