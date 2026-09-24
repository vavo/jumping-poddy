export type Mode = 'menu' | 'running' | 'paused' | 'over';
export type Kind = 'gpu' | 'box' | 'rack' | 'gate' | 'token';
export type Action = 'left' | 'right' | 'jump' | 'slide';
export interface Entity { id: number; kind: Kind; lane: number; z: number; y: number; removed: boolean }
export type GameEvent = { type: 'jump' | 'slide' | 'collect' | 'overclock' | 'smash' | 'crash'; lane?: number; kind?: Kind };
export const LANES = 2.65;
export const obstacleHeight = { gpu: 0.65, box: 1.0, rack: 3.1, gate: 3.1 };

export class Game {
  mode: Mode = 'menu';
  lane = 0;
  x = 0;
  y = 0;
  vy = 0;
  slide = 0;
  distance = 0;
  speed = 15;
  tokens = 0;
  charge = 0;
  overclock = 0;
  time = 0;
  score = 0;
  entities: Entity[] = [];
  events: GameEvent[] = [];
  cause: Kind = 'box';
  private seed = 42;
  private id = 0;
  private row = 0;
  private nextRow = 0;

  start(seed = Math.floor(Math.random() * 0x7fffffff)) {
    Object.assign(this, { mode: 'running', lane: 0, x: 0, y: 0, vy: 0, slide: 0, distance: 0,
      speed: 15, tokens: 0, charge: 0, overclock: 0, time: 0, score: 0, seed, id: 0, row: 0, nextRow: 35 });
    this.entities = [];
    this.events = [];
    while (this.nextRow < 115) this.spawnRow();
  }

  private random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private add(kind: Kind, lane: number, z: number, y = 0) {
    this.entities.push({ id: ++this.id, kind, lane, z, y, removed: false });
  }

  private spawnRow() {
    const z = this.distance - this.nextRow;
    const safe = this.row < 2 ? -1 : Math.floor(this.random() * 3) - 1;
    const kinds: Kind[] = ['gpu', 'box', 'rack', 'gate'];
    const occupied = [-1, 0, 1].filter(l => l !== safe);
    const kind = this.row === 0 ? 'box' : this.row === 1 ? 'gate' : kinds[Math.floor(this.random() * kinds.length)];
    this.add(kind, occupied[0], z);
    if (this.row > 1 && this.random() > 0.25) this.add(kinds[Math.floor(this.random() * kinds.length)], occupied[1], z);
    for (let i = 0; i < 5; i++) this.add('token', safe, z - 5 + i * 2.7, 0.95);
    if (kind === 'gpu' || kind === 'box') {
      for (let i = 0; i < 3; i++) this.add('token', occupied[0], z - 2.6 + i * 2.6, 2.35);
    }
    this.row++;
    this.nextRow += Math.max(22, this.speed * 1.35);
  }

  action(action: Action) {
    if (this.mode !== 'running') return;
    if (action === 'left') this.lane = Math.max(-1, this.lane - 1);
    if (action === 'right') this.lane = Math.min(1, this.lane + 1);
    if (action === 'jump' && this.y === 0) {
      this.slide = 0;
      this.vy = 10.7;
      this.events.push({ type: 'jump' });
    }
    if (action === 'slide') {
      if (this.y > 0) this.vy = -15;
      this.slide = 0.8;
      this.events.push({ type: 'slide' });
    }
  }

  pause() { if (this.mode === 'running') this.mode = 'paused'; else if (this.mode === 'paused') this.mode = 'running'; }

  step(dt: number) {
    if (this.mode !== 'running') return;
    this.time += dt;
    this.speed = Math.min(29, 15 + this.distance / 230);
    this.distance += this.speed * dt;
    this.x += (this.lane * LANES - this.x) * Math.min(1, dt * 17);
    this.vy -= 27 * dt;
    this.y = Math.max(0, this.y + this.vy * dt);
    if (this.y === 0) this.vy = 0;
    this.slide = Math.max(0, this.slide - dt);
    this.overclock = Math.max(0, this.overclock - dt);
    while (this.nextRow - this.distance < 110) this.spawnRow();
    for (const entity of this.entities) {
      entity.z += this.speed * dt;
      if (entity.removed) continue;
      const dx = Math.abs(entity.lane * LANES - this.x);
      if (entity.kind === 'token') {
        if (Math.abs(entity.z) < 1.05 && ((dx < 0.9 && Math.abs(entity.y - (this.y + 0.95)) < 1) || this.overclock > 0)) {
          entity.removed = true;
          this.tokens++;
          this.events.push({ type: 'collect', lane: entity.lane });
          if (this.overclock === 0 && ++this.charge >= 20) {
            this.charge = 0;
            this.overclock = 8;
            this.events.push({ type: 'overclock' });
          }
        }
      } else if (Math.abs(entity.z) < 0.92 && dx < 1.03) {
        const safe = entity.kind === 'gate' ? this.slide > 0 && this.y < 0.12 : this.y + 0.18 > obstacleHeight[entity.kind];
        if (!safe) {
          if (this.overclock > 0) { entity.removed = true; this.events.push({ type: 'smash', lane: entity.lane }); }
          else {
            this.cause = entity.kind;
            this.mode = 'over';
            this.events.push({ type: 'crash', kind: entity.kind });
            break;
          }
        }
      }
    }
    this.entities = this.entities.filter(e => e.z < 8 && !e.removed);
    this.score = Math.floor(this.distance * 3) + this.tokens * 50;
  }

  snapshot() {
    return { mode: this.mode, coordinates: 'x: lanes -2.65,0,2.65; y: jump height; z: forward is negative, obstacles approach player at z=0',
      player: { lane: this.lane, x: +this.x.toFixed(2), y: +this.y.toFixed(2), vy: +this.vy.toFixed(2), sliding: this.slide > 0 },
      distance: Math.floor(this.distance), speed: +this.speed.toFixed(1), score: this.score, resources: this.tokens,
      charge: this.charge, overclock: +this.overclock.toFixed(1), cause: this.mode === 'over' ? this.cause : undefined,
      entities: this.entities.filter(e => e.z > -65).map(e => ({ kind: e.kind, lane: e.lane, z: +e.z.toFixed(2), y: e.y })) };
  }
}
