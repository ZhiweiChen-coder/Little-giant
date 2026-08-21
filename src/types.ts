export type PetMood = 'curious' | 'happy' | 'sleepy' | 'excited' | 'calm'

export type MidiEvent = {
  label: string
  detail: string
  accent: 'cyan' | 'coral' | 'yellow'
  time: string
}

export type PetState = {
  mood: PetMood
  energy: number
  size: number
  x: number
  y: number
  facing: 'left' | 'right'
  isSleeping: boolean
  lastAction: string
}

export type MidiConfig = {
  channel: number
  pads: Record<number, string>
  knobs: Record<number, string>
  joystick: { x: number; y: number; press: number }
}
