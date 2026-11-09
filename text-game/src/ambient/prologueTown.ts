import type { Clock, Place, State } from '../types.ts'
import type { Ambient, Bit, Thread, Window } from './format.ts'
import { boughtRound } from '../story.ts'
import { N } from '../names.ts'

// The prologue's town (issue #45): the people Owen passes on 14 and 15 July 1967 and what they say. Written to the
// story rules: nobody states the land scheme, nobody says oil, and a person's honesty is something they do.
// Each person also carries a role, a want and a habit, for the writers and for the game's idle animation.

export type Townsperson = Ambient & Readonly<{ role: string; want: string; habit: string }>

const hank = N.bartender.split(' ')[0]
const mister = `Mr. ${N.owen.split(' ')[1]}`
const curly = N.curlyShort
const wade = N.wade

// Where and when. The bar is open around both talk scenes. A walk downtown plays while the story is already at the
// scene it walks to, so the night walk home is owensRoom at 00:30 and the morning walk to the river is floatDock
// at 07:30. `spot` tells the game which stretch of the walk (docs/town-map.md).
const win = (place: Place, from: Clock, to: Clock, spot?: string): Window => ({ place, from, to, ...(spot ? { spot } : {}) })
const bar = win('silverPan', '1967-07-14T22:30', '1967-07-15T01:00')
const nightWalk = (spot: string) => win('owensRoom', '1967-07-14T23:30', '1967-07-15T01:30', spot)
const morningWalk = (spot: string) => win('floatDock', '1967-07-15T06:00', '1967-07-15T09:00', spot)

const notYet = (s: State): boolean => !boughtRound(s)
const morning = (s: State): boolean => s.scene === 'p_dock'
const night = (s: State): boolean => !morning(s)

// A pool entry the person says alone.
const line = (id: string, text: string, when?: (s: State) => boolean): Bit => ({
  id,
  lines: [{ by: 'them', text }],
  ...(when ? { when } : {}),
})

// A short exchange with one reply Owen can give.
const talk = (id: string, texts: readonly string[], reply: string, answer: string, when?: (s: State) => boolean): Bit => ({
  id,
  lines: texts.map((text) => ({ by: 'them' as const, text })),
  reply: { label: reply, lines: [{ by: 'owen', text: reply }, { by: 'them', text: answer }] },
  ...(when ? { when } : {}),
})

const person = (p: Omit<Townsperson, 'kind'>): Townsperson => ({ kind: 'person', ...p })

export const prologueTown: readonly Townsperson[] = [
  // The Silver Pan, the night of 14 July.
  person({
    id: 'hank',
    name: N.bartender,
    role: 'bartender at the Silver Pan',
    want: 'to close at two with nothing broken and nobody bleeding',
    habit: 'wipes the bar where it is already dry, and watches the door',
    at: [bar],
    lines: {
      greet: [line('evening', `Evening, ${mister}. Same?`)],
      talk: [
        talk('kid', ["Kid with the guitar's been in three nights running.", 'Plays better when nobody listens.'], "Then don't listen.", "That's the whole trick of this job."),
        line('remember', 'People remember who bought the round. They remember who didn\'t a lot longer.', boughtRound),
      ],
      'askAbout:curly': [line('curly', `${curly} pays his tab. Fights on paydays. I keep him down the end where the glasses are cheap.`)],
      'askAbout:weather': [line('weather', "Sun don't go down, so nobody goes home. Good for business.")],
      bark: [line('lastCall', "Last call's when I say it is, and I haven't said it.")],
      'react:bump': [line('bump', "Easy. That one's paid for.")],
    },
  }),
  person({
    id: 'nightBartender',
    name: 'the second bartender',
    role: 'the second bartender, on since ten',
    want: 'enough in tips to fly his girl up from Anchorage',
    habit: 'counts the till under his breath',
    at: [bar],
    lines: {
      greet: [line('what', "What'll it be?")],
      bark: [
        line('beer', "Rainier, Oly or Lucky. Don't ask me for anything with a cherry in it.", notYet),
        line('house', "Half of them don't know your name, mister. Tonight they don't care.", boughtRound),
      ],
      talk: [talk('quake', ['Came up from Anchorage after the quake.', "My uncle's bar went down into Fourth Avenue. Stools and all."], 'Sorry to hear it.', 'He opened another one. Same stools.')],
      'askAbout:weather': [line('weather', 'Rains every afternoon and quits by supper. Funny kind of summer.')],
    },
  }),
  person({
    id: 'airmanJukebox',
    name: 'the airman at the jukebox',
    role: `an Eielson airman from ${wade}'s barracks`,
    want: 'one song on that jukebox nobody else picks',
    habit: 'feeds the jukebox dimes and plays the same record',
    at: [bar],
    lines: {
      greet: [line('sir', 'Evening, sir.')],
      talk: [
        talk('barracks', [`You with ${wade}? He's in my barracks.`, 'Plays that guitar after lights out. Sarge pretends to be asleep.'], 'Is he any good?', "No. Nobody's had the heart to tell him.", notYet),
        line('play', `You bought ${wade} a beer. Now he'll play till ${hank} throws him out.`, boughtRound),
      ],
      'askAbout:weather': [line('weather', "It's a hundred and four back home. I wrote my mother it's snowing here. She believed me.")],
      bark: [line('polka', "Who keeps playing the polka? That's my dime next.")],
      'react:stare': [line('stare', 'Something on my face, mister?')],
    },
  }),
  person({
    id: 'airmanCounter',
    name: 'the airman at the end of the bar',
    role: 'an Eielson airman who counts munitions stock',
    want: 'a count that comes out the same twice',
    habit: "tallies figures on a napkin with a carpenter's pencil",
    at: [bar],
    lines: {
      greet: [line('sir', 'Sir.')],
      talk: [talk('numbers', ['You a surveyor, sir? Then you know.', 'Numbers are supposed to come out the same twice.'], 'They usually do.', 'Usually.')],
      'askAbout:survey': [line('stakes', "My uncle ran section lines in Kansas. Said stakes walk if you don't watch them.")],
      bark: [line('count', 'Third time. Same number. Wrong number.')],
      'react:bump': [line('bump', 'Watch the napkin.')],
    },
  }),
  person({
    id: 'airmanPool',
    name: 'the airman at the pool table',
    role: 'an Eielson airman',
    want: 'to win his ten dollars back before the last cab to base',
    habit: 'chalks his cue between every shot',
    at: [bar],
    lines: {
      greet: [line('shoot', 'You shoot, mister?')],
      bark: [line('rack', "Rack 'em. I ain't done losing.")],
      'askAbout:curly': [line('lefty', `${curly}? Took twenty off me at this table. Shoots lefty. Throws your eye off.`)],
      talk: [line('thanks', "Thanks for the beer, mister. Now I'll lose slower.", boughtRound)],
      'react:run': [line('run', 'Fire somewhere?')],
    },
  }),
  person({
    id: 'pilotGray',
    name: 'the gray-haired bush pilot',
    role: 'a bush pilot off Phillips Field, thirty years in the country',
    want: 'one more summer of charters before his eyes go',
    habit: 'flies every story with his hand flat over the table',
    at: [bar],
    lines: {
      greet: [line('still', `Surveyor. You still letting ${curly} fly you?`)],
      'askAbout:curly': [line('hands', `Best hands on Phillips Field. Writes nothing down, and he don't like you reading his logbook.`)],
      'askAbout:weather': [line('wind', "Ceilings are fine. It's the wind off the Tanana that eats you.")],
      talk: [talk('buried', ["I've buried better pilots than me.", 'Not one of them was careless.'], 'Then what were they?', 'Hurried.')],
      bark: [line('toast', "Here's to the man who pays. Rarer than a dry August.", boughtRound)],
    },
  }),
  person({
    id: 'pilotYoung',
    name: 'the young bush pilot',
    role: 'a bush pilot two seasons in',
    want: 'his own airplane, paid off',
    habit: 'reads a creased sectional chart at the table',
    at: [bar],
    lines: {
      greet: [line('hey', 'Hey.')],
      'askAbout:curly': [line('mag', `${curly} fixed my mag in an hour when nobody else would. Cash. Didn't ask what I was hauling.`)],
      'askAbout:survey': [line('flagging', 'Saw your stakes from the air. Orange flagging, like somebody spilled matches on the river.')],
      bark: [line('chart', "Anybody got a chart of the Tolovana that ain't from 1950?")],
      'react:bump': [line('bump', "Careful, that's my chart.")],
    },
  }),
  person({
    id: 'miner',
    name: 'the old placer miner',
    role: 'a placer miner down from his claim on Cleary Creek',
    want: 'one more season sluicing before his knees quit',
    habit: 'taps a pill bottle of gold flakes on the bar to hear it',
    at: [bar],
    lines: {
      greet: [line('rockhound', 'Rockhound. Sit down.')],
      'askAbout:survey': [line('gravel', "Gravel's gravel till somebody wants it. Then it's worth what the other fella can't pay.")],
      'askAbout:landOffice': [line('glassEye', 'Filed my claim in thirty-eight. Clerk had a glass eye. Saw more than the ones with two.')],
      talk: [talk('bottle', ['Forty years in that creek.', 'Enough gold to fill this bottle. Enough rheumatism to fill a barrel.'], 'Worth it?', "Ask me when I'm done.")],
      bark: [line('dredges', 'Dredges took the easy gold. Left the rest of us the kind you dig.')],
    },
  }),
  person({
    id: 'reporter',
    name: 'the reporter from the News-Miner',
    role: 'a reporter for the Fairbanks Daily News-Miner',
    want: 'a story bigger than the Centennial',
    habit: 'writes notes on the backs of matchbooks',
    at: [bar, morningWalk('cushman')],
    lines: {
      greet: [
        line('inch', `${mister}. Anything up north worth an inch of column?`, night),
        line('slept', `Morning, ${mister}. You look like you slept in the Silver Pan.`, morning),
      ],
      'askAbout:survey': [line('gold', 'You find gold up there, you call me before you call your mother.')],
      talk: [talk('fire', ['Thirty inches on the Centennial today. Thirty more tomorrow.', "I'd give a week's pay for a good fire."], 'Careful what you wish for.', 'In this town it always comes. Never on deadline.')],
      'askAbout:landOffice': [line('plats', 'Land office is a dead beat. Plats and filing fees. Nobody reads a plat for fun.')],
    },
  }),
  person({
    id: 'foreman',
    name: 'the road foreman',
    role: 'a foreman on a state gravel road job north of town',
    want: 'twelve miles of gravel laid before freeze-up',
    habit: 'drinks standing up, boots still caked to the ankle',
    at: [bar, morningWalk('nlCafe')],
    lines: {
      greet: [line('silt', "You the gravel man? Find me some that ain't half silt.")],
      bark: [
        line('five', "State crew knocks off at five. Five! Sun's up till midnight and they knock off at five.", night),
        line('late', "Third cup. Crew's late. Again.", morning),
      ],
      talk: [talk('seattle', ['Twelve miles before freeze-up and a crew that thinks it lives in Seattle.', 'Half of them quit when the mosquitoes came.'], 'And the other half?', 'Quit on payday.')],
      'askAbout:weather': [line('cat', 'Ground so soft it swallows a cat to the tracks. Wait till freeze-up, my knee says.')],
      'askAbout:survey': [line('line', 'You draw a line on paper. Then I drive a cat through a muskeg on it.')],
    },
  }),

  // Second Avenue, the walk home.
  person({
    id: 'preacher',
    name: 'the preacher with the tracts',
    role: 'a street preacher on the bar row',
    want: 'one man out of the bars before the sun comes back up',
    habit: 'holds a tract out to everyone, even the ones who already said no',
    at: [nightWalk('secondAvenue')],
    lines: {
      greet: [line('light', 'Light never sets in July, brother. Think on what that means.')],
      bark: [line('close', "The bars close. The Lord doesn't.")],
      talk: [talk('february', ["Take one. You don't have to read it.", 'Most don\'t. It turns up in a coat pocket in February.'], 'Thank you.', "Don't thank me. Read it in February.")],
      'react:stare': [line('stare', "Look all you like. I've been looked at by better sinners.")],
      'askAbout:weather': [line('mud', "Rain's the Lord's business. The mud is ours.")],
    },
  }),
  person({
    id: 'cabbie',
    name: 'the cab driver',
    role: 'a cab driver idling outside the bars',
    want: 'one fare out to Eielson before the airmen spend it all',
    habit: 'leans on his hood and honks at nobody',
    at: [nightWalk('secondAvenue')],
    lines: {
      greet: [line('fare', 'Cab? Eielson is twelve dollars. College is four.')],
      bark: [line('last', 'Last car to the base! Anybody? Then I\'m the last car to nowhere.')],
      'askAbout:curly': [line('quarters', `${curly}? Drove him home twice. Tips in quarters, counted out on the seat.`)],
      'react:bump': [line('paint', "Mind the paint. It's the only part that's paid off.")],
    },
  }),
  person({
    id: 'touristHusband',
    name: 'the tourist with the camera',
    role: 'a retired tool-and-die man from Dayton, up the Alcan for the Centennial',
    want: 'one picture of the midnight sun that comes out',
    habit: 'squints at a light meter and shakes it',
    at: [nightWalk('secondAvenue'), morningWalk('cushman')],
    lines: {
      greet: [
        line('morning', 'Evening! Or is it morning? Nobody here will tell me.', night),
        line('sleep', 'Did the sun ever go down? I slept right through it.', morning),
      ],
      bark: [line('paper', "Half past twelve and I'm reading the paper. Look, dear. I'm reading the paper.", night)],
      'askAbout:weather': [line('alcan', 'Twelve hundred miles of gravel on the Alcan and it rained on every one.')],
      talk: [talk('pan', ['Saw the riverboat, the gold rush town, the whole works.', "Tomorrow I pan for gold. Fella says I'm guaranteed a flake."], 'You will be.', 'That\'s what he said. For two dollars.')],
    },
  }),
  person({
    id: 'touristWife',
    name: 'the tourist with the postcards',
    role: 'his wife',
    want: 'to get home with every postcard mailed',
    habit: "writes postcards standing up, on her husband's back",
    at: [nightWalk('secondAvenue'), morningWalk('cushman')],
    lines: {
      greet: [
        line('mailbox', 'Is there a mailbox open at this hour?', night),
        line('slot', "Do they take postcards at that slot? I've got seventeen.", morning),
      ],
      talk: [talk('postcards', ["Seventeen postcards, and I've said 'it's light out' sixteen ways."], 'Tell them about the mosquitoes.', 'I did. Twice. They think I exaggerate.')],
      'askAbout:landOffice': [line('swamp', 'Land? A man in Dayton tried to sell us a lot up here. Swamp, he said, but pretty.')],
      'react:stare': [line('hat', 'That man is staring at your hat, dear.')],
    },
  }),

  // The boarding house on Third.
  person({
    id: 'landlady',
    name: 'the landlady',
    role: `${N.owenShort}'s landlady at the boarding house`,
    want: 'rent on the first, and no cooking on the hot plates',
    habit: 'sits out on the porch with a sardine tin for her ashes',
    at: [nightWalk('boardingHouse porch'), morningWalk('boardingHouse porch')],
    lines: {
      greet: [
        line('late', `Late again, ${mister}. Friend of yours came by. Didn't leave a name.`, night),
        line('milk', "Coffee's on the stove. Don't take the last of the canned milk.", morning),
      ],
      talk: [talk('rocks', ["Two summers in that room and I still don't know what you do.", 'Something with rocks, the boarders say.'], 'Gravel, mostly.', "Gravel. Well. Somebody's got to.")],
      'askAbout:weather': [line('august', 'My husband used to say rain in July means water in August. He was wrong about most things.')],
      'askAbout:landOffice': [line('receipt', 'Land office? I paid this lot off in fifty-one. The receipt is in my Bible.')],
      'react:run': [line('stairs', 'No running on my stairs!')],
    },
  }),
  person({
    id: 'boarder',
    name: 'the boarder on the porch',
    role: 'an Alaska Railroad brakeman who rooms downstairs',
    want: 'eight hours of sleep in a town with no night',
    habit: 'tapes newspaper over his window, then comes out to smoke when it fails',
    at: [nightWalk('boardingHouse porch')],
    lines: {
      greet: [line('evening', 'Evening. Or whatever this is.')],
      bark: [line('foil', 'Newspaper, tinfoil, a wool blanket. Still light in there.')],
      'askAbout:weather': [line('nenana', 'Track was soft by Nenana all week. Three days of rain.')],
    },
  }),

  // Cushman Street and the café, the morning of 15 July.
  person({
    id: 'waitress',
    name: 'the breakfast waitress',
    role: 'the breakfast waitress at the Northern Lights Café',
    want: 'to finish her shift before the Centennial crowd wakes up',
    habit: 'carries the coffee pot everywhere, even out the door',
    at: [morningWalk('nlCafe')],
    lines: {
      greet: [line('coffee', 'Morning, hon. Coffee? It pours just as good out here.')],
      bark: [line('order', 'Two over easy, reindeer sausage, and where is my toast?')],
      talk: [talk('tip', [`You're the one goes up in ${curly}'s plane.`, 'He eats here. Ham and eggs. Never the same tip twice.'], 'Is that bad?', `Not bad. Just ${curly}.`)],
      'askAbout:weather': [line('wash', "Clouding up. Hang your wash today or don't hang it this week.")],
      'react:bump': [line('pot', 'Hot pot, hon! Hot pot!')],
    },
  }),
  person({
    id: 'cook',
    name: 'the cook',
    role: 'the cook at the Northern Lights, seen through the door',
    want: 'a dishwasher who shows up two days running',
    habit: 'sings to the grill',
    at: [morningWalk('nlCafe')],
    lines: {
      greet: [line('door', 'Grill is hot. Come in or close the door.')],
      bark: [line('up', "Order up! Who's got table four? Nobody? Then it's mine.")],
      'askAbout:weather': [line('windows', 'Weather is for people with windows.')],
    },
  }),
  person({
    id: 'landClerk',
    name: 'the clerk from the land office',
    role: 'a land-office clerk on her coffee before opening',
    want: 'a filing cabinet that shuts',
    habit: 'reads the morning paper folded to the legal notices',
    at: [morningWalk('nlCafe')],
    lines: {
      greet: [line('plats', 'Morning. You\'re the survey man. Your plats live on my counter half the week.')],
      'askAbout:landOffice': [line('ask', 'I pull the plats, I file the plats. What people do with them is their business.')],
      talk: [talk('five', ['Do you know how many people in this town can read a section map?', 'Five. Two are lawyers and one drinks.'], 'And the other two?', 'Work my counter. One of them is me.')],
      'askAbout:survey': [line('whose', "Your crew flags the river and tourists ask me if it's a gold strike. I say it's on file.")],
      bark: [line('eight', "Eight o'clock. If I'm on time again they'll start to expect it.")],
    },
  }),
  person({
    id: 'paperKid',
    name: 'the paper boy',
    role: 'a kid selling the News-Miner on Cushman',
    want: 'to sell the last ten and spend it at the Centennial',
    habit: "shouts the headline before he's read it",
    at: [morningWalk('cushman')],
    lines: {
      bark: [line('headline', 'News-Miner! Centennial crowds! Get your paper!')],
      greet: [line('dime', 'Paper, mister? Dime.')],
      talk: [talk('ten', ['Ten more and I\'m done.', "Then I'm riding out to the Centennial to see the gold rush town."], "I'll take one.", 'Thanks, mister! Nine more!')],
      'askAbout:weather': [line('heads', 'Rain is good. People buy papers to hold over their heads.')],
      'react:run': [line('drop', 'Hey! You drop something?')],
    },
  }),

  // First Avenue, at the foot of the bridge to St. Joseph's.
  person({
    id: 'mother',
    name: 'the woman with the coffee can',
    role: 'a Lower Tanana woman from Nenana, in town to see her mother at St. Joseph\'s',
    want: 'to be at the hospital when visiting opens, and home before the fish wheel fills',
    habit: 'carries a coffee can of dried fish for her mother, wrapped in a dish towel',
    at: [morningWalk('firstAvenue')],
    lines: {
      greet: [line('morning', 'Morning.')],
      talk: [talk('hip', ["My mother's across the river at St. Joseph's. Her hip.", 'She wants to be at fish camp. The sisters want her in bed. The sisters are winning.'], 'I hope she mends quick.', 'She will. She has fish to cut.')],
      'askAbout:survey': [line('pipe', 'Surveyors drove a pipe in the ground by our smokehouse two summers back. Nobody asked. It\'s still there.')],
      'askAbout:landOffice': [line('lost', 'My uncle filed for his allotment before the war. They said it was lost. He filed again. Lost again.')],
      bark: [line('close', "Stay close. This isn't Nenana.")],
    },
  }),
  person({
    id: 'father',
    name: 'the man with the shear pin',
    role: 'her husband',
    want: 'a shear pin and a spark plug for his kicker from the N.C. before the train home',
    habit: 'turns a broken shear pin over in his fingers',
    at: [morningWalk('firstAvenue')],
    lines: {
      greet: [line('hey', 'Hey.')],
      'askAbout:weather': [line('wheel', "River's high for July. Fish don't mind. The wheel does.")],
      talk: [talk('paddle', ['N.C. has the shear pins I need, if they open on time.', 'Kicker threw one in the slough. We paddled the last mile.'], "That's a long mile.", 'Every mile is, paddling.')],
      'askAbout:curly': [line('plane', "Don't know him. Plane men all look the same from the river.")],
    },
  }),
  person({
    id: 'daughter',
    name: 'the girl with the Centennial poster',
    role: 'their daughter, about twelve',
    want: 'to see the Centennial before the train',
    habit: 'reads the Centennial poster on every pole they pass',
    at: [morningWalk('firstAvenue')],
    lines: {
      greet: [line('hi', 'Hi.')],
      bark: [line('please', 'Can we go to the Centennial after? Just to look? Please?')],
      'askAbout:weather': [line('care', "If it rains we can't go to the Centennial. That's the only reason I care.")],
      'react:stare': [line('what', 'What?')],
    },
  }),

  // The float dock on the Chena.
  person({
    id: 'dockHand',
    name: 'the dock hand',
    role: 'the dock hand at the float dock',
    want: 'every plane tied off and every line coiled before his lunch',
    habit: 'coils line while he talks and never looks at his hands',
    at: [morningWalk('floatDock')],
    lines: {
      greet: [line('pumping', `Morning, ${mister}. He's been pumping floats since six.`)],
      bark: [line('gangway', 'Watch the gangway. Dew makes it slick.')],
      'askAbout:curly': [line('ties', 'Ties his plane off like nobody ever showed him. Holds, though. I leave it be.')],
      'askAbout:weather': [line('fog', "Fog's off the river by eight. You'll have your ceiling.")],
      talk: [talk('inches', ["River's up four inches since Sunday.", "Doesn't mean anything. Probably."], 'Probably?', 'Ask me Sunday.')],
      'react:run': [line('float', "Easy. It floats. It don't hold still for you.")],
    },
  }),
  person({
    id: 'fisherman',
    name: 'the man fishing off the bank',
    role: 'a man after grayling off the bank, before work',
    want: 'one grayling for breakfast',
    habit: 'casts and reels without looking, talking the whole time',
    at: [morningWalk('floatDock')],
    lines: {
      greet: [line('shh', 'Shh. Morning. Shh.')],
      bark: [line('grayling', 'That was a grayling. That was a grayling right there.')],
      'askAbout:weather': [line('bite', "Fish bite before rain. They're biting.")],
    },
  }),
]

// Overheard while Owen lingers. Each plants something a later act pays off; none states the scheme.
export const prologueThreads: readonly Thread[] = [
  {
    id: 'gravelCash',
    at: bar,
    plants: 'Someone is paying new cash for gravel leases north of town and flying over the land without landing.',
    paysOff: 'Act 4: Breakup',
    lines: [
      { who: 'pilotGray', text: 'Fella at the Phillips Field counter, paying cash for gravel leases up north.' },
      { who: 'pilotYoung', text: 'Gravel? What does anybody want with gravel out there?' },
      { who: 'pilotGray', text: 'What I said. He paid me to fly him over it twice. Never wanted to land.' },
      { who: 'pilotYoung', text: 'Cash?' },
      { who: 'pilotGray', text: 'New bills. In order. Like he got them from the bank that morning.' },
      { who: 'pilotYoung', text: 'Nobody pays cash for gravel.' },
      { who: 'pilotGray', text: 'Somebody does.' },
    ],
  },
  {
    id: 'shortCount',
    at: bar,
    plants: 'The munitions count at Eielson keeps coming up short, and the sheet comes back initialed as if it were right.',
    paysOff: 'Act 3: Deep Winter',
    lines: [
      { who: 'airmanCounter', text: 'Counted the igloo again today. Third time.' },
      { who: 'airmanPool', text: 'And?' },
      { who: 'airmanCounter', text: "Same as Tuesday. Short. Then the sheet comes back down and it ain't." },
      { who: 'airmanPool', text: 'Somebody up the line initials it, it adds up. Sign it and go fishing.' },
      { who: 'airmanCounter', text: "I signed it. That's what bothers me." },
      { who: 'airmanPool', text: "Rack 'em." },
    ],
  },
  {
    id: 'whichRoom',
    at: nightWalk('boardingHouse porch'),
    plants: `A man who called himself ${N.owenShort}'s friend asked the landlady which room was his, and kept his cap down.`,
    paysOff: 'Act 3: Deep Winter',
    lines: [
      { who: 'landlady', text: 'Man came by after supper, asking which room was the geologist\'s.' },
      { who: 'boarder', text: 'You tell him?' },
      { who: 'landlady', text: "I don't give out rooms. He said he was a friend of his." },
      { who: 'boarder', text: "Then he'd know the room." },
      { who: 'landlady', text: 'That\'s what I said. He laughed. Talked slow, like he had all night. Kept his cap down.' },
      { who: 'boarder', text: 'Lock your door, then.' },
      { who: 'landlady', text: "I've never once locked that door." },
    ],
  },
]
