import type { Page } from './browser.ts'

// What the smoke runs report when a step makes no progress: the step, how long it waited, the state it was stuck at,
// and where the player was (the front-end screen and what had focus), so a flaky stall shows its cause.
export type Stall = { what: string; seconds: number; at: string; screen?: string; focus?: string }

export const stallMessage = (s: Stall): string =>
  `${s.what}: nothing changed in ${s.seconds} s at ${s.at} (screen: ${s.screen ?? 'unknown'}, focus: ${s.focus ?? 'none'})`

// The screen the game is on and what has focus: the front end's screen, and the focused element's text.
export const stallContext = (p: Page): Promise<Pick<Stall, 'screen' | 'focus'>> =>
  p
    .evaluate(() => {
      const el = document.activeElement
      const text = el && el !== document.body ? (el.textContent ?? '').trim().slice(0, 60) : ''
      return {
        screen: (window as any).__frontEnd?.screen?.() as string | undefined,
        focus: el && el !== document.body ? `${el.tagName.toLowerCase()}${text ? ` "${text}"` : ''}` : undefined,
      }
    })
    .catch(() => ({}))
