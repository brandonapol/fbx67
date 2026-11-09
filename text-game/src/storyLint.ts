// The story rules a machine can check. One word list, shared by the scene lint (storyLint.test.ts) and the
// ambient-line lint (ambient/lint.ts).

// The oil rule: no oil rush until Prudhoe in Act 4. "oil" on its own ("oil-soaked rags") is fine.
export const OIL_PHRASES: readonly RegExp[] = [/\boil (rush|boom|strike|money)\b/i, /\bPrudhoe\b/i]

// Placeholder names come from names.ts. Whole words, case-sensitive, so "gray", "array" and "x-ray" pass.
// "Hank Williams" is a real singer, not the bartender.
export const PLACEHOLDERS: readonly RegExp[] = [
  /\bDekker\b/,
  /\bDottie\b/,
  /\bVinson\b/,
  /\bHank\b(?! Williams)/,
  /\bLyle\b/,
  /\bTom Peter\b/,
  /\bRay\b/,
]

export type Violation = { readonly line: number; readonly rule: 'oil' | 'name'; readonly match: string }

// Lint raw text line by line. `beforeAct4` turns on the oil rule.
export const lintText = (text: string, beforeAct4: boolean): readonly Violation[] =>
  text.split('\n').flatMap((line, i) => [
    ...(beforeAct4 ? OIL_PHRASES : []).flatMap((re) => hit(re, line, i, 'oil')),
    ...PLACEHOLDERS.flatMap((re) => hit(re, line, i, 'name')),
  ])

const hit = (re: RegExp, line: string, i: number, rule: Violation['rule']): readonly Violation[] => {
  const m = re.exec(line)
  return m ? [{ line: i + 1, rule, match: m[0] }] : []
}
