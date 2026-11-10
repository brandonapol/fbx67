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
  /\bCurly Boone\b/, // N.curly
  /\bVernon Barnette\b/, // N.barnetteFull
]

// Wade's surname comes from N.wadeLast, and a short name from a key like N.gossipShort, never a split of a full name.
// Checked separately because ambient lines and some scene files still break these. TODO(#347): act2.ts, act3.ts,
// act4.ts, end.ts and ambient/winterTown.ts are claimed by other tasks; once they are fixed, fold this into
// PLACEHOLDERS and drop STRICT_DEFERRED in storyLint.test.ts.
export const STRICT: readonly RegExp[] = [/\bPruett\b/, /\.split\(' '\)/]

export type Violation = { readonly line: number; readonly rule: 'oil' | 'name'; readonly match: string }

// Lint raw text line by line. `beforeAct4` turns on the oil rule.
export const lintText = (
  text: string,
  beforeAct4: boolean,
  extra: readonly RegExp[] = [],
): readonly Violation[] =>
  text.split('\n').flatMap((line, i) => [
    ...(beforeAct4 ? OIL_PHRASES : []).flatMap((re) => hit(re, line, i, 'oil')),
    ...[...PLACEHOLDERS, ...extra].flatMap((re) => hit(re, line, i, 'name')),
  ])

const hit = (re: RegExp, line: string, i: number, rule: Violation['rule']): readonly Violation[] => {
  const m = re.exec(line)
  return m ? [{ line: i + 1, rule, match: m[0] }] : []
}
