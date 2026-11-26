import type { GameMode, MissionSpec } from '../../shared/packs/types';

// Jobs offered on gang payphones and by kill-frenzy crates. The engine knows the five kinds;
// everything a job says, pays and asks for lives here.
export const MISSIONS: MissionSpec[] = [
  // Any gang's phone.
  { id: 'hit_lieutenant', kind: 'hit', giver: 'gang', title: 'Hit',
    brief: '{rival} lieutenant {target} is holding court in {place}. Put him down. ${reward}.',
    reward: [2500, 4000], respect: 14, rivalRespect: 10, time: 240, distance: [250, 650], target: { hpMul: 2.5, escorts: 2 } },
  { id: 'torch_ride', kind: 'torch', giver: 'gang', title: 'Torch',
    brief: "The {rival} parked their pride and joy in {place}. Burn it. ${reward}.",
    reward: [1800, 3000], respect: 10, rivalRespect: 8, time: 200, distance: [250, 600], target: { escorts: 2 } },
  { id: 'courier_package', kind: 'courier', giver: 'gang', title: 'Courier',
    brief: 'Package waiting in {place}. Grab it and bring it to the drop before {time}. ${reward}.',
    reward: [1200, 2200], respect: 8, rivalRespect: 0, time: 150, distance: [200, 500] },
  { id: 'rampage_turf', kind: 'frenzy', giver: 'gang', title: 'Turf War',
    brief: 'Show the {rival} whose streets these are. Drop {count} of them in {time}. ${reward}.',
    reward: [2000, 3500], respect: 12, rivalRespect: 12, time: 120, distance: [0, 0], target: { count: 8 } },

  // Gang-specific work.
  { id: 'v22_wheels', kind: 'steal', giver: 'v22', title: 'Green Machine',
    brief: 'A {vehicle} is sitting pretty in {place}. Lift it and bring it to the drop. ${reward}.',
    reward: [2500, 3500], respect: 12, rivalRespect: 0, time: 300, distance: [300, 700], target: { vehicle: 'sports' } },
  { id: 'd9_haul', kind: 'steal', giver: 'd9', title: 'Heavy Lifting',
    brief: 'Need a {vehicle} for a job. One is parked in {place}. Bring it in one piece. ${reward}.',
    reward: [2000, 3200], respect: 12, rivalRespect: 0, time: 300, distance: [300, 700], target: { vehicle: 'semi' } },
  { id: 'oro7_limo', kind: 'steal', giver: 'oro7', title: 'Executive Transport',
    brief: "The old man wants a {vehicle}. There's one in {place}. Deliver it clean. ${reward}.",
    reward: [3000, 4500], respect: 12, rivalRespect: 0, time: 300, distance: [300, 700], target: { vehicle: 'limo' } },
  { id: 'd9_cop_car', kind: 'torch', giver: 'd9', title: 'Pig Roast',
    brief: 'A cop cruiser is parked up in {place}. Make it a bonfire. ${reward}.',
    reward: [3000, 4500], respect: 14, rivalRespect: 0, time: 200, distance: [250, 600], target: { vehicle: 'police' } },

  // Kill-frenzy crates.
  { id: 'frenzy_flame', kind: 'frenzy', giver: 'crate', title: 'Kill Frenzy',
    brief: 'Flamethrower. {count} kills in {time}. Go!', reward: [3000, 3000], respect: 0, rivalRespect: 0,
    time: 60, distance: [0, 0], target: { count: 12, weapon: 'flamethrower' } },
  { id: 'frenzy_smg', kind: 'frenzy', giver: 'crate', title: 'Kill Frenzy',
    brief: 'SMG. {count} kills in {time}. Go!', reward: [2500, 2500], respect: 0, rivalRespect: 0,
    time: 60, distance: [0, 0], target: { count: 15, weapon: 'smg' } },
  { id: 'frenzy_rockets', kind: 'frenzy', giver: 'crate', title: 'Kill Frenzy',
    brief: 'Rocket launcher. {count} kills in {time}. Go!', reward: [4000, 4000], respect: 0, rivalRespect: 0,
    time: 60, distance: [0, 0], target: { count: 10, weapon: 'rpg' } },
];

export const MARK_NAMES = ['Razor', 'Smiley', 'Big Lou', 'Two-Tone', 'Fat Mike', 'Knuckles', 'Lefty', 'Spider', 'Tiny', 'Doc', 'Vinnie', 'El Gato'];

export const MODES: GameMode[] = [
  { id: 'free', name: 'Free roam', score: 'none', target: 0, blurb: 'No rules. Do jobs, buy property, cause trouble.' },
  { id: 'frags', name: 'Frag race', score: 'frags', target: 10, blurb: 'First to 10 player kills wins the round.' },
  { id: 'tag', name: 'Tag', score: 'tag', target: 600, blurb: "One player is it, marked for everyone. Kill someone while you're it and they're it. Least time as it after 10 minutes wins." },
  { id: 'money', name: 'Money race', score: 'earned', target: 50000, blurb: 'First to earn $50,000 this round wins.' },
];

