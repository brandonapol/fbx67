import type { Clock } from '../../text-game/src/types.ts'

// Where the real sun stands over downtown Fairbanks at a story clock, after the NOAA solar position equations (Jean
// Meeus, "Astronomical Algorithms"), good to a fraction of a degree for 1967. Geometric: no refraction, which lifts
// the disc about half a degree at the horizon.

// Downtown Fairbanks, the coordinates of docs/fact-checks.md item 38.
export const FAIRBANKS = { lat: 64.84, lon: -147.72 } as const

// The story's clock is local time on Alaska-Hawaii Standard Time, UTC-10. Whether Fairbanks kept daylight saving in
// summer 1967 is open (docs/fact-checks.md item 38); one hour here is where that answer would land.
export const UTC_OFFSET = -10

export type SunPosition = Readonly<{ azimuth: number; elevation: number }>

const rad = Math.PI / 180

// Days from J2000.0 (2000-01-01 12:00 UTC) to a local clock.
const daysFromJ2000 = (clock: Clock): number => {
  const [date, time] = clock.split('T') as [string, string]
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const [h, min] = time.split(':').map(Number) as [number, number]
  return (Date.UTC(y, m - 1, d, h - UTC_OFFSET, min) - Date.UTC(2000, 0, 1, 12)) / 86400000
}

// Compass degrees: azimuth clockwise from north, elevation above the horizon.
export const sunAt = (clock: Clock, at: Readonly<{ lat: number; lon: number }> = FAIRBANKS): SunPosition => {
  const n = daysFromJ2000(clock)
  const t = n / 36525
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t)
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
  const c =
    Math.sin(m * rad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m * rad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m * rad) * 0.000289
  const omega = 125.04 - 1934.136 * t
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(omega * rad)
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  const eps = eps0 + 0.00256 * Math.cos(omega * rad)
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad))
  // The equation of time, in minutes.
  const y = Math.tan((eps / 2) * rad) ** 2
  const eot =
    (4 / rad) *
    (y * Math.sin(2 * l0 * rad) -
      2 * e * Math.sin(m * rad) +
      4 * e * y * Math.sin(m * rad) * Math.cos(2 * l0 * rad) -
      0.5 * y * y * Math.sin(4 * l0 * rad) -
      1.25 * e * e * Math.sin(2 * m * rad))
  const utcMinutes = ((((n + 0.5) % 1) + 1) % 1) * 1440
  const solarMinutes = utcMinutes + eot + 4 * at.lon
  const ha = (solarMinutes / 4 - 180) * rad
  const lat = at.lat * rad
  const sinEl = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha)
  const elevation = Math.asin(sinEl) / rad
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) / rad + 180
  return { azimuth: ((az % 360) + 360) % 360, elevation }
}
