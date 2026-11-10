const ray = 'Ray'
const tolliverLast = 'Tolliver'
const tolliver = `${ray} ${tolliverLast}` as const
const barnetteFull = 'Vernon Barnette'
const dottie = 'Dottie'
const hank = 'Hank'

export const N = {
  wade: 'Wade',
  wadeLast: 'Pruett',
  eli: 'Eli',
  lucy: 'Lucy',
  owen: 'Owen Marsh',
  owenShort: 'Owen',
  curly: 'Curly Boone',
  curlyShort: 'Curly',
  jake: 'Jake Bueller',
  joan: 'Joan Halvorsen',
  ashby: 'Franklin Ashby',
  barnette: `Investigator ${barnetteFull}`,
  barnetteFull,
  cop: 'Officer Tom Peter',
  co: 'Major Dekker',
  councilman: `Councilman ${tolliver}`,
  tolliver,
  tolliverFirst: ray,
  tolliverLast,
  bar: 'the Silver Pan',
  gossip: `${dottie} Vinson`,
  gossipShort: dottie,
  bartender: `${hank} Lyle`,
  bartenderShort: hank,
} as const
