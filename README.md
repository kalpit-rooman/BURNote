# 🔥 BURNote

A note where you write down what is weighing you down — or whatever you want to let go — then burn it down.

BURNote is a tiny, calming ritual: type it out, hit **Burn it**, and watch the paper catch fire and dissolve into embers and ash. Nothing you write is ever saved, sent, or stored. It only exists on the page until you release it.

## Features

- **Zero persistence** — your note lives only in the text box. It is never written to disk, storage, or any server. Burning it wipes it from memory for good.
- **Canvas fire animation** — the paper ignites from the bottom and burns upward, throwing real flame, ember, and drifting-ash particles.
- **Crackling fire sound** — a warm fire crackle synthesized in the browser (no audio files). Mutable, and off means silent.
- **Calming affirmation** — a gentle message afterward, plus a private count of notes you've released.
- **Pastel light & dark modes** — soft periwinkle-and-blush by day, muted plum by dusk. Follows your system theme, with a toggle to override.
- **Accessible** — respects `prefers-reduced-motion` (a graceful fade instead of particles), keyboard focus states, and `⌘/Ctrl + Enter` to burn.

## Run it

It's plain HTML/CSS/JS — no build step. Serve the folder and open it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or just open `index.html` directly in a browser.

## Files

- `index.html` — structure and controls
- `styles.css` — pastel theme system (both themes) and layout
- `burn.js` — canvas particle engine, burn sequencing, synthesized audio, and state

## Privacy

The only things BURNote stores are your theme/mute preference and a single integer counting how many notes you've burned. Your note text is deliberately never persisted.
