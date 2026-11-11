// The smoke runs' wait for the game to load (#62): until the test probe is installed, or the loading screen says the
// load failed (frontEndView.ts), in which case the run fails with that message rather than at a timeout.

// Loading the cast under SwiftShader on a CI runner takes a few seconds; two minutes means it is stuck.
export const LOAD_MS = 120_000

type Handle = Readonly<{ jsonValue: () => Promise<unknown> }>
type Waits = Readonly<{ waitForFunction: (f: () => unknown, arg: null, opts: { timeout: number }) => Promise<Handle> }>

export const waitLoaded = async (page: Waits, timeout: number = LOAD_MS): Promise<void> => {
  const state = await page.waitForFunction(
    () => {
      if ((window as any).__prologue?.capture !== undefined) return 'ok'
      const failed = document.querySelector('#loading[data-failed]')
      return failed ? failed.textContent || 'the game failed to load' : false
    },
    null,
    { timeout },
  )
  const value = await state.jsonValue()
  if (value !== 'ok') throw new Error(String(value))
}
