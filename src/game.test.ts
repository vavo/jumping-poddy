import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Kind } from './game';

function advance(g: Game, seconds: number) { for (let i = 0; i < seconds * 120; i++) g.step(1 / 120); }
function scenario(kind: Kind, z = -4) {
  const g = new Game(); g.start(42); g.entities = [{ id: 999, kind, lane: 0, z, y: kind === 'token' ? 0.95 : 0, removed: false }]; return g;
}
test('lane switching clamps and converges to the target lane', () => {
  const g = scenario('rack', -50); g.action('left'); g.action('left'); advance(g, 0.3);
  assert.equal(g.lane, -1); assert.ok(Math.abs(g.x + 2.65) < 0.02);
  g.action('right'); g.action('right'); g.action('right'); advance(g, 0.5); assert.equal(g.lane, 1);
});
test('jump clears both low hardware types and lands', () => {
  for (const kind of ['gpu', 'box'] as const) {
    const g = scenario(kind); g.action('jump'); advance(g, 0.5); assert.equal(g.mode, 'running'); assert.ok(g.y > 1);
    advance(g, 0.4); assert.equal(g.y, 0); assert.equal(g.vy, 0);
  }
});
test('no midair double-jump; down accelerates landing into a slide', () => {
  const g = scenario('rack', -50); g.action('jump'); advance(g, 0.2); const before = g.vy;
  g.action('jump'); assert.equal(g.vy, before); g.action('slide'); advance(g, 0.2);
  assert.equal(g.y, 0); assert.ok(g.slide > 0);
});
test('upright Poddy hits a gate, sliding Poddy passes', () => {
  const standing = scenario('gate'); advance(standing, 0.4); assert.equal(standing.mode, 'over');
  const sliding = scenario('gate'); sliding.action('slide'); advance(sliding, 0.4); assert.equal(sliding.mode, 'running');
  advance(sliding, 0.5); assert.equal(sliding.slide, 0);
});
test('racks cannot be jumped, adjacent lanes are safe', () => {
  const jumping = scenario('rack'); jumping.action('jump'); advance(jumping, 0.4); assert.equal(jumping.mode, 'over');
  const dodging = scenario('rack'); dodging.action('left'); advance(dodging, 0.4); assert.equal(dodging.mode, 'running');
});
test('20 resources activate an eight-second magnet and collision protection', () => {
  const g = scenario('token'); g.charge = 19; advance(g, 0.23); assert.equal(g.tokens, 1); assert.ok(g.overclock > 7.9); assert.equal(g.charge, 0);
  g.entities = [{ id: 1, kind: 'rack', lane: 0, z: -1, y: 0, removed: false }, { id: 2, kind: 'token', lane: 1, z: -1, y: 2.35, removed: false }];
  advance(g, 0.2); assert.equal(g.mode, 'running'); assert.equal(g.tokens, 2); assert.ok(g.events.some(e => e.type === 'smash'));
  g.entities = []; advance(g, 8); assert.equal(g.overclock, 0);
});
test('pause freezes simulation and rejects movement', () => {
  const g = scenario('rack', -50); g.pause(); const before = g.snapshot(); g.action('left'); advance(g, 3);
  assert.deepEqual(g.snapshot(), before); g.pause(); advance(g, 0.1); assert.ok(g.distance > 0);
});
test('crash stops scoring and restart clears transient state', () => {
  const g = scenario('box'); advance(g, 1); assert.equal(g.mode, 'over'); const score = g.score;
  advance(g, 5); assert.equal(g.score, score); g.start(42); assert.equal(g.mode, 'running'); assert.equal(g.score, 0); assert.equal(g.distance, 0); assert.equal(g.charge, 0);
});
test('seeded generation is reproducible and leaves an open lane at every row', () => {
  const a = new Game(); const b = new Game(); a.start(123); b.start(123); assert.deepEqual(a.snapshot(), b.snapshot());
  const rows = new Map<number, Set<number>>();
  for (let i = 0; i < 1000; i++) {
    a.overclock = 100; a.step(1 / 30);
    for (const e of a.entities) if (e.kind !== 'token') {
      const distance = Math.round(a.distance - e.z); if (!rows.has(distance)) rows.set(distance, new Set()); rows.get(distance)!.add(e.lane);
    }
  }
  assert.ok(rows.size > 20); for (const lanes of rows.values()) assert.ok(lanes.size <= 2);
  assert.ok(a.speed > 17 && a.speed <= 29);
});
