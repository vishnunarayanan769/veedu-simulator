import type { ItemId, StationId } from './world';
import { activityDetails, ACTIVITY_NOTES_ML, type ActionKind, type ActivityStep } from './activityDetails';

export type ActivityCategory =
  | 'home'
  | 'food'
  | 'garden'
  | 'water'
  | 'heritage'
  | 'animals'
  | 'repair'
  | 'festival';

export interface ActivityDef {
  id: string;
  unlockLevel: number;
  station: StationId;
  name: string;
  ml: string;
  verb: string;
  item: ItemId | null;
  icon: string;
  score: number;
  hold: number;
  category: ActivityCategory;
  note: string;
  kind: ActionKind;
  steps: ActivityStep[];
}

type RawActivity = Omit<ActivityDef, 'unlockLevel'>;

const a = (
  id: string,
  station: StationId,
  name: string,
  ml: string,
  verb: string,
  item: ItemId | null,
  icon: string,
  category: ActivityCategory,
  note: string,
  score = 180,
  hold = 1.3,
): RawActivity => {
  const details = activityDetails(station, verb, id);
  const levelIndex = /^l\d+$/.test(id) ? Number(id.slice(1)) - 1 : -1;
  // Keep the existing activity IDs and unlock levels, but render complete
  // Malayalam instructions and use tools appropriate to the actual action.
  void name; void item; void note;
  return {
    id, station, name: ml, ml, icon, category, score, hold,
    note: ACTIVITY_NOTES_ML[levelIndex] ?? details.steps[0].instruction,
    ...details,
  };
};

// Starter chores are available before Level 1. Each later level adds exactly one
// distinct activity to the home's rotating work board.
export const STARTER_ACTIVITIES: ActivityDef[] = [
  { ...a('starter-sweep', 'sweep', 'Sweep the Nadumuttam', 'നടുമുറ്റം അടിക്കുക', 'Sweep', 'broom', '🧹', 'home', 'The courtyard must be ready before the family wakes.', 155, 1.35), unlockLevel: 0 },
  { ...a('starter-stove', 'stove', 'Boil Morning Chaya', 'രാവിലെ ചായ', 'Boil', null, '☕', 'food', 'Cardamom tea is the first promise of the day.', 165, 1.25), unlockLevel: 0 },
  { ...a('starter-cow', 'cow', 'Feed Lakshmi', 'ലക്ഷ്മിക്ക് പുല്ല്', 'Feed', 'grass', '🐄', 'animals', 'Lakshmi knows breakfast is never late.', 170, 1.35), unlockLevel: 0 },
  { ...a('starter-tulsi', 'plants', 'Water the Tulsi Thara', 'തുളസിക്ക് വെള്ളം', 'Water', 'bucket', '🌿', 'garden', 'A quiet offering before the house gets busy.', 165, 1.25), unlockLevel: 0 },
  { ...a('starter-lamp', 'lamp', 'Light the Nilavilakku', 'നിലവിളക്ക് കൊളുത്തുക', 'Light', 'match', '🪔', 'heritage', 'The brass lamp gathers the household in one warm pool of light.', 180, 1.25), unlockLevel: 0 },
  { ...a('starter-well', 'well', 'Draw Well Water', 'കിണറ്റിൽ നിന്ന് വെള്ളം', 'Draw', 'bucket', '🪣', 'water', 'The old well is colder than the morning air.', 175, 1.5), unlockLevel: 0 },
  { ...a('starter-tap', 'tap', 'Tighten the Garden Tap', 'ടാപ്പ് മുറുക്കുക', 'Tighten', 'wrench', '🔧', 'repair', 'A steady drip can empty a bucket before noon.', 185, 1.35), unlockLevel: 0 },
  { ...a('starter-fuse', 'fuse', 'Check the Main Fuse', 'ഫ്യൂസ് പരിശോധിക്കുക', 'Check', null, '⚡', 'repair', 'The old board hums behind its teak frame.', 190, 1.2), unlockLevel: 0 },
];

// 100 individual Kerala household activities, unlocked one at a time across
// Levels 1–100. Station visuals are shared, but every quest has a new action,
// narrative note, required tool and trivia topic.
const RAW_LEVEL_ACTIVITIES = [
  a('l01', 'sweep', 'Gather the Coconut Fronds', 'തെങ്ങോല കൂട്ടുക', 'Gather', 'broom', '🍂', 'home', 'The first fallen fronds make a soft roof over the red floor.'),
  a('l02', 'lamp', 'Polish the Brass Wick Holder', 'വിളക്ക് മിനുക്കുക', 'Polish', 'match', '🪔', 'heritage', 'Every scratch in the brass remembers another evening prayer.'),
  a('l03', 'plants', 'Mist the Jasmine Pots', 'മുല്ലയ്ക്ക് വെള്ളം', 'Mist', 'bucket', '🌼', 'garden', 'The jasmine buds should be ready for the evening braid.'),
  a('l04', 'stove', 'Toast Cardamom for Chaya', 'ഏലക്ക വറുക്കുക', 'Toast', null, '🌱', 'food', 'Crush the pods only after their perfume fills the kitchen.'),
  a('l05', 'cow', 'Comb Lakshmi’s Coat', 'ലക്ഷ്മിയെ ചീകുക', 'Comb', 'grass', '🐄', 'animals', 'Lakshmi leans into the brush like she owns the place.'),
  a('l06', 'well', 'Fill the Copper Water Pot', 'ചെമ്പിൽ വെള്ളം നിറയ്ക്കുക', 'Fill', 'bucket', '🫗', 'water', 'Cold water waits beneath the mossed stone ring.'),
  a('l07', 'tap', 'Stop the Veranda Drip', 'വരാന്ത ടാപ്പ് ശരിയാക്കുക', 'Seal', 'wrench', '🔧', 'repair', 'Rainwater should stay outside, not count seconds in the veranda.'),
  a('l08', 'fuse', 'Test the Porch Switch', 'പോർച്ച് സ്വിച്ച് നോക്കുക', 'Test', null, '💡', 'repair', 'A bulb blinks above the carved front door.'),
  a('l09', 'sweep', 'Brush the Poomukham Steps', 'പൂമുഖം വൃത്തിയാക്കുക', 'Brush', 'broom', '🧹', 'home', 'Visitors notice the front steps before anything else.'),
  a('l10', 'stove', 'Simmer the Coconut Milk', 'തേങ്ങാപ്പാൽ തിളപ്പിക്കുക', 'Simmer', null, '🥥', 'food', 'Keep the heat low; coconut milk has no patience.'),

  a('l11', 'lamp', 'Set the Evening Wicks', 'തിരി വെക്കുക', 'Set', 'match', '🕯️', 'heritage', 'Five cotton wicks wait like small promises.'),
  a('l12', 'plants', 'Tie the Hibiscus Stem', 'ചെമ്പരത്തി കെട്ടുക', 'Tie', 'bucket', '🌺', 'garden', 'The rain has bent it, but not broken it.'),
  a('l13', 'cow', 'Bring Fresh Fodder', 'പുതിയ പുല്ല് കൊണ്ടുവരിക', 'Bring', 'grass', '🌾', 'animals', 'Lakshmi hears the grass bundle before she sees it.'),
  a('l14', 'well', 'Rinse the Stone Trough', 'കൽത്തൊട്ടി കഴുകുക', 'Rinse', 'bucket', '💧', 'water', 'Clear away the leaf tannins from the old basin.'),
  a('l15', 'tap', 'Grease the Tap Thread', 'ടാപ്പ് ത്രെഡ് ശരിയാക്കുക', 'Repair', 'wrench', '🛠️', 'repair', 'A little pressure, a little patience, no more squeak.'),
  a('l16', 'fuse', 'Replace the Porch Fuse', 'പോർച്ച് ഫ്യൂസ് മാറ്റുക', 'Replace', null, '⚡', 'repair', 'The porcelain carrier clicks home with a satisfying snap.'),
  a('l17', 'sweep', 'Clear the Rain Channel', 'മഴച്ചാൽ വൃത്തിയാക്കുക', 'Clear', 'broom', '🌧️', 'home', 'Leaf litter blocks the tiny drain beside the courtyard.'),
  a('l18', 'stove', 'Warm Pathiri on the Pan', 'പത്തിരി ചൂടാക്കുക', 'Warm', null, '🫓', 'food', 'The rice flatbread turns soft in the rising steam.'),
  a('l19', 'lamp', 'Offer a Quiet Deepam', 'ദീപം വയ്ക്കുക', 'Offer', 'match', '🙏', 'heritage', 'For a moment, the whole house is still.'),
  a('l20', 'plants', 'Gather Curry Leaves', 'കറിവേപ്പില ശേഖരിക്കുക', 'Gather', 'bucket', '🍃', 'garden', 'Pick only what the kitchen needs; let the plant keep growing.'),

  a('l21', 'cow', 'Wash Lakshmi’s Water Bowl', 'പശുവിന്റെ പാത്രം കഴുകുക', 'Wash', 'bucket', '🥣', 'animals', 'A clean bowl is better than a second handful of grass.'),
  a('l22', 'well', 'Lower the Coir Bucket', 'കയർ ബക്കറ്റ് ഇറക്കുക', 'Lower', 'bucket', '🪣', 'water', 'The pulley groans in the familiar rhythm of the morning.'),
  a('l23', 'tap', 'Secure the Pipe Clamp', 'പൈപ്പ് ക്ലാംപ് മുറുക്കുക', 'Secure', 'wrench', '🔩', 'repair', 'The old pipe stops shivering against the wall.'),
  a('l24', 'fuse', 'Clean the Switchboard', 'സ്വിച്ച്ബോർഡ് വൃത്തിയാക്കുക', 'Clean', null, '🧽', 'repair', 'Dust can be a surprisingly stubborn electrician.'),
  a('l25', 'sweep', 'Sweep the Red Oxide Hall', 'ചുവന്ന നിലം അടിക്കുക', 'Sweep', 'broom', '🏠', 'home', 'The mirror-red floor deserves a careful hand.'),
  a('l26', 'stove', 'Brew Black Kaapi', 'കട്ടൻകാപ്പി ഉണ്ടാക്കുക', 'Brew', null, '☕', 'food', 'Strong enough to wake the neighbour through the compound wall.'),
  a('l27', 'lamp', 'Clean the Brass Base', 'വിളക്കിന്റെ പീഠം തുടയ്ക്കുക', 'Clean', 'match', '✨', 'heritage', 'The lamp catches the sun even before it catches fire.'),
  a('l28', 'plants', 'Water the Banana Suckers', 'വാഴക്കന്ന് നനയ്ക്കുക', 'Water', 'bucket', '🍌', 'garden', 'Small shoots promise next season’s bunches.'),
  a('l29', 'cow', 'Check the Cowshed Rope', 'പശുക്കയർ പരിശോധിക്കുക', 'Check', 'grass', '🪢', 'animals', 'The knot should hold firm without pinching.'),
  a('l30', 'well', 'Top Up the Bird Basin', 'പക്ഷിക്കുടം നിറയ്ക്കുക', 'Top up', 'bucket', '🐦', 'water', 'Bulbuls arrive the moment the stone bowl shines.'),

  a('l31', 'tap', 'Mend the Kitchen Line', 'അടുക്കള പൈപ്പ് നന്നാക്കുക', 'Mend', 'wrench', '🚰', 'repair', 'The kitchen cannot wait for a lazy leak.'),
  a('l32', 'fuse', 'Wake the Ceiling Fan', 'ഫാൻ ഓണാക്കുക', 'Reset', null, '🌀', 'repair', 'The blades begin to stir the warm noon air.'),
  a('l33', 'sweep', 'Sweep Under the Charu Chair', 'കസേരയ്ക്കടിയിൽ അടിക്കുക', 'Sweep', 'broom', '🪑', 'home', 'The chair has collected a week of quiet dust.'),
  a('l34', 'stove', 'Prepare Ginger Chaya', 'ഇഞ്ചിച്ചായ ഉണ്ടാക്കുക', 'Brew', null, '🫚', 'food', 'Ginger, tea, and a little more rain than expected.'),
  a('l35', 'lamp', 'Light the Threshold Lamp', 'വാതിൽപ്പടി വിളക്ക്', 'Light', 'match', '🚪', 'heritage', 'A small flame tells every visitor they are welcome.'),
  a('l36', 'plants', 'Harvest a Sprig of Tulsi', 'തുളസി ശേഖരിക്കുക', 'Harvest', 'bucket', '🌿', 'garden', 'Take a sprig gently, with thanks.'),
  a('l37', 'cow', 'Lead Lakshmi to Shade', 'ലക്ഷ്മിയെ തണലിലേക്ക് നയിക്കുക', 'Lead', 'grass', '🌴', 'animals', 'The palms cast the coolest shade by midday.'),
  a('l38', 'well', 'Cool the Buttermilk Pot', 'മോര് കുടം തണുപ്പിക്കുക', 'Cool', 'bucket', '🥛', 'water', 'Lower it near the well water, just long enough.'),
  a('l39', 'tap', 'Straighten the Brass Nozzle', 'ബ്രാസ് നോസിൽ നേരെയാക്കുക', 'Align', 'wrench', '🔧', 'repair', 'A straight stream is a small household miracle.'),
  a('l40', 'fuse', 'Check the Radio Plug', 'റേഡിയോ പ്ലഗ് പരിശോധിക്കുക', 'Check', null, '📻', 'repair', 'News from Kochi should not crackle through lunch.'),

  a('l41', 'sweep', 'Collect the Palm Fiber', 'തെങ്ങിൻ നാര് ശേഖരിക്കുക', 'Collect', 'broom', '🧺', 'home', 'Save the good fiber for tying kitchen bundles.'),
  a('l42', 'stove', 'Steam Puttu Rice', 'പുട്ട് ആവിയിൽ വേവിക്കുക', 'Steam', null, '🍚', 'food', 'The whistle is softer than rain on the roof tiles.'),
  a('l43', 'lamp', 'Trim the Cotton Wick', 'തിരി വെട്ടുക', 'Trim', 'match', '✂️', 'heritage', 'Too long and the flame smokes; too short and it sulks.'),
  a('l44', 'plants', 'Remove Snails from the Greens', 'പച്ചക്കറിയിലെ ഒച്ചിനെ മാറ്റുക', 'Clear', 'bucket', '🐌', 'garden', 'Monsoon guests are not always invited.'),
  a('l45', 'cow', 'Offer a Coconut Husk Scratch', 'തേങ്ങച്ചിരട്ട കൊണ്ട് ചൊറിയുക', 'Scratch', 'grass', '🥥', 'animals', 'Lakshmi closes her eyes in approval.'),
  a('l46', 'well', 'Wash the Brass Lota', 'ലോട്ട കഴുകുക', 'Wash', 'bucket', '🏺', 'water', 'Cold water gives the brass its bright voice again.'),
  a('l47', 'tap', 'Fix the Garden Elbow Joint', 'ഗാർഡൻ പൈപ്പ് ജോയിന്റ്', 'Fix', 'wrench', '🔩', 'repair', 'One loose elbow can turn the garden into a pond.'),
  a('l48', 'fuse', 'Reset the Fridge Socket', 'ഫ്രിഡ്ജ് സോക്കറ്റ് ശരിയാക്കുക', 'Reset', null, '❄️', 'repair', 'The mangoes need their cool corner.'),
  a('l49', 'sweep', 'Brush the Prayer Mat Area', 'പ്രാർത്ഥനസ്ഥലം വൃത്തിയാക്കുക', 'Brush', 'broom', '🧎', 'heritage', 'A clean patch of floor is a kind of invitation.'),
  a('l50', 'stove', 'Temper Mustard for Curry', 'കടുക് പൊട്ടിക്കുക', 'Temper', null, '🥘', 'food', 'Listen for the tiny fireworks in the coconut oil.'),

  a('l51', 'lamp', 'Prepare the Festival Deepam', 'ഉത്സവ ദീപം ഒരുക്കുക', 'Prepare', 'match', '🪔', 'festival', 'The diya is small, but its circle of light is wide.'),
  a('l52', 'plants', 'String the Jasmine Buds', 'മുല്ലപ്പൂ കോർക്കുക', 'String', 'bucket', '🌸', 'garden', 'The garland will travel from garden to hair before dusk.'),
  a('l53', 'cow', 'Check Lakshmi’s Bell', 'പശുമണി പരിശോധിക്കുക', 'Check', 'grass', '🔔', 'animals', 'The bell should announce her without frightening the birds.'),
  a('l54', 'well', 'Draw Water for Pickling', 'അച്ചാറിന് വെള്ളം കോരുക', 'Draw', 'bucket', '🥒', 'water', 'The kitchen needs clear water for the lime pickle jars.'),
  a('l55', 'tap', 'Repair the Handwash Tap', 'കൈ കഴുകുന്ന ടാപ്പ് ശരിയാക്കുക', 'Repair', 'wrench', '🧼', 'repair', 'Guests always find the one tap that needs attention.'),
  a('l56', 'fuse', 'Restore the Hall Light', 'ഹാൾ ലൈറ്റ് ശരിയാക്കുക', 'Restore', null, '💡', 'repair', 'The carved frames look different in proper light.'),
  a('l57', 'sweep', 'Sweep Rice Grains from the Floor', 'അരി വാരുക', 'Sweep', 'broom', '🌾', 'food', 'Not one grain should go to waste in this house.'),
  a('l58', 'stove', 'Warm Banana Chips', 'കായ വറുത്തത് ചൂടാക്കുക', 'Warm', null, '🍌', 'food', 'The crunch belongs beside a glass of strong tea.'),
  a('l59', 'lamp', 'Place the Prayer Lamp', 'പൂജാ വിളക്ക് വെക്കുക', 'Place', 'match', '🛕', 'heritage', 'A tiny lamp turns the corner shrine into a sanctuary.'),
  a('l60', 'plants', 'Fill the Seedling Tray', 'തൈ ട്രേ നനയ്ക്കുക', 'Fill', 'bucket', '🌱', 'garden', 'The next garden is waiting in miniature.'),

  a('l61', 'cow', 'Mix the Bran Feed', 'തവിട് കലക്കുക', 'Mix', 'grass', '🥣', 'animals', 'A little bran makes the grass bundle feel like a feast.'),
  a('l62', 'well', 'Fill the Clay Filter Pot', 'മൺകുടം നിറയ്ക്കുക', 'Fill', 'bucket', '🏺', 'water', 'The porous pot makes every sip feel like rain.'),
  a('l63', 'tap', 'Secure the Washing Stone Pipe', 'അലക്കുകല്ല് പൈപ്പ് മുറുക്കുക', 'Secure', 'wrench', '🧺', 'repair', 'The wash stone is where every monsoon stain meets its match.'),
  a('l64', 'fuse', 'Check the Inverter Lead', 'ഇൻവെർട്ടർ കണക്ഷൻ നോക്കുക', 'Check', null, '🔋', 'repair', 'A backup light can make a storm feel less dramatic.'),
  a('l65', 'sweep', 'Clear the Back Door Mat', 'പിൻവാതിൽപ്പടി അടിക്കുക', 'Clear', 'broom', '🚪', 'home', 'Mud enters quietly through the back door.'),
  a('l66', 'stove', 'Heat Kanji for Supper', 'കഞ്ഞി ചൂടാക്കുക', 'Heat', null, '🍲', 'food', 'Simple rice gruel is the kindest answer to a rainy evening.'),
  a('l67', 'lamp', 'Clean the Oil Reservoir', 'എണ്ണപ്പാത്രം വൃത്തിയാക്കുക', 'Clean', 'match', '🫙', 'heritage', 'Fresh oil makes for a bright, steady flame.'),
  a('l68', 'plants', 'Water the Pepper Vine', 'കുരുമുളക് വള്ളി നനയ്ക്കുക', 'Water', 'bucket', '🌶️', 'garden', 'The vine reaches for the areca trunk one leaf at a time.'),
  a('l69', 'cow', 'Brush the Cowshed Corner', 'തൊഴുത്ത് വൃത്തിയാക്കുക', 'Brush', 'grass', '🏡', 'animals', 'A clean shed keeps Lakshmi calm through the rain.'),
  a('l70', 'well', 'Refresh the Courtyard Water Bowl', 'മുറ്റത്തെ ജലപാത്രം നിറയ്ക്കുക', 'Refresh', 'bucket', '💦', 'water', 'The afternoon sun turns even stone thirsty.'),

  a('l71', 'tap', 'Tighten the Outdoor Valve', 'പുറത്തെ വാൽവ് മുറുക്കുക', 'Tighten', 'wrench', '🚿', 'repair', 'The hose should wait quietly until the garden calls.'),
  a('l72', 'fuse', 'Check the Temple Bell Circuit', 'മണിയുടെ കണക്ഷൻ നോക്കുക', 'Check', null, '🔔', 'festival', 'A small wire keeps the evening bell from falling silent.'),
  a('l73', 'sweep', 'Sweep Petals for Pookalam', 'പൂക്കളം ഒരുക്കുക', 'Sweep', 'broom', '🌼', 'festival', 'Make room for the petals before Onam morning.'),
  a('l74', 'stove', 'Stir Ada Pradhaman', 'അട പ്രഥമൻ ഇളക്കുക', 'Stir', null, '🍮', 'food', 'Coconut milk, jaggery, and patience become dessert.'),
  a('l75', 'lamp', 'Light the Onam Lamp', 'ഓണവിളക്ക് കൊളുത്തുക', 'Light', 'match', '🌾', 'festival', 'The lamp makes every brass vessel look like gold.'),
  a('l76', 'plants', 'Gather Pookalam Flowers', 'പൂക്കളത്തിനായി പൂക്കൾ ശേഖരിക്കുക', 'Gather', 'bucket', '🌸', 'festival', 'Marigold, ixora, and tiny white thumba flowers.'),
  a('l77', 'cow', 'Offer a Banana Peel Treat', 'വാഴത്തോൽ കൊടുക്കുക', 'Offer', 'grass', '🍌', 'animals', 'Lakshmi insists this is the best part of Onam.'),
  a('l78', 'well', 'Wash the Sadya Leaf Basket', 'സദ്യ ഇലക്കൂട് കഴുകുക', 'Wash', 'bucket', '🍃', 'festival', 'Banana leaves must shine before the feast is served.'),
  a('l79', 'tap', 'Fix the Feast-Wash Faucet', 'സദ്യ ടാപ്പ് ശരിയാക്കുക', 'Fix', 'wrench', '🍽️', 'repair', 'Many hands will need this faucet before lunch.'),
  a('l80', 'fuse', 'Light the Pookalam Veranda', 'പൂക്കളം ലൈറ്റ് ഓണാക്കുക', 'Light', null, '✨', 'festival', 'The flowers need their evening glow.'),

  a('l81', 'sweep', 'Clear the Monsoon Mud Trail', 'മഴച്ചെളി വാരുക', 'Clear', 'broom', '👣', 'home', 'Bare feet have carried the whole yard indoors.'),
  a('l82', 'stove', 'Steam Kozhukatta', 'കൊഴുക്കട്ട വേവിക്കുക', 'Steam', null, '🥟', 'food', 'Jaggery and coconut hide inside soft rice parcels.'),
  a('l83', 'lamp', 'Light the Reading Corner', 'വായനവിളക്ക് കൊളുത്തുക', 'Light', 'match', '📖', 'heritage', 'Grandfather’s newspaper waits beside the teak chair.'),
  a('l84', 'plants', 'Prune the Rose Shoot', 'റോസ് ചെടി വെട്ടുക', 'Prune', 'bucket', '🌹', 'garden', 'A careful cut makes room for tomorrow’s blossom.'),
  a('l85', 'cow', 'Set Out the Evening Fodder', 'വൈകുന്നേരം പുല്ല് വെക്കുക', 'Set out', 'grass', '🌙', 'animals', 'The cowshed grows quiet as the light softens.'),
  a('l86', 'well', 'Draw Water for the Night Pot', 'രാത്രിക്കുള്ള വെള്ളം കോരുക', 'Draw', 'bucket', '🌜', 'water', 'Fill enough for the family before the yard goes dark.'),
  a('l87', 'tap', 'Silence the Midnight Leak', 'രാത്രി ലീക്ക് നിർത്തുക', 'Silence', 'wrench', '🤫', 'repair', 'In a quiet house, a single drop sounds enormous.'),
  a('l88', 'fuse', 'Check the Lantern Charger', 'ലാന്റൺ ചാർജർ നോക്കുക', 'Check', null, '🏮', 'repair', 'The monsoon lantern must be ready before the next storm.'),
  a('l89', 'sweep', 'Sweep the Lamp Ashes', 'വിളക്കിന്റെ ചാരം വാരുക', 'Sweep', 'broom', '🪔', 'heritage', 'Last night’s ash returns gently to the earth.'),
  a('l90', 'stove', 'Make Pepper Rasam', 'കുരുമുളക് രസം ഉണ്ടാക്കുക', 'Simmer', null, '🍜', 'food', 'Pepper rasam clears a head heavy with rain.'),

  a('l91', 'lamp', 'Set the Festival Brass Lamps', 'ഉത്സവ വിളക്കുകൾ ഒരുക്കുക', 'Set', 'match', '🪔', 'festival', 'One lamp becomes eight along the courtyard edge.'),
  a('l92', 'plants', 'Water the Sacred Fig Sapling', 'അരയാൽ തൈ നനയ്ക്കുക', 'Water', 'bucket', '🌳', 'garden', 'A small sapling can outlive every wall around it.'),
  a('l93', 'cow', 'Thank Lakshmi at Dusk', 'ലക്ഷ്മിക്ക് നന്ദി പറയുക', 'Offer', 'grass', '❤️', 'animals', 'She answers with a soft bell and a slower chew.'),
  a('l94', 'well', 'Wash the Brass Festival Plate', 'ഉത്സവ തളിക കഴുകുക', 'Wash', 'bucket', '🥇', 'festival', 'The plate catches firelight once the water clears.'),
  a('l95', 'tap', 'Restore the Courtyard Fountain Line', 'മുറ്റത്തെ ജലലൈൻ ശരിയാക്കുക', 'Restore', 'wrench', '⛲', 'repair', 'A little water returns a voice to the silent courtyard.'),
  a('l96', 'fuse', 'Power the Evening Lamps', 'വൈകുന്നേരം ലൈറ്റുകൾ ഓണാക്കുക', 'Power', null, '🌟', 'festival', 'The house is ready to meet the night.'),
  a('l97', 'sweep', 'Prepare the Moonlit Courtyard', 'നിലാവുമുറ്റം ഒരുക്കുക', 'Prepare', 'broom', '🌕', 'heritage', 'One final sweep lets the moon rest on the oxide floor.'),
  a('l98', 'stove', 'Serve the Final Chaya', 'അവസാന ചായ ഉണ്ടാക്കുക', 'Serve', null, '☕', 'food', 'The last cup is shared slowly, not rushed.'),
  a('l99', 'lamp', 'Light the Grand Nilavilakku', 'വലിയ നിലവിളക്ക് കൊളുത്തുക', 'Light', 'match', '✨', 'heritage', 'All five wicks rise together in a golden crown.'),
  a('l100', 'plants', 'Offer Flowers to the Courtyard', 'മുറ്റത്ത് പൂക്കൾ അർപ്പിക്കുക', 'Offer', 'bucket', '🌸', 'festival', 'The day ends where it began: under the open sky of home.'),
] as const satisfies readonly RawActivity[];

export const ACTIVITY_CATALOGUE_SIZE = RAW_LEVEL_ACTIVITIES.length satisfies 100;
export const MALAYALAM_NOTE_COUNT = ACTIVITY_NOTES_ML.length satisfies 100;

export function validateActivities() {
  const ids = new Set<string>();
  for (const task of [...STARTER_ACTIVITIES, ...LEVEL_ACTIVITIES]) {
    if (ids.has(task.id) || task.steps.length !== 3 || !/[\u0d00-\u0d7f]/.test(task.ml) || !/[\u0d00-\u0d7f]/.test(task.note)) throw new Error(`Invalid activity: ${task.id}`);
    ids.add(task.id);
  }
  return ids.size === 108;
}

export const LEVEL_ACTIVITIES: ActivityDef[] = RAW_LEVEL_ACTIVITIES.map((task, index) => ({
  ...task,
  unlockLevel: index + 1,
}));

export const LEVEL_NAMES = [
  'മുറ്റത്തെ കൂട്ടുകാരൻ',
  'പൂമുഖത്തിന്റെ കാവൽക്കാരൻ',
  'തോട്ടത്തിന്റെ സുഹൃത്ത്',
  'തറവാടിന്റെ പരിപാലകൻ',
  'ദീപത്തിന്റെ കാവൽക്കാരൻ',
];

export function levelFromScore(score: number) {
  if (score < 1000) return 0;
  return Math.min(100, 1 + Math.floor((score - 1000) / 1500));
}

export function scoreForLevel(level: number) {
  if (level <= 0) return 0;
  return 1000 + (level - 1) * 1500;
}

export function scoreForNextLevel(level: number) {
  return level >= 100 ? null : scoreForLevel(level + 1);
}

export function getActivityPool(level: number) {
  const unlocked = LEVEL_ACTIVITIES.filter((task) => task.unlockLevel <= level);
  return unlocked.length ? [...STARTER_ACTIVITIES, ...unlocked] : STARTER_ACTIVITIES;
}