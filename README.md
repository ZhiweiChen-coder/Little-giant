# Little Giant — MIDI Care Garden

Little Giant is a local React + TypeScript HCI prototype. It turns an AKAI MPK Mini MKII (or the on-screen simulator) into a small care ritual: play a note, hear a marimba tone, and watch a companion dance.

The project is designed for a short classroom demonstration of the interaction loop:

`physical input → MIDI event → sound, movement, and visual feedback`

## Features

- Web MIDI support for MIDI controllers in Chrome
- A local, synthesized marimba sound with a light room reverb
- An on-screen keyboard that mirrors active MIDI notes in real time
- Random dance responses for every note
- Energy accumulation: notes fill the energy meter; 100% triggers fireworks and a celebration dance
- Four care actions: nourish, play, rest, and wake
- Mood, size, and joystick movement controls
- A no-hardware simulator for demonstrations without a MIDI device

## Run locally

Requirements:

- Node.js 20 or later
- Google Chrome (recommended for Web MIDI)

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Click **CONNECT MIDI + SOUND** once before playing. This grants browser audio access and asks Chrome for MIDI access.

Build a production bundle with:

```bash
npm run build
```

## MIDI controls

The default mappings target an AKAI MPK Mini MKII. They are centralised in `src/midiConfig.ts` so they can be adjusted if a controller sends different MIDI messages.

| Controller input | Default MIDI mapping | Little Giant response |
| --- | --- | --- |
| Piano keys | Note On / Note Off | Marimba note, matching on-screen key, random dance, and energy gain |
| Pad 1–4 | Notes 36–39 | Nourish, Play, Rest, Wake |
| Knob 1 | CC 21 | Mood / energy state |
| Knob 2 | CC 22 | Creature size |
| Joystick X | CC 1 | Move left or right |
| Joystick Y | CC 2 | Move up or down |

The on-screen keyboard automatically follows the octave of the most recent MIDI note, so its labels and active key remain visible even when the controller octave changes.

## Audio design

No audio files or back-end service are required. The marimba voice is synthesized in the browser with a fundamental, short inharmonic partials, and a brief mallet strike. A generated impulse response adds a subtle 1.6-second room reverb while keeping the attack clear.

Browsers prevent audio from starting without a user gesture. The **CONNECT MIDI + SOUND** button, or the first on-screen keyboard click, unlocks audio for the session.

## Suggested 30-second demo

1. Open the page in Chrome and click **CONNECT MIDI + SOUND**.
2. Play several piano keys on the controller.
3. Point out the matching keyboard highlights, marimba sounds, dance changes, and rising energy bar.
4. Reach 100% energy to trigger fireworks and the celebration dance.
5. Use a Pad or knob to demonstrate an additional care interaction.

## Research context

The interface uses music and playful physical interaction as a reflective care prompt, not as a medical or therapeutic intervention. Its framing is informed by:

> Saarikallio, S. (2011). Music as emotional self-regulation throughout adulthood. *Psychology of Music, 39*(3), 307–327. https://doi.org/10.1177/0305735610374894

Saarikallio’s qualitative study describes music-related emotional self-regulation as a meaningful part of adult life. Little Giant does not claim to diagnose, treat, or prevent any condition.

## Project structure

```text
src/
  App.tsx        Interaction state, Web MIDI, Web Audio, and UI
  midiConfig.ts  Controller mappings
  styles.css     Care-garden visual system and animations
  types.ts       Shared TypeScript types
```
