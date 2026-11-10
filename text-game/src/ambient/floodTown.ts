import type { Clock, Place, State } from '../types.ts'
import type { Window } from './format.ts'
import type { Townsperson } from './town.ts'
import { line, person, talker } from './town.ts'
import { N } from '../names.ts'

// The flooded town (issue #107): the people Wade passes from 15 to 19 August 1967 and what they say. The town from
// the prologue (prologueTown.ts) is still here, flooded out; with them, airmen on the sandbag line, a family on a
// roof, the St. Joseph's staff at the help tent, the land office crew hauling ledgers, and the barflies once the water
// goes down. They talk to an airman and a stranger. Nobody tells Wade where he stands (only the café gossip does
// that), nobody states the land scheme, and nobody says oil.

const curly = N.curlyShort
const eli = N.eli
const lucy = N.lucy
const hank = N.bartenderShort
const wade = N.wade
const owen = N.owenShort

// Where and when. Every street scene on 15 August is floodedStreet between 09:00 and 12:40; `spot` says which stretch
// of the downtown map someone stands on (docs/town-map.md). The help tent is played at 10:45 (only on the errand) and
// from 20:00 (always), the land office at 10:00 on the 16th, and the Silver Pan at 21:00 and 21:30 on the 19th.
const win = (place: Place, from: Clock, to: Clock, spot?: string): Window => ({ place, from, to, ...(spot ? { spot } : {}) })
const street = (spot: string) => win('floodedStreet', '1967-08-15T09:00', '1967-08-15T12:40', spot)
// The Nenana boat comes in after Eli has the message, so it never stands in for the one boat that can reach the house.
const lateStreet = (spot: string) => win('floodedStreet', '1967-08-15T12:00', '1967-08-15T12:40', spot)
const tent = win('helpTent', '1967-08-15T10:00', '1967-08-15T20:30')
const office = win('landOffice', '1967-08-16T09:00', '1967-08-16T12:00', 'landOffice')
const bar = win('silverPan', '1967-08-19T20:30', '1967-08-19T22:00')

// Wade came back to the line after going for Eli: the sergeant scene is only played on that route.
const cameBack = (s: State): boolean => s.scene === 'a1_line'
const morning = (s: State): boolean => s.scene === 'a1_errand'
const evening = (s: State): boolean => !morning(s)
// The Pan before the fight, and once it has started.
const calm = (s: State): boolean => s.scene === 'a1_barfight'
const fighting = (s: State): boolean => !calm(s)

const talk = talker('wade')

export const floodTown: readonly Townsperson[] = [
  // The sandbag line across Cushman Street.
  person({
    id: 'airmanBunk',
    name: 'the airman from your barracks',
    role: `an Eielson airman on the sandbag line, two bunks down from ${wade}`,
    want: 'a dry pair of socks and a hot meal before they truck him back',
    habit: 'counts bags out loud and loses count on purpose',
    at: [street('cushman')],
    lines: {
      greet: [line('texas', 'Hold your end up, Texas. I got the heavy ones.')],
      talk: [
        talk('guitar', ['Guitar went under? No. You left it on your bunk.', 'Thank God. Nobody else on the line can sing.'], "I can't either.", "That's why it's funny."),
        line('latrine', 'Sarge counted heads. I told him you were in the latrine. There is no latrine, Texas.', cameBack),
      ],
      'askAbout:weather': [line('swim', "Back home a river this high, you'd swim it. Here it's forty degrees and smells like a gas station.")],
      bark: [line('count', 'Forty-one, forty-two, forty... what was I on?')],
      'react:bump': [line('bump', 'Watch it. That bag was the only dry thing on me.')],
    },
  }),
  person({
    id: 'airmanTailgate',
    name: 'the airman on the tailgate',
    role: 'an Eielson airman throwing bags down off a deuce-and-a-half',
    want: 'to stay up on the truck where the water is not',
    habit: 'grins down at everybody below him, and throws the next bag a little hard',
    at: [street('cushman')],
    lines: {
      greet: [line('down', 'Morning, down there. How is the water?')],
      bark: [
        line('catch', 'Catch! Too slow. That one is going to Nenana.'),
        line('sarge', "Sarge is coming back up the line. Look busy. Look wetter.", cameBack),
      ],
      talk: [talk('motor', ['Motor pool says if this truck goes in any deeper, the engine drinks river.', 'So I stay up here, and you stay down there.'], 'Fair enough.', "Ain't fair. It's just how it is.")],
      'askAbout:weather': [line('rain', "Rained up in the hills for a week, they say. Now it's here to visit.")],
    },
  }),
  person({
    id: 'airmanJersey',
    name: 'the airman with the shovel',
    role: 'an Eielson airman from New Jersey, filling bags at the sand pile',
    want: 'to tell his girl he saved a town and have it be true',
    habit: 'talks about the Jersey shore with every shovelful',
    at: [street('cushman')],
    lines: {
      greet: [line('hey', 'Hey, Texas. You got floods down there?')],
      talk: [talk('shore', ['At the shore the water comes in, goes out. Twice a day.', 'This one came in and moved into the furniture.'], 'It goes out eventually.', 'Yeah? Tell it to that piano.')],
      bark: [line('piano', "There goes a piano. Upright. Somebody's mother's.")],
      'askAbout:landOffice': [line('deeds', 'Whole town is going to be looking for its deeds next week. Good luck finding a dry one.')],
    },
  }),

  // The prologue's town, flooded out.
  person({
    id: 'landlady',
    name: 'the landlady',
    role: `the landlady at the boarding house on Third, where ${owen} roomed`,
    want: 'her boarders accounted for and her Bible dry',
    habit: 'leans out the upstairs window with a sardine tin for her ashes, the same as on the porch',
    at: [street('boardingHouse')],
    lines: {
      greet: [line('boats', 'Air Force! Is the Air Force bringing boats, or just boys?')],
      talk: [
        talk('bed', ['My geologist went out in the rain last night.', "Bed's not slept in. Never once has he missed breakfast."], "Maybe he's helping somewhere.", 'Maybe. He never helped with anything but my coffee.'),
      ],
      'askAbout:weather': [line('august', 'My husband always said rain in July means water in August. He picked a fine year to be right.')],
      'askAbout:landOffice': [line('bible', 'My receipt for this lot is in my Bible, and my Bible is up here with me. Let them argue.')],
      'react:stare': [line('stare', "Never seen a lady in a window, airman? Go on, I've got a river to watch.")],
    },
  }),
  person({
    id: 'boarder',
    name: 'the boarder on the roof',
    role: 'an Alaska Railroad brakeman who rooms downstairs, sitting it out on the porch roof',
    want: 'the trains running so he has somewhere to be',
    habit: 'smokes on the porch roof with his boots in his lap',
    at: [street('boardingHouse')],
    lines: {
      greet: [line('morning', "Morning. I think. Can't tell up here either.")],
      bark: [line('rails', "Rails are under all the way out to the depot. First day off I've had since May.")],
      'askAbout:weather': [line('sleep', 'Slept up here last night. First real dark since May. Took a flood to get it.')],
    },
  }),
  person({
    id: 'waitress',
    name: 'the breakfast waitress',
    role: 'the breakfast waitress at the Northern Lights Café, carrying coffee down Second',
    want: 'to keep pouring until somebody tells her to stop',
    habit: 'carries the coffee pot everywhere, even out the door and into the water',
    at: [street('secondAvenue')],
    lines: {
      greet: [line('hon', 'Coffee, hon? The café has two feet of river in it, but the coffee is still hot.')],
      bark: [line('cups', "Who has a cup? Bring the cup back. We're down to eleven cups.")],
      talk: [talk('stove', ['Cook carried the stove up the stairs by himself.', "Doesn't know how. Can't get it back down."], 'Coffee tastes fine.', 'It tastes like the stairwell. Drink it anyway.')],
      'askAbout:weather': [line('wash', 'I said hang your wash this week. Look where it\'s hanging now.')],
      'react:bump': [line('pot', 'Hot pot, hon! Even in the water, hot pot!')],
    },
  }),
  person({
    id: 'reporter',
    name: 'the reporter from the News-Miner',
    role: 'a reporter for the Fairbanks Daily News-Miner, with a camera over his head',
    want: 'one picture that the wire services take',
    habit: 'writes notes on the backs of matchbooks and keeps them in his hatband',
    at: [street('secondAvenue')],
    lines: {
      greet: [line('name', 'Airman! Name and hometown. Spell it. Your mother will want a clipping.')],
      talk: [talk('fire', ['I said I would give a week\'s pay for a good fire.', 'Nobody said anything about water.'], 'Careful what you wish for.', "I'm wishing for a dry match. Let's see how that goes.")],
      'askAbout:weather': [line('crest', "Crest is tonight or tomorrow. The Weather Bureau won't say which, so I will.")],
      bark: [line('hold', 'Hold still! Not you. The dog on the car.')],
    },
  }),
  person({
    id: 'preacher',
    name: 'the preacher with the tracts',
    role: 'the street preacher from the bar row, filling sandbags',
    want: 'everybody on Second off it and dry before dark',
    habit: 'still has a tract tucked in his hatband, and does not offer it',
    at: [street('secondAvenue')],
    lines: {
      greet: [line('brother', 'Brother. Grab the other end.')],
      talk: [talk('forty', ['You want me to say something about forty days?', "Not today. Today I'm a man with a shovel."], 'Fair enough.', "Ask me on Sunday. If there's a church to say it in.")],
      bark: [line('kids', 'Kids first, then the old folks, then the bottles. The bottles can swim.')],
      'react:stare': [line('stare', 'I know. A preacher doing work. Go on and look.')],
    },
  }),
  person({
    id: 'paperKid',
    name: 'the paper boy',
    role: 'the kid who sold the News-Miner on Cushman, running messages for a quarter',
    want: 'to be the one who saw everything',
    habit: 'wades in rolled-up dungarees, holding a note above his head',
    at: [street('cushman')],
    lines: {
      greet: [line('quarter', "Message, mister? Quarter. I go anywhere the water's below my belt.")],
      bark: [line('extra', "Extra! Whole town underwater! You can see for yourself, it's free!")],
      talk: [talk('roof', ['Saw a fella on Lacey sitting on his roof with a lamp.', 'A floor lamp. Plugged into nothing.'], 'Why a lamp?', 'He said it was his good one.')],
      'askAbout:weather': [line('school', "If it's still like this in September, they can't open the school. Right? Right?")],
      'react:run': [line('splash', "Hey! You got me wetter than the river did!")],
    },
  }),
  person({
    id: 'dockHand',
    name: 'the dock hand',
    role: 'the dock hand from the float dock, tying floatplanes off to whatever stands',
    want: 'every plane on the Chena still there when the water goes down',
    habit: 'coils line while he talks and never looks at his hands',
    at: [street('firstAvenue')],
    lines: {
      greet: [line('pole', "Morning, airman. If you see a floatplane loose, it's mine. Tie it to a pole.")],
      talk: [talk('sunday', ['Told a fella in July the river was up four inches.', "Said ask me Sunday. Well. It's Tuesday."], 'What did he say?', "Said he'd see me Sunday. Sunday came and went.")],
      'askAbout:weather': [line('crest', "Chena's still rising. You can hear it on the bridge, like a train that doesn't pass.")],
      'askAbout:curly': [line('pole', `${curly}'s plane rode it out on the slough. He'll tell you it was skill. It was a good pole.`)],
      bark: [line('dock', 'Float dock is somewhere under there. Ask me where. Go on, ask me.')],
    },
  }),
  person({
    id: 'touristHusband',
    name: 'the tourist with the camera',
    role: 'the retired tool-and-die man from Dayton, who stayed on in town past the Centennial crowds',
    want: 'one roll of film that the folks back home will believe',
    habit: 'squints at a light meter, and now it works',
    at: [street('secondAvenue')],
    lines: {
      greet: [line('hold', "Young man! Stand right there. No, in the water. That's the picture.")],
      talk: [talk('alcan', ['Twelve hundred miles of gravel on the Alcan.', 'Now the car is at the bottom of Second Avenue with the postcards in it.'], "I'm sorry.", 'Don\'t be. Nobody in Dayton has a picture like this.')],
      'askAbout:weather': [line('meter', "Light meter reads fine. It's the water it can't figure.")],
    },
  }),
  person({
    id: 'touristWife',
    name: 'the tourist with the postcards',
    role: 'his wife, holding the last dry postcards in a bread bag',
    want: 'to get word home before the newspapers do',
    habit: 'writes on her husband\'s back, standing in a doorway out of the water',
    at: [street('secondAvenue')],
    lines: {
      greet: [line('mail', "Is the post office open? Is anything open? I've got three postcards left.")],
      talk: [talk('wrote', ['I wrote my sister that it rains every day up here.', 'She wrote back to stop exaggerating.'], 'Send her a picture.', "He's taking it. Stand still, you're in it.")],
      'react:stare': [line('stare', "Don't mind him, dear. He wants you in the picture for scale.")],
    },
  }),

  // A family on a roof on Lacey Street.
  person({
    id: 'roofFather',
    name: 'the man on the roof',
    role: 'a father of three, sitting it out on the roof of the house he built on Lacey',
    want: 'to leave his house last, and only by his own say',
    habit: 'keeps one hand on the chimney like it might float off',
    at: [street('lacey')],
    lines: {
      greet: [line('boat', "You Air Force? You got a boat? Then you're just wet.")],
      talk: [talk('house', ['Built this house myself. Two winters.', "I'm not going down a ladder into a stranger's rowboat to watch it fill up."], 'Somebody will come.', 'Somebody came. I sent him on. There were people worse off.')],
      'askAbout:weather': [line('sky', 'Look at that. Blue sky. Water to the windows and blue sky. Whoever runs this has a sense of humor.')],
      bark: [line('dog', 'Dog stays! Where I stay, the dog stays!')],
    },
  }),
  person({
    id: 'roofMother',
    name: 'the woman on the roof',
    role: 'his wife, keeping three kids and a dog on a roof',
    want: 'everybody off the roof before dark, whatever her husband says',
    habit: 'counts her children by touching each head, again and again',
    at: [street('lacey')],
    lines: {
      greet: [line('soldier', "Soldier! Tell whoever has a boat there's a family on Lacey. Five and a dog.")],
      talk: [talk('dog', ["He won't come down because they'll take the dog last.", 'So we are all up here. For the dog.'], "I'll tell them.", "Tell them the dog's small. That's a lie, but tell them.")],
      bark: [line('sit', "Sit down. Sit. I don't care if you can see the school from up there.")],
    },
  }),
  person({
    id: 'roofBoy',
    name: 'the boy on the roof',
    role: 'their oldest, about nine, having the best day of his life',
    want: 'to ride in a boat, any boat',
    habit: 'drops shingles into the water to see which way they go',
    at: [street('lacey')],
    lines: {
      greet: [line('gun', "Are you a soldier? Where's your gun?")],
      talk: [talk('air', ["You're a soldier. You got the shirt."], "I'm Air Force.", "Then where's your airplane?")],
      bark: [line('shingle', 'That one went to Second! That one went to Second too!')],
      'react:stare': [line('stare', "You can come up. There's room. Not much room.")],
    },
  }),

  // A riverboat up from Nenana.
  person({
    id: 'nenanaBoatman',
    name: 'the man with the Nenana boat',
    role: 'a Lower Tanana man who ran his riverboat up from Nenana when the water rose, ferrying people out',
    want: 'to empty the houses on his list, then get home before his nets are gone',
    habit: 'keeps a list of houses on a paper bag, and crosses them off with a carpenter\'s pencil',
    at: [lateStreet('firstAvenue')],
    lines: {
      greet: [line('soldier', 'Soldier. Hold the bow while they climb in.')],
      talk: [talk('list', ['Six houses on this street, and two more on the slough.', 'Then I go home. My nets are in the same river.'], "I'm Air Force, not Army.", 'Then hold the bow like Air Force.')],
      'askAbout:weather': [line('down', "It came up in two days. It'll take longer than two days to go down. It always does.")],
      bark: [line('sit', "Sit low. Everybody sit low. The boat doesn't care how important you are.")],
    },
  }),

  // The help tent: St. Joseph's staff, on high ground south of town.
  person({
    id: 'sister',
    name: 'the sister with the clipboard',
    role: 'a nursing sister from St. Joseph\'s, keeping the list of every patient brought up the hill',
    want: 'every name on her list next to a cot',
    habit: 'writes standing up and never looks up from the clipboard until she is done',
    at: [tent],
    lines: {
      greet: [
        line('name', "Name? Not yours. Whoever you're carrying.", morning),
        line('boots', 'Wipe your boots, such as they are. Then bring him in out of the wet.', evening),
      ],
      talk: [
        talk('list', ['Sixty-one patients came up this hill today.', "I've got sixty names. Somebody's a stranger."], 'Can I help?', 'You can stand out of the light.', morning),
        talk('back', ['The one at the back, under the tarp. I need a name for him.'], `${owen}. He was a geologist.`, 'Then he gets a whole line, not a space.', evening),
      ],
      'askAbout:weather': [line('hill', "The Lord put this hill here for a reason. We're standing on the reason.")],
    },
  }),
  person({
    id: 'orderly',
    name: 'the orderly',
    role: 'an orderly from St. Joseph\'s, carrying patients up from the boats',
    want: 'one patient who walks on his own',
    habit: 'whistles the same four notes and stops when someone is in pain',
    at: [tent],
    lines: {
      greet: [line('end', 'You. Airman. Take the other end of this.')],
      talk: [talk('bites', ["Mind the third cot. That's a retired schoolteacher and she bites.", 'Not bad. Just when you deserve it.'], 'Noted.', 'Everybody says that. She bites them anyway.', morning)],
      bark: [
        line('lift', 'On three. One, two. Nobody ever waits for three.'),
        line('tarp', 'Six under tarps tonight. I had to go and count them twice.', evening),
      ],
      'react:bump': [line('bump', "Easy. I've got somebody's grandmother here.")],
    },
  }),
  person({
    id: 'doctor',
    name: 'the doctor in shirtsleeves',
    role: 'a St. Joseph\'s doctor working the help tent on no sleep',
    want: 'to sleep, and nobody else drowned before he does',
    habit: 'washes his hands in a basin between every patient, even the ones he only talks to',
    at: [tent],
    lines: {
      greet: [
        line('bleeding', "Are you bleeding? No? Then you're in line. The nurse is that way.", morning),
        line('carrying', "Are you bleeding? No? Then you're carrying. Go on.", evening),
      ],
      'askAbout:weather': [line('typhoid', 'Every well in town is river now. Tell your sergeant: boil it, or bring it from the base.')],
      bark: [
        line('tetanus', 'Anybody cut on anything in that water gets a tetanus shot. That means you. Yes, you.', morning),
        line('signed', 'Six today. The Trooper signs them faster than I can.', evening),
      ],
    },
  }),

  // The land office the morning after, hauling ledgers up out of the water.
  person({
    id: 'landClerk',
    name: 'the clerk from the land office',
    role: 'the land-office clerk from the café counter, hauling ledgers up the stairs',
    want: 'every book upstairs before it swells shut',
    habit: 'wipes each ledger\'s spine with her sleeve and reads the number on it out loud',
    at: [office],
    lines: {
      greet: [line('book', "You're holding the door, so you're holding a book. Here.")],
      talk: [
        talk('cabinet', ['All summer I wanted a filing cabinet that would shut.', "Now I've got nine that won't open."], 'Crowbar?', 'Federal property. Ask me again on Friday.'),
        line('first', `${lucy} went down for the Native allotment books before she would let anybody touch the mining claims.`),
      ],
      'askAbout:landOffice': [line('plats', 'Plats are on the line out back, clothespinned. If the wind takes one, chase it.')],
      bark: [line('number', 'Sixty-three. Sixty-four. Who has sixty-five? Somebody has sixty-five.')],
    },
  }),
  person({
    id: 'recordsMan',
    name: 'the records man',
    role: 'a records clerk thirty years at the counter, who knows where each book goes',
    want: 'every book back on its own shelf, in its own order',
    habit: 'turns the wet pages one at a time with a butter knife',
    at: [office],
    lines: {
      greet: [line('knife', "Don't open that. Bring it here. I've got a knife for that.")],
      talk: [talk('ink', ['Pencil holds. Ink runs.', 'Thirty years I told them to file in pencil.'], 'Did they?', 'The good ones did.')],
      'askAbout:landOffice': [line('order', "Out of order's the same as lost. Remember that, airman, if you ever file anything.")],
      'askAbout:survey': [line('notes', 'Field notes go on the top shelf. A surveyor walked a month for that book. It can sit dry.')],
    },
  }),
  person({
    id: 'summerClerk',
    name: 'the summer girl from the university',
    role: 'a university student on the summer counter, a few weeks from classes',
    want: 'a story to tell the dorm that beats everybody else\'s',
    habit: 'carries ledgers two at a time and keeps her shoes in a desk drawer',
    at: [office],
    lines: {
      greet: [line('shoes', "Mind the stairs. They're dry now. I'm not.")],
      talk: [talk('summer', ['They told me this was a quiet summer job.', 'Filing. Typing. Lunch at noon.'], 'How is it?', "I've carried a sixty-year-old book up a staircase in a river. It's fine.")],
      bark: [line('two', 'Two at a time! I can carry two at a time!')],
    },
  }),

  // The Silver Pan, Saturday night, after the water goes down.
  person({
    id: 'nightBartender',
    name: 'the second bartender',
    role: `the second bartender at the Silver Pan, back behind the bar with ${hank}`,
    want: 'the mud out of the cooler before the beer goes bad',
    habit: 'scrapes the bar rail with a putty knife between orders',
    at: [bar],
    lines: {
      greet: [line('what', "What'll it be? Beer's warm. Cooler's full of river.", calm)],
      bark: [
        line('line', "Mud line's at the third stool. Sit above it.", calm),
        line('glass', "Not the glasses! Use the bottles, the bottles are cheaper!", fighting),
      ],
      talk: [talk('quake', ['Came up from Anchorage after the quake, for some peace.', 'Now this.'], 'Bad luck.', "Earthquake, then a flood. If it snows in August I'm going to Hawaii.", calm)],
    },
  }),
  person({
    id: 'miner',
    name: 'the old placer miner',
    role: 'the placer miner from Cleary Creek, in town for the flood',
    want: 'to see his creek before he believes what they say about it',
    habit: 'taps a pill bottle of gold flakes on the bar to hear it',
    at: [bar],
    lines: {
      greet: [line('airman', 'Airman. Sit down. You look like you been in it all week.', calm)],
      talk: [talk('creek', ['Forty years I went to the creek.', 'This week the creek came to me.'], 'Did you lose much?', 'Lost a cabin. Kept the bottle. Bottle was in my pocket.', calm)],
      'askAbout:curly': [line('stool', `${curly}? Same stool as always. Ask him about his plane, he's dying to tell you.`, calm)],
      'askAbout:weather': [line('freeze', "Ground's soaked going into winter. Next spring you'll see heaves you could hide a truck in.", calm)],
      'react:run': [line('down', 'Get down, son! Nobody ever got hurt on the floor!', fighting)],
    },
  }),
  person({
    id: 'foreman',
    name: 'the road foreman',
    role: 'the foreman from the state road job north of town, shut down by the flood',
    want: 'his crew back from shoveling mud and onto his road',
    habit: 'drinks standing up, boots caked to the knee now',
    at: [bar],
    lines: {
      greet: [line('mud', "Airman. You got the mud off yet? Me neither. I'm never getting it off.", calm)],
      bark: [line('crew', 'Half my crew is shoveling basements on Second. Other half is drunk in here. I know which half I want.', calm)],
      talk: [talk('slide', ['The Steese washed out at two creeks.', 'Six weeks of work, gone downstream like it was never there.'], 'Can you rebuild it?', 'Before freeze-up? You want to bet your pay on it?', calm)],
    },
  }),
  person({
    id: 'pilotGray',
    name: 'the gray-haired bush pilot',
    role: 'the bush pilot off Phillips Field, grounded by the water',
    want: 'his plane dried out and in the air by Wednesday',
    habit: 'flies every story with his hand flat over the table',
    at: [bar],
    lines: {
      greet: [line('field', 'Phillips Field is a lake. I had a floatplane, I could have landed on it.', calm)],
      'askAbout:curly': [line('fine', `${curly}'s plane came through fine. He's been telling everybody. Twice.`, calm)],
      talk: [talk('moose', ['Took a skiff across the river to the field on Wednesday, to see my plane.', 'Passed a moose swimming the other way.'], 'Was the plane all right?', "Plane was fine. Moose looked better than I did.", calm)],
      'react:stare': [line('stare', 'What? Never seen a man grounded before?', calm)],
    },
  }),
  person({
    id: 'barflyRiver',
    name: 'the man at the stove',
    role: 'a riverboat deckhand off the Chena, out of work until the river behaves',
    want: 'to be warm all the way through for one night',
    habit: 'stands with his back to the stove and his hands behind him',
    at: [bar],
    lines: {
      greet: [line('stove', 'You want the stove, airman, wait your turn.', calm)],
      'askAbout:weather': [line('river', 'Two days of river. Fifty years of floors.', calm)],
      'askAbout:curly': [line('loud', `${curly}? Loudest man in here, and he's not even drunk yet. Give him an hour.`, calm)],
      bark: [line('hot', 'The stove! Mind the stove!', fighting)],
    },
  }),
]
