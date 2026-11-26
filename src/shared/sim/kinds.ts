// What each movement kind can do, so systems ask "does it fly?" instead of naming a kind.
// `movement` picks the physics step (sim/physics.ts); these traits are what the rest of the
// engine (AI, combat, contacts, lifts, wanted) needs to know about it. A new kind is one entry.
import type { Movement, VehicleSpec } from '../packs/types';

export interface MovementTraits {
  /** Leaves the ground: has altitude, ignores roads and traffic, sets down on pads and roofs. */
  flies?: boolean;
  /** Lays skid marks and tyre smoke when it slides (render/skids.ts). */
  skids?: boolean;
  /** Lives on water: floats (sinks only once wrecked), meets only other boats and swimmers, and
   *  you get out only at the shore. */
  floats?: boolean;
  /** Runs on its own legs: no wheels drawn; its rider sits astride (drawn like a bike's). */
  legs?: boolean;
  /** Ridden astride (drawn at rider scale): bikes and horses. */
  astride?: boolean;
  /** Runs on a railway (systems/trains.ts moves it): no physics step, boarded only at a station. */
  rails?: boolean;
}

export const MOVEMENTS: Record<Movement, MovementTraits> = {
  wheels: { skids: true },
  bike: { astride: true },
  tracks: {},
  rotor: { flies: true },
  boat: { floats: true },
  legs: { legs: true, astride: true },
  rail: { rails: true },
};

export const onRails = (spec: VehicleSpec): boolean => MOVEMENTS[spec.movement].rails === true;

export const onLegs = (spec: VehicleSpec): boolean => MOVEMENTS[spec.movement].legs === true;
export const astride = (spec: VehicleSpec): boolean => MOVEMENTS[spec.movement].astride === true;

export const flies = (spec: VehicleSpec): boolean => MOVEMENTS[spec.movement].flies === true;
export const floats = (spec: VehicleSpec): boolean => MOVEMENTS[spec.movement].floats === true;
export const skids = (spec: VehicleSpec): boolean => MOVEMENTS[spec.movement].skids === true;
