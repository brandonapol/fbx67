export const BUSES = ['ambience', 'sfx', 'voice', 'music'] as const

export type Bus = (typeof BUSES)[number]

export type Volumes = Readonly<Record<Bus, number>>

export const BUS_LABELS: Readonly<Record<Bus, string>> = {
  ambience: 'Ambience',
  sfx: 'Effects',
  voice: 'Voices',
  music: 'Music',
}

export const DEFAULT_VOLUMES: Volumes = { ambience: 0.8, sfx: 0.8, voice: 0.7, music: 0.6 }

export const DUCK = 0.3

export const DUCKED: readonly Bus[] = ['voice', 'music']

export const STORAGE_KEY = 'second-rush.volumes'

export const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

export const sliderGain = (v: number): number => clamp01(v) ** 2

export const COVER_FLOOR = 0.15

export const COVERED: Bus = 'voice'

export const coverGain = (cover: number): number => COVER_FLOOR + (1 - COVER_FLOOR) * (1 - clamp01(cover))

export const busGain = (volumes: Volumes, bus: Bus, ducked: boolean, cover = 0): number =>
  sliderGain(volumes[bus]) * (ducked && DUCKED.includes(bus) ? DUCK : 1) * (bus === COVERED ? coverGain(cover) : 1)

export const busGains = (volumes: Volumes, ducked: boolean, cover = 0): Volumes =>
  Object.fromEntries(BUSES.map((b) => [b, busGain(volumes, b, ducked, cover)])) as Volumes

export const withVolume = (volumes: Volumes, bus: Bus, v: number): Volumes => ({ ...volumes, [bus]: clamp01(v) })

const read = (raw: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export const parseVolumes = (raw: string | null | undefined): Volumes => {
  const saved = raw ? read(raw) : {}
  return Object.fromEntries(
    BUSES.map((b) => {
      const v = saved[b]
      return [b, typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : DEFAULT_VOLUMES[b]]
    }),
  ) as Volumes
}

export const serializeVolumes = (volumes: Volumes): string => JSON.stringify(volumes)

export const LIMITER = { threshold: -3, knee: 0, ratio: 20, attack: 0.003, release: 0.1 } as const
