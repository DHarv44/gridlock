// Headless checks of GTA2-style mechanics: jump, no reloading, paint shop and drive-in chop shop.
// `npx tsx scripts/gta2check.ts`
import { SERVICES, vehicleIndex, weaponIndex } from '../src/shared/packs';
import { BTN, type InputMsg } from '../src/shared/protocol';
import { giveWeapon, seatPed, spawnVehicle } from '../src/server/game/factory';
import { addHeat } from '../src/server/game/systems/wanted';
import { Room } from '../src/server/room';

process.env.GRIDLOCK_DATA = 'data-smoke';
const room = new Room('GTA2', 777);
room.stop();
const pl = room.join('tester', { send: () => {}, close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world;
const ped = () => w.peds.get(pl.pid)!;
let seq = 0;
const input = (btn: number, n = 1, throttle = 0) => { for (let k = 0; k < n; k++) { pl.queue.push([++seq, 0, 0, throttle, 0, 0, btn, -1] as InputMsg); room.tick(); } };
input(0, 10);
const out: string[] = [];

// Jump.
input(BTN.jump, 1);
out.push(`jump: jumpT after press = ${ped().jumpT.toFixed(2)} (expect ~0.5)`);
input(0, 20);
out.push(`jump: landed = ${ped().jumpT === 0}`);

// No reloading: an SMG fires continuously through clip boundaries.
const smg = weaponIndex('smg');
ped().wi = giveWeapon(ped(), smg, 96);
const h = () => ped().weapons.find((x) => x.w === smg)!;
const before = h().clip + h().ammo;
input(BTN.fire, 120);
out.push(`fire: SMG rounds used in 4 s = ${before - (h().clip + h().ammo)} (13/s with no reload pauses ≈ 52, capped by ${before})`);
out.push(`fire: switched off empty gun = ${ped().weapons[ped().wi].w !== smg || h().clip + h().ammo > 0}`);

// Paint shop: the pad opens a menu on the client; nothing is bought by driving in.
const respray = w.city.services.find((s) => SERVICES[s.spec].verb === 'respray')!;
const car = spawnVehicle(w, vehicleIndex('sedan'), respray.pad!.x + 30, respray.pad!.y, 0);
seatPed(w, ped(), car, 0);
addHeat(pl, 50);
pl.cash = 5000;
input(0, 2);
car.body.x = respray.pad!.x; car.body.y = respray.pad!.y; car.body.vx = 0; car.body.vy = 0;
const color0 = car.color;
input(0, 3);
const untouched = car.color === color0 && pl.cash === 5000;
// The paint shop menu buys a chosen colour (palette index 17, pink).
const err = room.econ.buy(pl, 'respray', '17', respray.id);
out.push(`respray: pad alone sells nothing = ${untouched}; chosen colour ${err ?? `pink = ${car.color === 17}`}, wanted ${pl.wanted} (0 unless cops watching), cash 5000 -> ${pl.cash}`);

// Drive-in chop shop.
const chop = w.city.services.find((s) => SERVICES[s.spec].verb === 'chopshop')!;
car.body.x = chop.pad!.x + 30; car.body.y = chop.pad!.y;
input(0, 2);
const cash1 = pl.cash;
car.body.x = chop.pad!.x; car.body.y = chop.pad!.y; car.body.vx = 0; car.body.vy = 0;
input(0, 3);
out.push(`chop: car sold = ${!w.vehicles.has(car.id)}, cash +${pl.cash - cash1}`);
console.log(out.join('\n'));
