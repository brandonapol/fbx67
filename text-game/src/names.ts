const ray = 'Ray'
const tolliver = `${ray} Tolliver` as const
const dottie = 'Dottie'
const hank = 'Hank'

export const N = {
  wade: 'Wade',
  eli: 'Eli',
  lucy: 'Lucy',
  owen: 'Owen Marsh',
  owenShort: 'Owen',
  curly: 'Curly Boone',
  curlyShort: 'Curly',
  jake: 'Jake Bueller',
  joan: 'Joan Halvorsen',
  ashby: 'Franklin Ashby',
  barnette: 'Investigator Vernon Barnette',
  cop: 'Officer Tom Peter',
  co: 'Major Dekker',
  councilman: `Councilman ${tolliver}`,
  tolliver,
  tolliverFirst: ray,
  bar: 'the Silver Pan',
  gossip: `${dottie} Vinson`,
  gossipShort: dottie,
  bartender: `${hank} Lyle`,
  bartenderShort: hank,
} as const
