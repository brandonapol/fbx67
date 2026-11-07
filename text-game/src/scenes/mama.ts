import type { State } from '../types.ts'

const opener = (s: State): string =>
  s.momHonesty >= 2
    ? 'Mama writes back fast, the way she does when something you told her scared her.'
    : s.momHonesty <= -2
      ? 'Mama writes back about the church bake sale and the weather. Near the end, as if she\'d been saving it:'
      : 'Mama writes back. She can tell you\'re leaving things out, and she says so, and then she says this:'

const wisdom = [
  '"Your granddaddy used to say a man is only as good as the people who\'ll stand up and vouch for him. Be the kind of man folks would vouch for, and make sure you have some."',
  '"When somebody hands you a secret, son, that\'s a loan, not a gift. You give it back exactly the way you got it."',
  '"Money that asks you to do nothing is the most expensive kind there is. Your daddy learned that the hard way."',
] as const

export const mamaReply = (n: 0 | 1 | 2) => (s: State): string => `${opener(s)}\n\n${wisdom[n]}`
