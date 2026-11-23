// Instances that belong to a building, so the building can be hidden without extra draw calls: its
// instances (masses, rooftop gear) collapse to nothing and come back. Used by the walk-in cutaway.
import * as THREE from 'three';

interface Entry { mesh: THREE.InstancedMesh; i: number; m: THREE.Matrix4 }

const byOwner = new Map<number, Entry[]>();
const hidden = new Set<number>();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/** Remembers that instance `i` of `mesh` (now at matrix `m`) belongs to `owner`. */
export function ownInstance(owner: number, mesh: THREE.InstancedMesh, i: number, m: THREE.Matrix4): void {
  let list = byOwner.get(owner);
  if (!list) { list = []; byOwner.set(owner, list); }
  list.push({ mesh, i, m: m.clone() });
}

/** Hides or shows everything an owner has. */
export function setHidden(owner: number, hide: boolean): void {
  if (hidden.has(owner) === hide) return;
  if (hide) hidden.add(owner); else hidden.delete(owner);
  for (const e of byOwner.get(owner) ?? []) {
    e.mesh.setMatrixAt(e.i, hide ? ZERO : e.m);
    e.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Owners hidden right now. */
export const hiddenOwners = (): ReadonlySet<number> => hidden;
