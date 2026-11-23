// The player's map waypoint and its road route, re-planned as you move; cleared on arrival.
import type { City } from '../../shared/world/cityTypes';
import { type Pt, Router } from './route';

const REPLAN_S = 0.5;
const ARRIVE_M = 18;

export class Waypoint {
  point: Pt | null = null;
  route: Pt[] = [];
  private router: Router;
  private t = 0;
  onArrive: () => void = () => {};

  constructor(city: City) {
    this.router = new Router(city);
  }

  set(p: Pt | null, from: Pt | null): void {
    this.point = p;
    this.route = p && from ? this.router.route(from, p) : [];
    this.t = performance.now() / 1000;
  }

  update(from: Pt): void {
    if (!this.point) return;
    if (Math.hypot(this.point.x - from.x, this.point.y - from.y) < ARRIVE_M) {
      this.set(null, null);
      this.onArrive();
      return;
    }
    const now = performance.now() / 1000;
    if (now - this.t < REPLAN_S) {
      // Between re-plans the line still starts at you.
      if (this.route.length) this.route[0] = from;
      return;
    }
    this.t = now;
    this.route = this.router.route(from, this.point);
  }
}
