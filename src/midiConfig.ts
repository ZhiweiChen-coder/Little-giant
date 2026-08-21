// MPK Mini MKII defaults. Change these values if your unit sends different CC/note numbers.
export const MIDI_CONFIG = {
  channel: 1,
  pads: { 36: 'Feed', 37: 'Play', 38: 'Nap', 39: 'Wake' },
  knobs: { mood: 21, size: 22 },
  joystick: { x: 1, y: 2, press: 40 },
} as const

export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

export function noteName(note: number) {
  return `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`
}
