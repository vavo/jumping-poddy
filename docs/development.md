# Development

## Setup

Use Node.js 22.12 or newer. Install the locked dependency versions with `npm ci`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server at `http://127.0.0.1:5199/` |
| `npm test` | Simulation tests through Node's test runner and tsx |
| `npm run build` | TypeScript check and production bundle |
| `npm run preview` | Built game at `http://127.0.0.1:5200/runpod/` |

Both servers use strict ports. Stop an existing instance or choose a different port if one is occupied. The `private` flag in `package.json` prevents accidental npm publication; it does not control the GitHub repository's visibility.

## Source layout

| File | Responsibility |
| --- | --- |
| `src/game.ts` | Serializable state, course generation, movement, collisions, scoring, and events |
| `src/game.test.ts` | Simulation tests |
| `src/scene.ts` | Three.js renderer, procedural models, scenery, particles, and camera |
| `src/main.ts` | Input, DOM interface, game loop, storage, audio events, and browser lifecycle |
| `src/audio.ts` | Synthesized effects and the bass/percussion loop |
| `src/style.css` | Fonts, menus, HUD, and responsive layouts |
| `index.html` | Page structure and interface elements |
| `vite.config.ts` | Root development URL and `/runpod/` production base |

## Simulation and rendering

The simulation runs in 1/120-second steps. Game state lives in `Game`, separate from the Three.js scene. Rendering follows that state and consumes events for effects.

Lane centres are at x = -2.65, 0, and 2.65. Poddy stays at z = 0; obstacles approach from negative z. The y coordinate represents jump height. Simple collision volumes handle the runner mechanics.

Course generation uses a seeded pseudo-random sequence. Normal runs pick a new seed; `?test=1` uses seed 42 for repeatable browser checks. Static geometry and model templates reduce draw calls and avoid rebuilding assets for each obstacle.

## Browser diagnostics

Open the browser console while the game is loaded:

```js
JSON.parse(window.render_game_to_text());
window.advanceTime(500);
window.resumeRealtime();
```

`render_game_to_text()` reports the mode, player, nearby entities, score, resources, power-up state, and renderer statistics. `advanceTime(ms)` switches to manual stepping and advances in fixed steps. Call `resumeRealtime()` to restore the animation loop.

## Verification

Run `npm test` and `npm run build` before pushing changes. The nine simulation tests cover lane bounds, jumping and diving, obstacle collisions, Overclock, pause, retry, and seeded course fairness.

For changes to rendering or input, also check the browser:

1. Start a run; move through all lanes, jump, slide, and collect chips.
2. Crash, retry, pause, and resume. Check saved scores and sound after reload.
3. Check Overclock activation and expiry.
4. Inspect desktop and phone screenshots, including a 320 × 568 viewport.
5. Check browser console errors and missing network assets.

Initial browser acceptance covered a 480-metre run, 121 resources, and Overclock, with a peak of 288 draw calls. Phone checks used browser emulation, not physical devices. Treat these as baseline observations, not performance guarantees.
