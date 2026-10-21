/**
 * Cached JPL Horizons VECTORS response used by the reference preset.
 *
 * Retrieved 2026-10-20T08:11:49Z from the NASA/JPL Horizons API. This is a
 * provider-shaped excerpt: the header fields and the single $$SOE/$$EOE vector
 * row are preserved exactly; explanatory footer text is omitted. The complete
 * query is recorded below and in the preset provenance.
 *
 * Source documentation: https://ssd-api.jpl.nasa.gov/doc/horizons.html
 *
 * The target is GOES-16, a NOAA geostationary weather satellite. The vector is
 * a geometric state in ICRF about the Earth body center, in km and km/s, at
 * 2026-10-20 00:00:00 TDB. It is reference input data, not a forecast produced
 * by this project.
 */

export const GOES16_HORIZONS_SIGNATURE = {
  source: 'NASA/JPL Horizons API',
  version: '1.2',
} as const;

export const GOES16_HORIZONS_RETRIEVED_AT = '2026-10-20T08:11:49Z';

export const GOES16_HORIZONS_SOURCE_URL = 'https://ssd-api.jpl.nasa.gov/doc/horizons.html';

export const GOES16_HORIZONS_QUERY_URL =
  'https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND=%27-141866%27&OBJ_DATA=%27NO%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27VECTORS%27&CENTER=%27500%40399%27&TLIST=%272461333.5%27&TLIST_TYPE=%27JD%27&REF_PLANE=%27FRAME%27&REF_SYSTEM=%27ICRF%27&VEC_TABLE=%272%27&OUT_UNITS=%27KM-S%27&CSV_FORMAT=%27YES%27&VEC_LABELS=%27NO%27';

export const GOES16_HORIZONS_QUERY = {
  format: 'json',
  command: '-141866',
  objData: 'NO',
  makeEphem: 'YES',
  ephemType: 'VECTORS',
  center: '500@399',
  tlist: '2461333.5',
  tlistType: 'JD',
  refPlane: 'FRAME',
  refSystem: 'ICRF',
  vecTable: '2',
  outUnits: 'KM-S',
  csvFormat: 'YES',
  vecLabels: 'NO',
} as const;

export const GOES16_HORIZONS_RESULT = `*******************************************************************************
Ephemeris / API_USER Tue Oct 20 01:10:43 2026 Pasadena, USA      / Horizons
*******************************************************************************
Target body name: GOES-16 (spacecraft) (-141866)  {source: GOES-16}
Center body name: Earth (399)                     {source: DE441}
Center-site name: BODY CENTER
*******************************************************************************
Start time      : A.D. 2026-Oct-20 00:00:00.0000 TDB
Stop  time      : A.D. 2026-Oct-20 00:00:00.0000 TDB
Step-size       : DISCRETE TIME-LIST
*******************************************************************************
Center geodetic : 0.0, 0.0, 0.0                   {E-lon(deg),Lat(deg),Alt(km)}
Center cylindric: 0.0, 0.0, 0.0                   {E-lon(deg),Dxy(km),Dz(km)}
Center radii    : 6378.137, 6378.137, 6356.752 km {Equator_a, b, pole_c}
Output units    : KM-S
Calendar mode   : Mixed Julian/Gregorian
Output type     : GEOMETRIC cartesian states
Output format   : 2 (position and velocity)
EOP file        : eop.261019.p270114
EOP coverage    : DATA-BASED 1962-JAN-20 TO 2026-OCT-19. PREDICTS-> 2027-JAN-13
Reference frame : ICRF
*******************************************************************************
            JDTDB,            Calendar Date (TDB),                      X,                      Y,                      Z,                     VX,                     VY,                     VZ,
**************************************************************************************************************************************************************************************************
$$SOE
2461333.500000000, A.D. 2026-Oct-20 00:00:00.0000,  9.603113140073136E+03, -4.104929701925249E+04, -1.708594080548074E+02,  2.994143623466347E+00,  7.001000064703707E-01, -3.991601822488292E-02,
$$EOE
**************************************************************************************************************************************************************************************************
`;
