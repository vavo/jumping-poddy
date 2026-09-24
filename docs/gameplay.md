# Gameplay

Keep Poddy running for as long as you can. A collision ends the run unless Overclock is active. Use the results screen to retry or return to the lobby.

## Obstacles

| Hardware | How to pass |
| --- | --- |
| GPU | Jump or switch lanes |
| Unopened hardware box | Jump or switch lanes |
| Server rack | Switch lanes; a jump will not clear it |
| Overhead hardware gate | Slide beneath it or switch lanes |

Press down while airborne to dive into a slide. You cannot double-jump. Slides last 0.8 seconds.

## Resources and scoring

Mint chips represent inference resources. Some float above low obstacles, rewarding a well-timed jump.

```text
score = floor(distance in metres × 3) + collected resources × 50
```

Speed starts at 15 metres per second and increases with distance, up to 29 metres per second. Each generated row reserves an open lane, so you can dodge its obstacles without jumping or sliding.

## Overclock

Collect 20 chips while Overclock is inactive to trigger it. For the next eight seconds, Poddy collects passing chips across all three lanes and destroys obstacles on contact. The HUD shows the remaining time.

Chips collected during Overclock still add points, but do not charge the next activation. After it expires, collect another 20 to activate it again.

## Pause, sound, and saves

Press P or Escape to pause. Leaving the browser tab or window also pauses the run. Use the sound button to toggle music and effects.

The browser stores your best completed-run score under `poddy-best` and your sound choice under `poddy-sound`. There is no shared leaderboard or cloud save. Clearing site data resets both. You can still play if browser storage is unavailable.
