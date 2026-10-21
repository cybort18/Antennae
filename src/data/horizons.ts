/**
 * Parser for the cached JPL Horizons VECTORS payload.
 *
 * The adapter accepts the provider's text table (the `result` field of the
 * Horizons JSON response) and normalizes exactly one state vector. Unsupported
 * units, frames, centers, time scales, or malformed rows are rejected; the
 * application must not silently interpret a state in the wrong convention.
 */

import { magnitude, vec3, type StateVector } from '../simulation';

export type HorizonsSignature = {
  source: string;
  version: string;
};

export type HorizonsApiPayload = {
  signature: HorizonsSignature;
  result: string;
};

export type ParsedHorizonsVector = {
  signature: HorizonsSignature;
  targetName: string;
  targetId: string;
  centerName: string;
  centerId: string;
  centerSite: string;
  frame: string;
  outputUnits: string;
  outputType: string;
  epochTdb: string;
  julianDateTdb: number;
  state: StateVector;
};

export class ReferenceDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReferenceDataError';
  }
}

function requiredMatch(text: string, pattern: RegExp, field: string): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) {
    throw new ReferenceDataError(`Horizons response is missing the ${field} field.`);
  }
  return match;
}

function finiteNumber(value: string, field: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ReferenceDataError(`Horizons ${field} is empty.`);
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    throw new ReferenceDataError(`Horizons ${field} is not a decimal number (received ${value}).`);
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new ReferenceDataError(`Horizons ${field} is not a finite number (received ${value}).`);
  }
  return parsed;
}

const PROVIDER_MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

/**
 * Converts the provider's modern Gregorian calendar label to a Julian date.
 * This is a metadata consistency check, not an epoch/time-scale model.
 */
function julianDateFromProviderCalendar(calendarDate: string): number {
  const match =
    /^A\.D\.\s+(\d{4})-([A-Za-z]{3})-(\d{2}) (\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(
      calendarDate,
    );
  if (!match) {
    throw new ReferenceDataError(
      `Horizons vector row has an unrecognized calendar date "${calendarDate}".`,
    );
  }
  const month = PROVIDER_MONTHS[match[2]];
  if (month === undefined) {
    throw new ReferenceDataError(`Horizons calendar month "${match[2]}" is not recognized.`);
  }
  const seconds = Number(match[6]);
  if (!Number.isFinite(seconds)) {
    throw new ReferenceDataError(`Horizons calendar seconds are not finite (${match[6]}).`);
  }
  const wholeSeconds = Math.floor(seconds);
  const milliseconds = Math.round((seconds - wholeSeconds) * 1000);
  const unixMilliseconds = Date.UTC(
    Number(match[1]),
    month,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    wholeSeconds,
    milliseconds,
  );
  if (!Number.isFinite(unixMilliseconds)) {
    throw new ReferenceDataError(`Horizons calendar date "${calendarDate}" is not finite.`);
  }
  return unixMilliseconds / 86_400_000 + 2_440_587.5;
}

/**
 * Parses one geometric state vector from a Horizons VECTORS response.
 *
 * Required conventions for this application: Earth body center (399),
 * ICRF frame, geometric Cartesian state, TDB epoch, and KM-S units. A response
 * using a different convention must be converted explicitly elsewhere, not
 * accepted here.
 */
export function parseHorizonsVector(payload: HorizonsApiPayload): ParsedHorizonsVector {
  if (payload.signature.source !== 'NASA/JPL Horizons API') {
    throw new ReferenceDataError(
      `Unexpected data source "${payload.signature.source}"; expected NASA/JPL Horizons API.`,
    );
  }
  if (!payload.signature.version) {
    throw new ReferenceDataError('Horizons API signature is missing its version.');
  }

  const result = payload.result;
  if (typeof result !== 'string' || result.trim().length === 0) {
    throw new ReferenceDataError('Horizons response has no result text.');
  }

  const target = requiredMatch(
    result,
    /^Target body name:\s*(.*?)\s*\((-?\d+)\)/m,
    'target body',
  );
  const center = requiredMatch(
    result,
    /^Center body name:\s*(.*?)\s*\((\d+)\)/m,
    'center body',
  );
  const centerSite = requiredMatch(result, /^Center-site name:\s*(.+)$/m, 'center-site');
  const frame = requiredMatch(result, /^Reference frame\s*:\s*(.+)$/m, 'reference frame');
  const outputUnits = requiredMatch(result, /^Output units\s*:\s*(.+)$/m, 'output units');
  const outputType = requiredMatch(result, /^Output type\s*:\s*(.+)$/m, 'output type');
  const startTime = requiredMatch(
    result,
    /^Start time\s*:\s*A\.D\.\s*(\d{4}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(TDB|UT|UTC)\s*$/m,
    'start time',
  );

  const targetName = target[1].trim();
  const targetId = target[2];
  const centerName = center[1].trim();
  const centerId = center[2];
  const centerSiteName = centerSite[1].trim();
  const referenceFrame = frame[1].trim();
  const units = outputUnits[1].trim();
  const type = outputType[1].trim();
  const timeScale = startTime[2];

  if (centerId !== '399') {
    throw new ReferenceDataError(
      `Expected an Earth-centered state (center 399); received center ${centerId} (${centerName}).`,
    );
  }
  if (centerSiteName !== 'BODY CENTER') {
    throw new ReferenceDataError(
      `Expected a body-center state; received center-site "${centerSiteName}".`,
    );
  }
  if (referenceFrame !== 'ICRF') {
    throw new ReferenceDataError(
      `Expected the ICRF reference frame; received "${referenceFrame}".`,
    );
  }
  if (units !== 'KM-S') {
    throw new ReferenceDataError(`Expected KM-S output units; received "${units}".`);
  }
  if (type !== 'GEOMETRIC cartesian states') {
    throw new ReferenceDataError(
      `Expected "GEOMETRIC cartesian states"; received output type "${type}".`,
    );
  }
  if (timeScale !== 'TDB') {
    throw new ReferenceDataError(`Expected a TDB epoch; received "${timeScale}".`);
  }

  const startMarker = result.indexOf('$$SOE');
  const endMarker = result.indexOf('$$EOE');
  if (startMarker < 0 || endMarker < 0 || endMarker <= startMarker) {
    throw new ReferenceDataError('Horizons response is missing its $$SOE/$$EOE vector table.');
  }
  if (!result.slice(0, startMarker).includes('Calendar Date (TDB)')) {
    throw new ReferenceDataError('Horizons vector table is not labelled Calendar Date (TDB).');
  }

  const table = result
    .slice(startMarker + '$$SOE'.length, endMarker)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (table.length !== 1) {
    throw new ReferenceDataError(
      `Expected exactly one vector row in the cached response; received ${table.length}.`,
    );
  }

  const fields = table[0].split(',').map((field) => field.trim());
  while (fields.length > 0 && fields[fields.length - 1] === '') {
    fields.pop();
  }
  if (fields.length !== 8) {
    throw new ReferenceDataError(
      `Expected 8 comma-separated vector fields (JD, date, x, y, z, vx, vy, vz); received ${fields.length}.`,
    );
  }

  const julianDateTdb = finiteNumber(fields[0], 'Julian date');
  const calendarDate = fields[1];
  const state = {
    positionKm: vec3(
      finiteNumber(fields[2], 'x position'),
      finiteNumber(fields[3], 'y position'),
      finiteNumber(fields[4], 'z position'),
    ),
    velocityKmPerS: vec3(
      finiteNumber(fields[5], 'x velocity'),
      finiteNumber(fields[6], 'y velocity'),
      finiteNumber(fields[7], 'z velocity'),
    ),
  };
  if (magnitude(state.positionKm) <= 0) {
    throw new ReferenceDataError('Horizons state has zero position magnitude.');
  }
  if (!/^A\.D\.\s+\d{4}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(calendarDate)) {
    throw new ReferenceDataError(
      `Horizons vector row has an unrecognized calendar date "${calendarDate}".`,
    );
  }
  const headerCalendar = startTime[1].replace(/\.0+$/, '');
  const rowCalendar = calendarDate.replace(/^A\.D\.\s+/, '').replace(/\.0+$/, '');
  if (rowCalendar !== headerCalendar) {
    throw new ReferenceDataError(
      `Horizons vector row epoch "${rowCalendar}" does not match the header start time "${headerCalendar}".`,
    );
  }
  const calendarJulianDate = julianDateFromProviderCalendar(calendarDate);
  if (Math.abs(calendarJulianDate - julianDateTdb) > 1e-6) {
    throw new ReferenceDataError(
      `Horizons row Julian date ${julianDateTdb} does not match its calendar date "${rowCalendar}".`,
    );
  }

  return {
    signature: payload.signature,
    targetName,
    targetId,
    centerName,
    centerId,
    centerSite: centerSiteName,
    frame: referenceFrame,
    outputUnits: units,
    outputType: type,
    epochTdb: `${startTime[1]} TDB`,
    julianDateTdb,
    state,
  };
}
