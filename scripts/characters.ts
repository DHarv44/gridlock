// Headless check of saved characters: create (cap and unique names), play in one room, carry
// progress into another, guests can't take a character's name, delete frees the name.
// `npx tsx scripts/characters.ts`
import { rmSync } from 'node:fs';

process.env.GRIDLOCK_DATA = 'data-smoke/characters';
rmSync(process.env.GRIDLOCK_DATA, { recursive: true, force: true });
// Imported after GRIDLOCK_DATA is set: the stores read it when they load.
const { createCharacter, deleteCharacter, getCharacter, listCharacters, nameTaken } = await import('../src/server/characters');
const { Room } = await import('../src/server/room');
const { MAX_CHARACTERS } = await import('../src/shared/packs');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const conn = { send: () => {}, close: () => {} };

const keyA = 'a'.repeat(32), keyB = 'b'.repeat(32);
const made = createCharacter(keyA, 'Rook', { top: 2, hat: 1 });
check(typeof made !== 'string', 'create a character');
if (typeof made === 'string') process.exit(1);
check(createCharacter(keyB, 'rook', {}) === 'That name is taken.', 'names are unique across players');
check(typeof createCharacter(keyA, 'x', {}) === 'string', 'too-short name rejected');
for (let i = 1; i < MAX_CHARACTERS; i++) createCharacter(keyA, `Alt ${i}`, {});
check(listCharacters(keyA).length === MAX_CHARACTERS, `${MAX_CHARACTERS} characters allowed`);
check(typeof createCharacter(keyA, 'One Too Many', {}) === 'string', `a ${MAX_CHARACTERS + 1}th is refused`);
check(listCharacters(keyB).length === 0, 'another key sees none of them');

// Play in room 1: earn cash, buy a car, then leave.
const r1 = new Room('CHRA', 101);
r1.stop();
const p1 = r1.join('ignored', conn, { key: keyA, save: getCharacter(keyA, made.id)! });
if (typeof p1 === 'string') throw new Error(p1);
r1.stop();
check(p1.name === 'Rook' && p1.look?.top === 2, 'joins with its name and look');
p1.cash = 7777; p1.garage.push(3);
// Felonies: a murder and a stolen car go on the record; one trespass spell counts once.
const { crime } = await import('../src/server/game/systems/wanted');
const me = r1.world.peds.get(p1.pid)!;
crime(r1.world, me, 'murder', 0, 0);
crime(r1.world, me, 'vehicleTheft', 0, 0);
crime(r1.world, me, 'trespass', 0, 0);
crime(r1.world, me, 'trespass', 0, 0);
crime(r1.world, me, 'gunfire', 0, 0);
check(p1.felonies.murder === 1 && p1.felonies.vehicleTheft === 1 && p1.felonies.trespass === 1 && !p1.felonies.gunfire, 'felonies recorded by type (with cooldowns, gunfire is not one)');
r1.leave(p1);
const saved = getCharacter(keyA, made.id)!;
check(saved.cash === 7777 && saved.garage.includes(3) && saved.felonies.murder === 1, 'progress and record saved on leave');

// Room 2 (a different city) picks the progress up.
const r2 = new Room('CHRB', 202);
r2.stop();
const p2 = r2.join('ignored', conn, { key: keyA, save: getCharacter(keyA, made.id)! });
if (typeof p2 === 'string') throw new Error(p2);
r2.stop();
check(p2.cash === 7777 && p2.garage.includes(3), 'progress carries into another room');
r2.leave(p2);

check(nameTaken('ROOK'), 'guests cannot use a saved character name');
check(deleteCharacter(keyA, made.id) && !nameTaken('rook'), 'delete frees the name');
check(!deleteCharacter(keyB, listCharacters(keyA)[0].id), 'cannot delete another player\'s character');

console.log(failures ? `${failures} check(s) failed` : 'all character checks passed');
process.exit(failures ? 1 : 0);
