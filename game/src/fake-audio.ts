export type Scheduled = { t: number[]; nodes: number }

// A stand-in AudioContext for unit tests: it records every scheduled time and counts the nodes built.
export const fakeContext = (): { ctx: BaseAudioContext; times: Scheduled } => {
  const times: Scheduled = { t: [], nodes: 0 }
  const param = (): AudioParam => {
    const p = {
      value: 0,
      setValueAtTime: (v: number, t: number) => (times.t.push(v, t), p),
      linearRampToValueAtTime: (v: number, t: number) => (times.t.push(v, t), p),
      exponentialRampToValueAtTime: (v: number, t: number) => (times.t.push(v, t), p),
      setTargetAtTime: (v: number, t: number) => (times.t.push(v, t), p),
      cancelScheduledValues: () => p,
    }
    return p as unknown as AudioParam
  }
  const node = (): AudioNode => {
    times.nodes += 1
    const n: Record<string, unknown> = {
      connect: (d: AudioNode) => d,
      disconnect: () => undefined,
      start: (t = 0, o = 0) => void times.t.push(t, o),
      stop: (t = 0) => void times.t.push(t),
      gain: param(),
      frequency: param(),
      Q: param(),
      offset: param(),
      type: '',
      buffer: null,
      loop: false,
    }
    return n as unknown as AudioNode
  }
  const ctx = {
    currentTime: 1,
    sampleRate: 8000,
    createGain: node,
    createOscillator: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createBuffer: () => ({ copyToChannel: () => undefined }),
  }
  return { ctx: ctx as unknown as BaseAudioContext, times }
}
