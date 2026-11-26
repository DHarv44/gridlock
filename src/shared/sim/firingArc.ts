// Shooting a hand weapon from a vehicle: how far round from straight ahead you can fire. Out of a
// closed car's windows you can't fire behind you (RULES.windowArc); riding open (astride a bike or
// horse, an open-top, a wagon bench) you can twist round further (RULES.openArc). Aircraft guns and
// turrets have their own limits (combat/fire.ts). Shared, so the server refuses what the client
// won't send, and the crosshair shows when a shot can't be taken.
import { angleDiff } from '../math';
import { RULES, type VehicleSpec } from '../packs';
import { astride } from './kinds';

/** Radians either side of the vehicle's heading a rider can fire a hand weapon. */
export const firingArc = (spec: VehicleSpec): number => (spec.openTop || astride(spec) ? RULES.openArc : RULES.windowArc);

/** Can a rider aiming at `aim` fire from a vehicle heading `heading`? */
export const canFireFrom = (spec: VehicleSpec, heading: number, aim: number): boolean => Math.abs(angleDiff(heading, aim)) <= firingArc(spec);

/** `aim` held inside the arc (its nearer edge when it's outside). */
export function withinArc(spec: VehicleSpec, heading: number, aim: number): number {
  const arc = firingArc(spec), d = angleDiff(heading, aim);
  return Math.abs(d) <= arc ? aim : heading + Math.sign(d) * arc;
}
