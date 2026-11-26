// Jobs the outfits post: settle a score, burn a rival's wagon, steal a horse, carry a parcel, and
// the odd wild rampage. Rewards in frontier dollars.
import type { GameMode, MissionSpec } from '../../shared/packs/types';

export const MISSIONS: MissionSpec[] = [
  { id: 'settle_score', kind: 'hit', giver: 'gang', title: 'Settle a Score', brief: '{target} of the {rival} has it coming. Find them near {place}. ${reward}.',
    reward: [40, 70], respect: 8, rivalRespect: 6, time: 0, distance: [300, 800], target: { hpMul: 1.4, escorts: 2 } },
  { id: 'burn_wagon', kind: 'torch', giver: 'gang', title: 'Burn Them Out', brief: 'The {rival} have a wagon standing near {place}. Burn it. ${reward}.',
    reward: [30, 55], respect: 6, rivalRespect: 5, time: 0, distance: [300, 800], target: { vehicle: 'covered_wagon', escorts: 1 } },
  { id: 'parcel', kind: 'courier', giver: 'gang', title: 'A Parcel', brief: 'Carry this to {place} and ask no questions. {time} to get it there. ${reward}.',
    reward: [20, 40], respect: 4, rivalRespect: 0, time: 240, distance: [500, 1100] },
  { id: 'dry_creek_horse', kind: 'steal', giver: 'dry_creek', title: 'A Fine Animal', brief: 'There is a {vehicle} tied up near {place}. Bring it to us. ${reward}.',
    reward: [50, 80], respect: 10, rivalRespect: 0, time: 300, distance: [300, 800], target: { vehicle: 'thoroughbred' } },
  { id: 'lantern_coach', kind: 'steal', giver: 'lantern', title: 'The Coach', brief: 'A {vehicle} stands near {place}. Drive it here and we will see what it carries. ${reward}.',
    reward: [60, 90], respect: 10, rivalRespect: 0, time: 300, distance: [400, 900], target: { vehicle: 'buckboard' } },
  { id: 'rampage_dynamite', kind: 'frenzy', giver: 'crate', title: 'Powder Keg', brief: 'Dynamite. {count} kills in {time}.',
    reward: [30, 30], respect: 0, rivalRespect: 0, time: 60, distance: [0, 0], target: { count: 10, weapon: 'dynamite' } },
  { id: 'rampage_rifle', kind: 'frenzy', giver: 'crate', title: 'Sharpshooter', brief: 'A rifle. {count} kills in {time}.',
    reward: [30, 30], respect: 0, rivalRespect: 0, time: 60, distance: [0, 0], target: { count: 12, weapon: 'lever_rifle' } },
];

export const MARK_NAMES = ['Dutch', 'Smiling Jack', 'One-Eye Pete', 'Mule', 'Doc Harlow', 'Big Ed', 'Kid Calder', 'Snake', 'Lefty', 'Preacher', 'Ma Tolliver', 'Red'];

export const MODES: GameMode[] = [
  { id: 'free', name: 'Free roam', score: 'none', target: 0, blurb: 'No rules. Take work from the outfits, buy land, raise hell.' },
  { id: 'frags', name: 'Showdown', score: 'frags', target: 10, blurb: 'First to 10 player kills wins the round.' },
  { id: 'tag', name: 'Wanted Man', score: 'tag', target: 600, blurb: "One player has a price on their head. Kill them and it's on yours. Least time wanted after 10 minutes wins." },
  { id: 'money', name: 'Gold Rush', score: 'earned', target: 500, blurb: 'First to earn $500 this round wins.' },
];
