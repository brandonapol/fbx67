import type { Scene } from '../types.ts'
import { prologue } from './prologue.ts'
import { act1 } from './act1.ts'
import { act2 } from './act2.ts'
import { act3 } from './act3.ts'
import { act4 } from './act4.ts'
import { end } from './end.ts'

export const scenes: readonly Scene[] = [...prologue, ...act1, ...act2, ...act3, ...act4, ...end]
