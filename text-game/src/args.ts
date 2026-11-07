import { exit } from 'node:process'

export type Argv = readonly string[]

export const flag = (argv: Argv, name: string): boolean => argv.includes(name)

export const value = (argv: Argv, name: string): string | undefined => {
  const i = argv.indexOf(name)
  if (i < 0) return undefined
  const v = argv[i + 1]
  if (v === undefined || v.startsWith('--')) throw new Error(`${name} needs a value`)
  return v
}

export const int = (argv: Argv, name: string, fallback: number): number => {
  const v = value(argv, name)
  if (v === undefined) return fallback
  if (!/^-?\d+$/.test(v.trim())) throw new Error(`${name} must be an integer, got "${v}"`)
  return Number(v)
}

export const choicePath = (raw: string): readonly number[] =>
  raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      if (!/^\d+$/.test(x)) throw new Error(`--choices must be comma-separated choice numbers, got "${x}"`)
      return Number(x)
    })

export const orExit = async (main: () => unknown): Promise<void> => {
  try {
    await main()
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    exit(1)
  }
}
