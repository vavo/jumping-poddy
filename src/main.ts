import './style.css';
import { Game, type Action } from './game';
import { GameScene } from './scene';
import { Audio } from './audio';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const game = new Game();
const audio = new Audio();
let view: GameScene;
let best = 0;
let previousMode = game.mode;
let toastTime = 0;
let externalStep = false;
let last = 0;
let accumulator = 0;
let finishSaved = false;
let newRecord = false;
const hidden = (id: string, hide: boolean) => $(id).classList.toggle('hidden', hide);
const padded = (value: number) => String(value).padStart(5, '0');
try { best = Math.max(0, Number(localStorage.getItem('poddy-best')) || 0); audio.enabled = localStorage.getItem('poddy-sound') !== 'off'; } catch { /* Storage can be unavailable in private contexts. */ }

function soundIcon() {
  $('sound-btn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m11 4-6 5H2v6h3l6 5V4Z"/>${audio.enabled ? '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>' : '<path d="m16 9 6 6m0-6-6 6"/>'}</svg>`;
  $('sound-btn').setAttribute('aria-label', audio.enabled ? 'Mute sound' : 'Enable sound');
  $('sound-btn').title = audio.enabled ? 'Sound on' : 'Sound off';
}
function announce(message: string, seconds = 2) { $('toast').textContent = message; toastTime = seconds; $('toast').classList.add('visible'); }
function start() {
  if (!view) return;
  audio.unlock(); audio.play('start');
  view.reset(); game.start(new URLSearchParams(location.search).has('test') ? 42 : undefined);
  finishSaved = false; newRecord = false; toastTime = 0; accumulator = 0;
  updateUI();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}
function home() { game.mode = 'menu'; game.entities = []; game.overclock = 0; view.reset(); toastTime = 0; updateUI(); }
function pause() { game.pause(); updateUI(); }
function finish() {
  if (finishSaved) return;
  finishSaved = true; newRecord = game.score > best;
  if (newRecord) {
    best = game.score;
    try { localStorage.setItem('poddy-best', String(best)); } catch { /* The run remains playable without storage. */ }
  }
  const advice = { box: 'Jump the boxes. Save the unboxing for later.', gpu: 'Jump those GPUs. They’re expensive speed bumps.', rack: 'Switch lanes. A server rack always wins.', gate: 'Slide under the hardware. Mind the bandwidth.' };
  $('crash-copy').textContent = advice[game.cause as keyof typeof advice] || 'One more run. You’ve got this.';
  $('final-score').textContent = game.score.toLocaleString();
  $('final-tokens').textContent = String(game.tokens);
  $('final-distance').innerHTML = `${Math.floor(game.distance)}<small>m</small>`;
  $('record-line').textContent = newRecord ? '✦ NEW PERSONAL BEST' : `PERSONAL BEST  ${best.toLocaleString()}`;
  $('over-eyebrow').textContent = newRecord ? 'A LITTLE FASTER. A LITTLE FURTHER.' : 'CONNECTION INTERRUPTED';
}
function updateUI() {
  const menu = game.mode === 'menu'; const playing = game.mode === 'running';
  $('app').dataset.mode = game.mode;
  $('app').classList.toggle('overclock', game.overclock > 0 && playing);
  for (const id of ['menu', 'menu-footer', 'hero-label']) hidden(id, !menu);
  hidden('hud', menu || game.mode === 'over');
  hidden('pause-btn', !playing && game.mode !== 'paused');
  hidden('pause-panel', game.mode !== 'paused');
  hidden('over-panel', game.mode !== 'over');
  hidden('touch-controls', !playing);
  hidden('run-hint', !playing || game.time > 8);
  $('pause-btn').setAttribute('aria-label', game.mode === 'paused' ? 'Resume game' : 'Pause game');
  $('score').textContent = padded(game.score);
  $('distance').textContent = String(Math.floor(game.distance));
  $('speed').textContent = String(Math.floor(game.speed));
  $('tokens').textContent = String(game.tokens);
  $('charge-fill').style.width = `${game.overclock > 0 ? game.overclock / 8 * 100 : game.charge / 20 * 100}%`;
  $('charge-label').textContent = game.overclock > 0 ? `OVERCLOCK · ${game.overclock.toFixed(1)}s` : `${game.charge} / 20 TO OVERCLOCK`;
  $('best-top').textContent = padded(best);
  $('toast').classList.toggle('visible', toastTime > 0 && playing);
  if (previousMode !== game.mode) {
    if (game.mode === 'over') $('retry-btn').focus({ preventScroll: true });
    if (game.mode === 'paused') $('resume-btn').focus({ preventScroll: true });
    previousMode = game.mode;
  }
}
function tick(dt: number) {
  game.step(dt);
  for (const event of game.events.splice(0)) {
    audio.play(event.type, game.tokens);
    if (event.type === 'collect' || event.type === 'smash') view.burst(event.lane ?? game.lane);
    if (event.type === 'crash') { view.burst(game.lane, true); finish(); }
    if (event.type === 'overclock') announce('OVERCLOCK!  MAGNET ON. LIMITS OFF.', 3);
  }
  if (game.mode === 'running') toastTime = Math.max(0, toastTime - dt);
  audio.update(game.time, game.mode === 'running');
}

const actionMap: Record<string, Action> = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'slide', KeyS: 'slide' };
window.addEventListener('keydown', e => {
  if (e.code === 'Tab') return;
  if (e.code in actionMap || ['Enter', 'KeyP', 'Escape', 'KeyF'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Enter' && (game.mode === 'menu' || game.mode === 'over')) start();
  else if (e.code === 'Enter' && game.mode === 'paused') pause();
  else if (e.code === 'KeyP' || e.code === 'Escape') pause();
  else if (e.code === 'KeyF') {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => announce('FULLSCREEN UNAVAILABLE IN THIS BROWSER'));
  } else if (actionMap[e.code]) game.action(actionMap[e.code]);
});
$('start-btn').addEventListener('click', start);
$('retry-btn').addEventListener('click', start);
$('resume-btn').addEventListener('click', pause);
$('pause-btn').addEventListener('click', pause);
$('quit-btn').addEventListener('click', home);
$('home-btn').addEventListener('click', home);
document.querySelector('.brand')!.addEventListener('click', e => { e.preventDefault(); if (game.mode === 'running') pause(); else if (game.mode !== 'paused') home(); });
$('sound-btn').addEventListener('click', () => { audio.toggle(); soundIcon(); try { localStorage.setItem('poddy-sound', audio.enabled ? 'on' : 'off'); } catch {} });
for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-action]')) btn.addEventListener('pointerdown', e => { e.preventDefault(); game.action(btn.dataset.action as Action); });
let pointer: { x: number; y: number; id: number } | null = null;
$('world').addEventListener('pointerdown', e => { pointer = { x: e.clientX, y: e.clientY, id: e.pointerId }; $('world').setPointerCapture(e.pointerId); });
$('world').addEventListener('pointerup', e => {
  if (!pointer || e.pointerId !== pointer.id) return;
  const dx = e.clientX - pointer.x; const dy = e.clientY - pointer.y; pointer = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  game.action(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'slide' : 'jump');
});
$('world').addEventListener('pointercancel', () => { pointer = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.mode === 'running') { game.pause(); updateUI(); } });
window.addEventListener('blur', () => { if (game.mode === 'running') { game.pause(); updateUI(); } });
window.addEventListener('resize', () => { view?.resize(); view?.render(game, 0); });
$('world').addEventListener('webglcontextlost', e => { e.preventDefault(); if (game.mode === 'running') pause(); $('error-panel').textContent = 'The graphics connection was interrupted. Restoring Poddy…'; hidden('error-panel', false); });
$('world').addEventListener('webglcontextrestored', () => location.reload());
soundIcon(); updateUI();
try {
  view = new GameScene($<HTMLCanvasElement>('world'));
  view.render(game, 1 / 60);
  function frame(now: number) {
    const dt = Math.min((now - (last || now)) / 1000, 0.08); last = now;
    if (!externalStep) {
      accumulator += dt;
      while (accumulator >= 1 / 120) { tick(1 / 120); accumulator -= 1 / 120; }
      view.render(game, dt); updateUI();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  $('error-panel').textContent = 'Poddy needs WebGL to run. Enable hardware acceleration in your browser, then reload.';
  hidden('error-panel', false);
}
Object.assign(window, {
  render_game_to_text: () => JSON.stringify({ ...game.snapshot(), best, sound: audio.enabled, graphics: view?.stats() }),
  advanceTime: (ms: number) => {
    externalStep = true;
    const steps = Math.max(1, Math.round(ms / (1000 / 120)));
    for (let i = 0; i < steps; i++) tick(1 / 120);
    view.render(game, steps / 120);
    updateUI();
  },
  resumeRealtime: () => { externalStep = false; last = performance.now(); accumulator = 0; }
});
