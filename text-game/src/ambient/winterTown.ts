import type { Clock, Place, State } from '../types.ts'
import type { Weather } from '../story.ts'
import type { Window } from './format.ts'
import type { Townsperson } from './town.ts'
import { line, person, talker } from './town.ts'
import { clock, weather } from '../story.ts'
import { N } from '../names.ts'

// The town in freeze-up and deep winter (issue #108, split into #154 and #155): the people Wade passes from September
// 1967 to January 1968 and what they say. Freeze-up is the base (the duty desk, the photo-lab clerk with the long
// lunch, the barracks, the hangar), the hotel crowd waiting out the ground freezing, the café regulars, the Silver Pan
// and the bush strip. Deep winter is St. Joseph's, its parking lot at forty below, and the café again. Who stayed is
// here; who left (the Dayton couple, the road foreman, the summer girl) is something the stayers mention.
//
// Some lines turn on moral weather (`weather(state)`): they describe the sky and the cold, never the reason for it.
// Nobody tells Wade where he stands (only the café gossip does that), nobody states the land scheme, nobody plants a
// clue, and nobody says oil. Two lines touch Eli and Lucy, and are for the consultants' review like the flood town's:
// the deckhand on Eli riding the last barge down to Minto before the ice, and the land-office clerk on Lucy at the plat.

const eli = N.eli
const lucy = N.lucy
const hank = N.bartenderShort
const wade = N.wade
const owen = N.owenShort

// Where and when, one window per stretch of story clock (src/scenes/act2.ts, act3.ts). The café holds both Act 2 gossip
// visits (24 October, 30 November) in one window, and deep winter's (28 December) in another. Nothing is placed in the
// Major's office at night, the squadron building's duty desk at midnight, Lucy's kitchen or out on the hill.
const win = (place: Place, from: Clock, to: Clock, spot?: string): Window => ({ place, from, to, ...(spot ? { spot } : {}) })
const orderlyRoom = win('majorsOffice', '1967-09-12T08:00', '1967-09-12T09:00', 'orderlyRoom')
const lab = win('photoLab', '1967-09-14T11:00', '1967-09-14T11:45')
const barracks = win('eielsonBarracks', '1967-10-28T06:00', '1967-11-25T22:00')
const hangar = win('baseHangar', '1967-11-17T10:00', '1967-11-17T12:00')
const hotel = win('hotelBar', '1967-10-07T20:00', '1967-10-07T23:00')
const strip = win('bushStrip', '1967-11-08T12:00', '1967-11-08T14:00')
const pan = win('silverPan', '1967-11-11T18:00', '1967-11-18T20:00')
const fallCafe = win('nlCafe', '1967-10-24T18:00', '1967-11-30T15:00', 'secondAvenue')
const winterCafe = win('nlCafe', '1967-12-28T07:00', '1967-12-28T09:00', 'secondAvenue')
const ward = win('hospital', '1967-12-13T20:00', '1968-01-03T13:00')
const lot = win('hospitalLot', '1967-12-26T15:00', '1967-12-26T16:00')

// Moral weather, as the townspeople feel it: long pink light, blue hour under the streetlights, or ice fog at night.
const sky = (w: Weather) => (s: State): boolean => weather(s) === w
// The barracks is played in late October and again on 25 November.
const october = (s: State): boolean => (clock(s) ?? '') < '1967-11'
const november = (s: State): boolean => !october(s)

const talk = talker('wade')

export const winterTown: readonly Townsperson[] = [
  // The base in freeze-up.
  person({
    id: 'dutyClerk',
    name: 'the clerk at the duty desk',
    role: 'the staff sergeant on the orderly-room desk outside the Major\'s office',
    want: 'one morning report with no typos in it',
    habit: 'types with two fingers and holds a pencil in his teeth for the third',
    at: [orderlyRoom],
    lines: {
      greet: [line('boots', 'Pruett. He\'s expecting you. Wipe your boots, the floor got waxed Friday.')],
      talk: [talk('mood', ['The Major\'s in a good mood. New brochure came in the mail.', 'When he\'s in a good mood, I type slower.'], 'Why slower?', 'So nothing I hand him gives him a reason not to be.')],
      bark: [line('report', 'Morning report, morning report. Who has a Q in his name? Nobody? Good.')],
      'askAbout:weather': [line('puddles', 'Ice in the puddles this morning. The sergeant major calls that the polite part of the year.')],
      'react:stare': [line('stare', 'Two fingers, airman. Fast enough for the Air Force.')],
    },
  }),
  person({
    id: 'labClerk',
    name: 'the photo-lab clerk',
    role: 'the airman at the counter of the base photo lab',
    want: 'a lunch at the club that lasts as long as the pie does',
    habit: 'eats a sandwich at the counter before lunch, to hold him over',
    at: [lab],
    lines: {
      greet: [line('form', 'You want prints, there\'s a form. You want them this week, there\'s no form for that.')],
      talk: [talk('meatloaf', ['Thursday is meatloaf at the club.', 'I take my time with meatloaf. Meatloaf deserves it.'], 'It\'s Thursday.', 'Is it? Then I\'m already late.')],
      bark: [line('fixer', 'Smell that? Fixer. You stop smelling it in a month. Then your wife smells it on you.')],
      'askAbout:weather': [line('dark', 'Weather? I work in a darkroom. Come tell me when it\'s spring.')],
    },
  }),
  person({
    id: 'airmanBunk',
    name: 'the airman from your barracks',
    role: `an Eielson airman two bunks down from ${wade}, from the sandbag line in August`,
    want: 'a pair of mukluks before his feet find out what January is',
    habit: 'kicks the radiator every time it knocks',
    at: [barracks],
    lines: {
      greet: [line('feet', 'Morning, Texas. Your feet warm? Give it a month.')],
      talk: [talk('socks', ['First snow, you went out in your socks to touch it. I saw you.', 'In your socks, Texas. In October.'], 'I\'d never seen it before.', 'Now you\'ve seen it. Now wear boots.')],
      bark: [line('radiator', 'Radiator\'s knocking again. Somebody kick it. Not that hard.')],
      'askAbout:weather': [
        line('pink', 'Sky over the flight line went pink at three in the afternoon. Three, Texas. Then it stayed pink.', sky('clear')),
        line('blue', 'Dark by four now. I eat chow and it\'s night, and the streetlights look blue on the snow.', sky('dusk')),
        line('fog', 'Ice fog on the flight line. You can\'t see a wingtip from the nose. Sodium lights just make it orange.', sky('night')),
      ],
      'react:bump': [line('shirt', 'Easy. That\'s my last clean shirt till Thursday.')],
    },
  }),
  person({
    id: 'airmanJersey',
    name: 'the airman writing home',
    role: 'an Eielson airman from New Jersey, from the sandbag line in August, who writes his girl every night',
    want: 'a letter back that says more than "it sounds cold"',
    habit: 'licks the pencil and counts words on his fingers',
    at: [barracks],
    lines: {
      greet: [line('spell', 'Texas. How do you spell "temperature"? Never mind, I\'ll say cold.')],
      talk: [talk('ten', ['I told my girl it was ten below.', 'It was ten above. She doesn\'t know the difference.'], 'It\'ll be ten below soon enough.', 'Then I\'ll tell her forty. Gotta stay ahead.')],
      bark: [line('lights', 'Lights out in ten! Somebody tell the guy with the guitar. Not you. Okay, you.')],
      'askAbout:weather': [line('sun', 'Sun comes up at nine and gives up by four. In Jersey we call that a bad mood.', november)],
    },
  }),
  person({
    id: 'shortTimer',
    name: 'the short-timer',
    role: 'an Eielson airman with his last weeks on the calendar taped inside his locker',
    want: 'to be home for Christmas and never see this calendar again',
    habit: 'crosses off the day with a grease pencil before he does anything else',
    at: [barracks],
    lines: {
      greet: [
        line('fiftyone', 'Fifty-one days, Texas. Ask me tomorrow. It\'ll be fifty.', october),
        line('twentytwo', 'Twenty-two days. Twenty-two. I could spit that far.', november),
      ],
      talk: [talk('peach', ['Weather\'s your problem now. I\'ll be in Fresno.', 'Eating a peach. On a porch. In my shirtsleeves.'], 'Send me a peach.', 'It\'d freeze in the mailbag. That\'s how far gone this place is.')],
      bark: [line('pencil', 'Who took my grease pencil? I need it. It\'s a matter of morale.')],
    },
  }),
  person({
    id: 'crewChief',
    name: 'the crew chief with the heater',
    role: 'a crew chief in the base hangar, running a heater hose into a cold engine',
    want: 'one engine this winter that starts the first time',
    habit: 'talks to the heater the way his grandfather talked to mules',
    at: [hangar],
    lines: {
      greet: [line('door', 'Shut that door! Were you raised in a barn or a hangar?')],
      talk: [talk('honey', ['Below twenty the grease goes like honey. Below forty it goes like tar.', 'So we cook the engine before we start it.'], 'Like a fire under a truck?', 'Like that. With the extinguisher close.')],
      bark: [line('light', 'Come on, girl. Light. Light, you yellow tub.')],
      'askAbout:weather': [line('fifteen', 'Fifteen below this morning. Ask me in January and I\'ll laugh at fifteen.')],
    },
  }),

  // The hotel bar downtown, the night Wade plays the corner.
  person({
    id: 'hotelBartender',
    name: 'the hotel bartender',
    role: 'the bartender at the hotel downtown, who doesn\'t care where the guitar plays',
    want: 'a full room until close and nobody fighting in it',
    habit: 'polishes the same glass while he listens',
    at: [hotel],
    lines: {
      greet: [line('play', 'Play what you like, soldier. Just don\'t stop.')],
      talk: [talk('outside', ['Every fall, same thing. Men from Outside sit here till the ground freezes.', 'Then they fly home and I get my stools back.'], 'Who stays?', 'Me. And whoever couldn\'t get a seat south.')],
      bark: [line('tab', 'Two more for the professors. Put it on the university.')],
      'askAbout:weather': [line('stays', 'Real snow\'s coming. Not the dusting. The one that stays till May.')],
    },
  }),
  person({
    id: 'hotelWaitress',
    name: 'the waitress who calls everybody dear',
    role: 'the cocktail waitress at the hotel bar',
    want: 'cash tips now, before the town goes quiet for the winter',
    habit: 'calls every man in the room dear, and remembers what each of them drinks',
    at: [hotel],
    lines: {
      greet: [line('corner', 'Evening, dear. The corner\'s yours.')],
      talk: [talk('release', ['You play "Release Me," dear, and I\'ll tip you myself.', 'I know. Everybody\'s sick of it. I\'m not.'], 'I\'ll play it twice.', 'Once, dear. Don\'t push your luck.')],
      bark: [line('mop', 'Wipe your boots, dear. I mopped that once tonight already.')],
      'react:bump': [line('tray', 'Steady, dear. That\'s three highballs and a hot cocoa.')],
    },
  }),
  person({
    id: 'professorWhite',
    name: 'the professor with the white pieces',
    role: 'a history professor from the university on the hill, at the chessboard',
    want: 'to beat his colleague once before Christmas',
    habit: 'narrates his moves under his breath and takes them back',
    at: [hotel],
    lines: {
      greet: [line('music', 'Ah. Music. Something without words, if you please. I\'m thinking.')],
      talk: [talk('fast', ['He moves fast and wins. I move slowly and lose.', 'We have been doing this every Saturday since 1959.'], 'Ever try moving fast?', 'Every Saturday. Then I sit down.')],
      bark: [line('knight', 'Knight to... no. No. Don\'t touch it, Harold. I hadn\'t let go.')],
    },
  }),
  person({
    id: 'professorBlack',
    name: 'the professor with the black pieces',
    role: 'an aurora man from the university\'s Geophysical Institute, winning at chess',
    want: 'a clear night and a camera that doesn\'t freeze',
    habit: 'looks at the window every few minutes, even with the blinds down',
    at: [hotel],
    lines: {
      greet: [line('evening', 'Good evening. You play well. Harold, your move. It has been your move since August.')],
      bark: [line('check', 'Check. Harold, check. You can stop humming now.')],
      'askAbout:weather': [line('aurora', 'Aurora was good Tuesday. Half the town looked up. The other half was in here.')],
    },
  }),
  person({
    id: 'contractor',
    name: 'the contractor from Seattle',
    role: 'a building contractor up from Seattle, pouring footings for the flood rebuilding',
    want: 'his crew paid and himself on a plane before the cold comes down',
    habit: 'draws floor plans on cocktail napkins and leaves them for the waitress',
    at: [hotel],
    lines: {
      greet: [line('wildwood', 'Kid, you know "Wildwood Flower"? My wife plays it. Badly. I miss it.')],
      talk: [talk('footings', ['The flood is building half this town over.', 'I poured more footings since August than in five years in Seattle.'], 'You staying the winter?', 'Not on your life. I\'m on Wednesday\'s flight.')],
      bark: [line('concrete', 'Concrete won\'t cure in the cold. I\'ve got half a gym and no walls till April.')],
      'askAbout:weather': [line('fifty', 'They tell me fifty below. I\'ll read about it in the paper, in Seattle.')],
    },
  }),

  // The bush strip, floats coming off.
  person({
    id: 'pilotYoung',
    name: 'the young bush pilot',
    role: 'a bush pilot two seasons in, taking his plane off floats and putting it on skis',
    want: 'to fly again before Thanksgiving',
    habit: 'kicks the skis like a man kicks tires',
    at: [strip],
    lines: {
      greet: [line('float', 'Mind the float. It\'s coming off whether I\'m ready or not.')],
      talk: [talk('sitting', ['Floats off, skis on, and nothing I\'ve got flies till the ice holds.', 'Three weeks of sitting. I\'d rather be cold up there.'], 'Sounds restful.', 'Ask me again in week two.')],
      bark: [line('wrench', 'Somebody hand me the big wrench. No. The bigger one.')],
      'askAbout:weather': [line('pancake', 'River\'s running slush. Pancake ice, the old-timers call it. Sounds like cereal.')],
    },
  }),

  // The Silver Pan in November.
  person({
    id: 'miner',
    name: 'the old placer miner',
    role: 'the placer miner from Cleary Creek, in town for the winter now his sluice box is frozen',
    want: 'a warm stool until the creek runs again in May',
    habit: 'pays for every drink in exact change out of a tobacco pouch',
    at: [pan],
    lines: {
      greet: [line('sluice', 'Sluice box froze solid the first of October. So here I am till May.')],
      talk: [talk('arizona', ['Every winter I swear I\'ll go to Arizona.', 'Every winter I sit right here.'], 'What stops you?', 'Been once. All sky and no weather. How\'s a man to know what month it is?')],
      bark: [line('stove', `${hank}! Either the stove is out of wood or I'm out of whiskey. One of the two.`)],
      'askAbout:weather': [line('soft', 'Thirty below at the creek last week. Twenty here. Town makes a man soft.')],
    },
  }),
  person({
    id: 'barflyRiver',
    name: 'the man at the stove',
    role: 'the riverboat deckhand off the Chena, on the beach now the river is ice',
    want: 'to get through to breakup without spending it all',
    habit: 'turns his hands over the stove like meat on a spit',
    at: [pan],
    lines: {
      greet: [line('door', 'Shut the door, airman. That stove is going, and it\'s mine.')],
      talk: [
        talk('white', ['River went white last week. The boat\'s pulled up on the bank.', 'Nothing to do now till breakup but this.'], 'What about work?', 'Cut wood. Haul water. Get fat. Same as every year.'),
        line('minto', `${eli} rode the last barge down to Minto before the ice. Said he had people to sit with, and didn't say more.`),
      ],
      bark: [line('jukebox', 'Somebody tell that jukebox it\'s November.')],
    },
  }),

  // The café regulars in freeze-up, at supper on 24 October and at lunch on 30 November.
  person({
    id: 'cook',
    name: 'the cook',
    role: 'the cook at the Northern Lights, seen through the kitchen door',
    want: 'the stove back where it was before the flood, which it never will be',
    habit: 'sings with the radio half a beat behind it',
    at: [fallCafe],
    lines: {
      greet: [line('special', 'Moose stew. That\'s the special. That\'s also the menu.')],
      talk: [talk('moose', ['Moose came in Saturday. Somebody\'s cousin.', 'So it\'s moose stew till Christmas.'], 'I like moose.', 'Ask me how you feel in February.')],
      bark: [line('postcard', 'That Dayton couple sent a postcard. Home safe. Say they miss the mosquitoes. Liars.')],
      'askAbout:weather': [line('grill', 'Grill\'s the warmest spot in town. Folks order eggs just to stand near it.')],
    },
  }),
  person({
    id: 'landClerk',
    name: 'the clerk from the land office',
    role: `the land-office clerk who works the counter with ${lucy}, on her supper break`,
    want: 'the office dry again and the ledgers back where they go',
    habit: 'reads the paper backward, from the want ads in',
    at: [fallCafe],
    lines: {
      greet: [line('notHere', `Airman. ${lucy} isn't here, if that's who you're looking for.`)],
      talk: [talk('plat', [`${lucy} can find a quarter-section on the plat faster than the map man.`, 'He doesn\'t like it. She doesn\'t care.'], 'Sounds like her.', 'Doesn\'t it.')],
      'askAbout:landOffice': [line('radiators', 'The flood ledgers are still drying on the radiators. The office smells like a wet dog.')],
      bark: [line('summer', 'The summer girl went back to classes. Now I do two counters and she writes me letters about Kant.')],
    },
  }),
  person({
    id: 'pilotGray',
    name: 'the gray-haired bush pilot',
    role: 'the bush pilot off Phillips Field, grounded by freeze-up',
    want: 'eight inches of lake ice and somewhere to go',
    habit: 'measures everything with his thumb, ice included',
    at: [fallCafe],
    lines: {
      greet: [line('sit', 'Sit, airman. Nobody\'s flying, so everybody\'s here.')],
      talk: [talk('foreman', ['That road foreman went back to Spokane till spring.', 'Said he\'d see me at breakup. They all say that.'], 'Do they come back?', 'The ones who owe money do.')],
      'askAbout:weather': [line('inches', 'Lake ice has to be eight inches for my skis. It\'s four. So I drink coffee.')],
      'react:stare': [line('stare', 'Thirty years in the country, son. The face comes with it.')],
    },
  }),

  // The café in deep winter, 28 December, before light.
  person({
    id: 'waitress',
    name: 'the breakfast waitress',
    role: 'the breakfast waitress at the Northern Lights Café, on the early shift',
    want: 'to keep pouring until somebody tells her to stop',
    habit: 'warms her hands on the coffee pot between tables',
    at: [winterCafe],
    lines: {
      greet: [line('ask', 'Coffee, hon. It\'s forty below. You don\'t have to ask.')],
      'askAbout:weather': [
        line('ham', 'Look at that sky over the hill. Pink as a ham. Won\'t last past noon.', sky('clear')),
        line('supper', 'Streetlights came on at two yesterday. I\'m about ready to serve supper at lunch.', sky('dusk')),
        line('fog', 'Ice fog so thick this morning I walked right past my own café.', sky('night')),
      ],
      'react:bump': [line('pot', 'Hot pot, hon! Mind the arm.')],
    },
  }),
  person({
    id: 'landlady',
    name: 'the landlady',
    role: `the landlady from the boarding house on Third, where ${owen} roomed, in for the heat`,
    want: 'a furnace man who answers his telephone',
    habit: 'keeps her coat on and her purse on her lap',
    at: [winterCafe],
    lines: {
      greet: [line('furnace', 'Furnace quit Christmas Eve. I\'m here for the warm. I\'ll pay for the coffee.')],
      talk: [talk('room', [`I let ${owen}'s room to a schoolteacher.`, 'She pays on time and never goes out in the rain.'], 'He\'d have liked that.', 'He\'d have liked my coffee better. They all do.')],
      'askAbout:weather': [line('fact', 'Forty-one below on my porch. My husband used to say thirty is weather and forty is a fact.')],
    },
  }),
  person({
    id: 'reporter',
    name: 'the reporter from the News-Miner',
    role: 'a reporter for the Fairbanks Daily News-Miner, writing the cold story',
    want: 'one new way to say cold before the paper wants another one',
    habit: 'writes notes on the backs of matchbooks and keeps them in his hatband',
    at: [winterCafe],
    lines: {
      greet: [line('cast', 'Airman! What happened to the arm? Never mind. Ice. It\'s always ice.')],
      talk: [talk('cold', ['The desk wants a cold story every day in January.', 'I\'ve used bitter, biting, brutal and Siberian.'], 'Try "plain cold."', 'Plain cold. That\'s good. That\'s new.')],
      bark: [line('airport', 'Forty-two below at the airport. Fifty out the Ester Dome road. I\'ll print forty-two. I\'m honest.')],
    },
  }),
  person({
    id: 'paperKid',
    name: 'the paper boy',
    role: 'the kid who sells the News-Miner on Cushman, out of school for Christmas',
    want: 'to sell out before his eyelashes freeze',
    habit: 'stamps his feet in time to his own shouting',
    at: [winterCafe],
    lines: {
      greet: [line('quarter', 'Paper, mister? Dime. It\'s got the temperature in it, in case you can\'t tell.')],
      bark: [line('extra', 'Extra! It\'s cold! Read all about it! Read it inside!')],
      'askAbout:weather': [line('lashes', 'My eyelashes stuck together on Cushman. Ma says that\'s how you know it\'s forty.')],
    },
  }),

  // St. Joseph's in winter, open again, from the night Wade comes off the hill to the day he dictates his letter.
  person({
    id: 'sister',
    name: 'the sister with the clipboard',
    role: 'a nursing sister at St. Joseph\'s, back on the wards since the river left them',
    want: 'every bed accounted for and every visitor gone by eight',
    habit: 'checks her watch against the ward clock and trusts neither',
    at: [ward],
    lines: {
      greet: [line('floor', 'Airman. Wipe your feet. We spent September getting the river out of this floor.')],
      talk: [talk('hanger', ['That cast will itch in a week. Do not put a coat hanger down it.', 'They all do. Then I see them again.'], 'What if it really itches?', 'Then pray. It is cheaper than an infection.')],
      'askAbout:weather': [line('august', 'In August we carried them up the hill out of the water. Now they come in with frozen toes. The Lord likes variety.')],
    },
  }),
  person({
    id: 'orderly',
    name: 'the orderly',
    role: 'an orderly at St. Joseph\'s, the same one who carried patients up from the boats',
    want: 'a night shift where nobody comes in white at the fingertips',
    habit: 'whistles the same four notes and stops when someone is in pain',
    at: [ward],
    lines: {
      greet: [line('boats', 'You again. Last time you were wet. This time you\'re broken. Pick one.')],
      bark: [line('frostbite', 'Four frostbite cases since Sunday. Two of them were sober. That\'s the scary part.')],
      'askAbout:weather': [line('car', 'Car didn\'t start at six. Rode in with the milk truck. Driver sings worse than me.')],
      'react:bump': [line('arm', 'Watch the arm, airman. I just got done not watching mine.')],
    },
  }),
  person({
    id: 'doctor',
    name: 'the doctor on rounds',
    role: 'a St. Joseph\'s doctor, the one from the help tent, on winter rounds',
    want: 'a full night\'s sleep, which he has stopped expecting',
    habit: 'looks at your fingers before your face',
    at: [ward],
    lines: {
      greet: [line('wiggle', 'Let me see the fingers. Wiggle. Good. Go away.')],
      talk: [talk('pocket', ['At forty below a man feels fine right until his hands stop asking.', 'Keep the good one in your pocket.'], 'And the other one?', 'The cast is warmer than you are. It\'ll keep.')],
      'askAbout:weather': [line('quiet', 'Cold this deep, the whole town goes quiet. Then the ambulance comes in loud.')],
    },
  }),
  person({
    id: 'trapper',
    name: 'the trapper in the hall bed',
    role: 'a trapper off the Steese, in a hall bed with two frostbitten toes',
    want: 'to be back on his line before the marten go off',
    habit: 'tells the same wolverine story to everyone who walks past, a little bigger each time',
    at: [ward],
    lines: {
      greet: [line('wolverine', 'Airman! Ever seen a wolverine take a marten off a set? Sit down. It was this big.')],
      talk: [talk('toes', ['Lost two toes to the cold. Don\'t miss them yet.', 'Ask me at breakup, when I\'m walking crooked.'], 'Sorry about the toes.', 'Don\'t be. They weren\'t pulling their weight.')],
      bark: [line('bigger', 'This big. No, bigger. Sister, how big was it yesterday?')],
    },
  }),

  // The hospital lot at forty below, the afternoon after Christmas.
  person({
    id: 'plugIn',
    name: 'the man with the extension cord',
    role: 'a hospital visitor plugging his car\'s heater into the post at the lot',
    want: 'a car that starts when visiting hours end',
    habit: 'checks the cord three times on the way inside',
    at: [lot],
    lines: {
      greet: [line('cord', 'Mind the cord. That cord is the only reason my Ford starts.')],
      talk: [talk('square', ['At forty below the tires freeze square on the bottom.', 'Thump, thump, thump, the first mile, till they come round.'], 'Square tires?', 'Stay till February. You\'ll learn.')],
      bark: [
        line('alpenglow', 'Would you look at the hills. Pink to the top. Almost worth the cold.', sky('clear')),
        line('blue', 'Blue already, and it\'s barely past three. The lot lights make it look like a ballfield.', sky('dusk')),
        line('fog', 'Can\'t see the hospital from the car. Fog sits on the lot like a lid.', sky('night')),
      ],
    },
  }),
  person({
    id: 'cabbie',
    name: 'the cab driver',
    role: 'the cab driver from the bar row, waiting on a fare at the hospital doors',
    want: 'a fare to the base, which pays the best and tips the worst',
    habit: 'never turns the engine off between October and April',
    at: [lot],
    lines: {
      greet: [line('fare', 'Need a ride, soldier? Base is five dollars. Base with a broken arm is five dollars.')],
      talk: [talk('running', ['I don\'t turn her off from October to April.', 'Gas is cheaper than a dead battery and a long walk.'], 'Doesn\'t she wear out?', 'Everything wears out up here. She just does it warm.')],
      'askAbout:weather': [line('exhaust', 'Every exhaust in town hangs in the air. That\'s half your fog right there.')],
    },
  }),
]
