/**
 * Canonical unit and coordinate-frame conventions for the Antennae / Space
 * Sandbox simulation core.
 *
 * Everything inside `src/simulation` uses these units internally. Conversion
 * happens only at data boundaries (NASA/JPL adapters, UI input) and must be an
 * explicit, tested transformation. Never mix km with m, seconds with days, or
 * two different reference frames inside one state vector.
 *
 * Reference: docs/PHYSICS_AND_SCIENTIFIC_INTEGRITY.md
 */

/** The single internal unit system. Do not introduce a second one. */
export type UnitSystem = {
  distance: 'km';
  time: 's';
  mass: 'kg';
  velocity: 'km/s';
  acceleration: 'km/s^2';
  gravitationalParameter: 'km^3/s^2';
};

export const INTERNAL_UNIT_SYSTEM: UnitSystem = {
  distance: 'km',
  time: 's',
  mass: 'kg',
  velocity: 'km/s',
  acceleration: 'km/s^2',
  gravitationalParameter: 'km^3/s^2',
};

/**
 * Coordinate frame used by the two-body test-particle model.
 *
 * - Origin: the center of mass of the central body (Earth in this milestone).
 * - Orientation: right-handed Earth-centered inertial axes, in the same family
 *   as Earth Mean Equator / J2000 (EME2000): +x toward the reference equinox
 *   direction, +z along the Earth rotation axis (north), +y completing the
 *   right-handed set.
 * - Motion: a state with velocity in the +y direction at position +x is
 *   prograde with respect to the +z pole.
 *
 * LIMITATIONS that must be stated wherever these states are shown:
 * - This milestone implements a point-mass two-body model only. No precession,
 *   nutation, Earth orientation parameters, perturbations, or time-scale
 *   handling are applied, so the frame is simply an inertial reference fixed to
 *   the central body.
 * - States are epoch-free: simulation time starts at t = 0 and advances by the
 *   configured timestep. No absolute epoch is attached, and none is needed,
 *   because the implemented forces do not depend on time.
 * - States sourced from real ephemerides (later milestone) must be transformed
 *   into this frame explicitly and must carry their own epoch/frame metadata.
 */
export type ReferenceFrame = {
  id: 'ECI-EME2000-ALIGNED';
  center: 'central-body-center-of-mass';
  handedness: 'right-handed';
  inertial: true;
  epochAttached: false;
  note: string;
};

export const EARTH_CENTERED_INERTIAL_FRAME: ReferenceFrame = {
  id: 'ECI-EME2000-ALIGNED',
  center: 'central-body-center-of-mass',
  handedness: 'right-handed',
  inertial: true,
  epochAttached: false,
  note:
    'Inertial axes aligned in convention with Earth Mean Equator / J2000 (EME2000), ' +
    'but no Earth-orientation, precession, or time-scale processing is implemented in this milestone.',
};
