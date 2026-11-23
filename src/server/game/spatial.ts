// Uniform-grid spatial hash for moving entities, rebuilt every tick.

const CELL = 16;
const DIM = 160; // covers 2560 m

export class SpatialHash<T extends { id: number }> {
  private cells = new Map<number, T[]>();

  clear(): void {
    for (const arr of this.cells.values()) arr.length = 0;
  }

  insert(e: T, x: number, y: number): void {
    const k = key(x, y);
    let arr = this.cells.get(k);
    if (!arr) { arr = []; this.cells.set(k, arr); }
    arr.push(e);
  }

  /** Visits entities whose cell intersects the circle; caller does exact distance checks. */
  query(x: number, y: number, r: number, fn: (e: T) => void): void {
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL);
    const j0 = Math.floor((y - r) / CELL), j1 = Math.floor((y + r) / CELL);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const arr = this.cells.get(j * DIM + i);
        if (arr) for (const e of arr) fn(e);
      }
    }
  }
}

const key = (x: number, y: number): number => Math.floor(y / CELL) * DIM + Math.floor(x / CELL);
