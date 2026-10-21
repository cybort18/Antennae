/**
 * Contracts for cached reference data.
 *
 * Provider payloads stop at this boundary: the parser below produces these
 * normalized types, and no UI component depends on the Horizons response shape.
 * All numerical values are in the simulation's internal units (km, s, km/s).
 */

import type { StateVector } from '../simulation';

export type ReferenceDataProvider = 'NASA/JPL Horizons';

export type ReferenceUnits = {
  distance: 'km';
  time: 's';
  velocity: 'km/s';
};

export type ReferenceQuery = {
  format: 'json';
  command: string;
  objData: 'NO' | 'YES';
  makeEphem: 'NO' | 'YES';
  ephemType: 'VECTORS';
  center: string;
  tlist: string;
  tlistType: 'JD';
  refPlane: 'FRAME';
  refSystem: 'ICRF';
  vecTable: '2';
  outUnits: 'KM-S';
  csvFormat: 'YES';
  vecLabels: 'NO';
};

export type ReferenceProvenance = {
  provider: ReferenceDataProvider;
  /** Signature version returned by the API, kept so format drift is visible. */
  apiVersion: string;
  targetName: string;
  targetId: string;
  /** Provider calendar date and time scale, for display and audit only. */
  epochTdb: string;
  julianDateTdb: number;
  frame: string;
  center: string;
  units: ReferenceUnits;
  /** UTC instant at which this cached response was retrieved. */
  retrievedAt: string;
  /** Official API documentation, not a live query at runtime. */
  sourceUrl: string;
  /** Exact request used to produce the cached fixture. */
  queryUrl: string;
  query: ReferenceQuery;
  /** Provider output classification; geometric states have no light-time corrections. */
  outputType: string;
  notes: string;
};

/**
 * One cached, validated reference state.
 *
 * `state` is the exact provider vector. The application may use it as an
 * initial condition for the simplified two-body model; that propagation is not
 * an ephemeris for the real object.
 */
export type ReferencePreset = {
  id: string;
  label: string;
  description: string;
  provenance: ReferenceProvenance;
  state: StateVector;
};
