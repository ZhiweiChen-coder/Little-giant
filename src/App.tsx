import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MIDI_CONFIG, noteName } from './midiConfig'
import type { MidiEvent, PetMood, PetState } from './types'

const initialPet: PetState = { mood: 'calm', energy: 18, size: 1.5, x: 50, y: 53, facing: 'right', isSleeping: false, lastAction: 'I am here with you.' }
const initialEvent: MidiEvent = { label: 'READY TO PLAY', detail: 'Press a key to begin your tiny concert', accent: 'cyan', time: 'now' }
const danceMoves = ['dance-bounce', 'dance-sway', 'dance-twirl', 'dance-wiggle']

function App() {
  const [pet, setPet] = useState(initialPet)
  const [events, setEvents] = useState<MidiEvent[]>([initialEvent])
  const [connected, setConnected] = useState(false)
  const [deviceName, setDeviceName] = useState('No MIDI device detected')
  const [isSimulating, setIsSimulating] = useState(true)
  const [danceMove, setDanceMove] = useState('dance-sway')
  const [soundReady, setSoundReady] = useState(false)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const [activeNotes, setActiveNotes] = useState<number[]>([])
  const [keyboardStartNote, setKeyboardStartNote] = useState(48)
  const midiRef = useRef<MIDIAccess | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const reverbRef = useRef<ConvolverNode | null>(null)
  const energyRef = useRef(initialPet.energy)
  const celebrationTimeoutRef = useRef<number | null>(null)
  const noteReleaseTimeoutsRef = useRef(new Map<number, number>())

  const pushEvent = useCallback((event: Omit<MidiEvent, 'time'>) => {
    setEvents((current) => [{ ...event, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...current].slice(0, 4))
  }, [])

  const wakeAudio = useCallback(async () => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return null
    if (!audioRef.current) audioRef.current = new AudioContextClass()
    if (audioRef.current.state === 'suspended') await audioRef.current.resume()
    setSoundReady(true)
    return audioRef.current
  }, [])

  const ensureReverb = useCallback((audio: AudioContext) => {
    if (reverbRef.current) return reverbRef.current
    const reverb = audio.createConvolver()
    const impulseLength = Math.floor(audio.sampleRate * 1.6)
    const impulse = audio.createBuffer(2, impulseLength, audio.sampleRate)
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel)
      for (let index = 0; index < impulseLength; index += 1) {
        const decay = Math.pow(1 - index / impulseLength, 2.7)
        data[index] = (Math.random() * 2 - 1) * decay
      }
    }
    const wetGain = audio.createGain()
    wetGain.gain.value = 0.19
    reverb.buffer = impulse
    reverb.connect(wetGain).connect(audio.destination)
    reverbRef.current = reverb
    return reverb
  }, [])

  const playMarimbaNote = useCallback(async (note: number, velocity = 100) => {
    const audio = await wakeAudio()
    if (!audio) return
    const reverb = ensureReverb(audio)
    const now = audio.currentTime
    const frequency = 440 * Math.pow(2, (note - 69) / 12)
    const filter = audio.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(4300, now)
    filter.frequency.exponentialRampToValueAtTime(950, now + 1.3)
    const masterGain = audio.createGain()
    masterGain.gain.setValueAtTime(0.0001, now)
    masterGain.gain.exponentialRampToValueAtTime(0.15 * (velocity / 127), now + 0.008)
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35)
    const partials = [{ ratio: 1, level: 1, decay: 1.35 }, { ratio: 3.01, level: 0.25, decay: 0.62 }, { ratio: 4.16, level: 0.12, decay: 0.36 }]
    partials.forEach(({ ratio, level, decay }) => {
      const oscillator = audio.createOscillator()
      const partialGain = audio.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency * ratio, now)
      partialGain.gain.setValueAtTime(level, now)
      partialGain.gain.exponentialRampToValueAtTime(0.0001, now + decay)
      oscillator.connect(partialGain).connect(filter)
      oscillator.start(now); oscillator.stop(now + decay + 0.04)
    })
    const strike = audio.createOscillator()
    const strikeGain = audio.createGain()
    strike.type = 'sine'
    strike.frequency.setValueAtTime(frequency * 7.4, now)
    strikeGain.gain.setValueAtTime(0.06 * (velocity / 127), now)
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055)
    strike.connect(strikeGain).connect(filter)
    strike.start(now); strike.stop(now + 0.06)
    filter.connect(masterGain).connect(audio.destination)
    masterGain.connect(reverb)
  }, [ensureReverb, wakeAudio])

  const changePet = useCallback((action: string, updates: Partial<PetState>, event: Omit<MidiEvent, 'time'>) => {
    if (updates.energy !== undefined) energyRef.current = updates.energy
    setPet((current) => ({ ...current, ...updates, lastAction: action }))
    pushEvent(event)
  }, [pushEvent])

  const releaseNote = useCallback((note: number) => {
    const timeout = noteReleaseTimeoutsRef.current.get(note)
    if (timeout) window.clearTimeout(timeout)
    noteReleaseTimeoutsRef.current.delete(note)
    setActiveNotes((current) => current.filter((activeNote) => activeNote !== note))
  }, [])

  const lightNote = useCallback((note: number, releaseAutomatically: boolean) => {
    setActiveNotes((current) => current.includes(note) ? current : [...current, note])
    setKeyboardStartNote((currentStart) => note < currentStart || note > currentStart + 12 ? Math.floor(note / 12) * 12 : currentStart)
    const existingTimeout = noteReleaseTimeoutsRef.current.get(note)
    if (existingTimeout) window.clearTimeout(existingTimeout)
    if (releaseAutomatically) noteReleaseTimeoutsRef.current.set(note, window.setTimeout(() => releaseNote(note), 420))
  }, [releaseNote])

  const celebrate = useCallback(() => {
    if (celebrationTimeoutRef.current) window.clearTimeout(celebrationTimeoutRef.current)
    setIsCelebrating(true)
    setDanceMove('dance-celebrate')
    pushEvent({ label: 'ENERGY FULL / GARDEN GLOW', detail: '100% · a little celebration for you', accent: 'yellow' })
    celebrationTimeoutRef.current = window.setTimeout(() => {
      setIsCelebrating(false)
      energyRef.current = 18
      setPet((current) => ({ ...current, energy: 18, mood: 'calm', lastAction: 'A new little wish is growing.' }))
    }, 2200)
  }, [pushEvent])

  const danceToNote = useCallback((note: number, velocity: number, source: 'MIDI' | 'SIMULATOR') => {
    setDanceMove(danceMoves[Math.floor(Math.random() * danceMoves.length)])
    lightNote(note, source === 'SIMULATOR')
    void playMarimbaNote(note, velocity)
    const notePosition = Math.max(18, Math.min(82, 50 + ((note % 12) - 5.5) * 5))
    const energyGain = Math.max(7, Math.round(velocity / 8))
    const nextEnergy = Math.min(100, energyRef.current + energyGain)
    const hasFilledEnergy = nextEnergy === 100
    energyRef.current = nextEnergy
    setPet((current) => ({ ...current, mood: 'happy', energy: nextEnergy, x: notePosition, isSleeping: false, facing: note % 2 ? 'right' : 'left', lastAction: hasFilledEnergy ? 'Your energy is sparkling!' : `Dancing to ${noteName(note)} ✦` }))
    pushEvent({ label: `${source} NOTE / ${noteName(note)}`, detail: `+${energyGain}% energy · marimba tone`, accent: 'coral' })
    if (hasFilledEnergy) celebrate()
  }, [celebrate, lightNote, playMarimbaNote, pushEvent])

  const triggerPad = useCallback((pad: number) => {
    const action = MIDI_CONFIG.pads[pad as keyof typeof MIDI_CONFIG.pads]
    if (action === 'Feed') changePet('A little snack for my heart.', { mood: 'happy', energy: 100, isSleeping: false }, { label: 'PAD 1 / NOURISH', detail: 'A gentle refill', accent: 'coral' })
    if (action === 'Play') { setDanceMove(danceMoves[Math.floor(Math.random() * danceMoves.length)]); changePet('Come dance with me!', { mood: 'excited', energy: 88, isSleeping: false }, { label: 'PAD 2 / PLAY', detail: 'A joyful little wiggle', accent: 'yellow' }) }
    if (action === 'Nap') changePet('Let’s rest for a moment.', { mood: 'sleepy', energy: 34, isSleeping: true }, { label: 'PAD 3 / REST', detail: 'Slow breath mode', accent: 'cyan' })
    if (action === 'Wake') changePet('Hello again, sunshine.', { mood: 'curious', energy: 68, isSleeping: false }, { label: 'PAD 4 / WAKE', detail: 'Back to the garden', accent: 'coral' })
  }, [changePet])

  const movePet = useCallback((direction: 'left' | 'right' | 'up' | 'down', source = 'Joystick') => {
    setPet((current) => ({ ...current, x: Math.max(18, Math.min(82, current.x + (direction === 'left' ? -5 : direction === 'right' ? 5 : 0))), y: Math.max(36, Math.min(67, current.y + (direction === 'up' ? -4 : direction === 'down' ? 4 : 0))), facing: direction === 'left' ? 'left' : direction === 'right' ? 'right' : current.facing, lastAction: direction === 'up' ? 'A tiny jump!' : `A soft step ${direction}.` }))
    pushEvent({ label: `${source.toUpperCase()} / ${direction.toUpperCase()}`, detail: 'Gentle movement input', accent: 'cyan' })
  }, [pushEvent])

  const setKnob = useCallback((knob: 'mood' | 'size', value: number) => {
    if (knob === 'mood') {
      const moods: PetMood[] = ['sleepy', 'calm', 'curious', 'happy', 'excited']
      const mood = moods[Math.min(moods.length - 1, Math.floor(value / 26))]
      changePet(`Feeling ${mood}.`, { mood, energy: Math.max(24, value) }, { label: 'KNOB 1 / FEELING', detail: `CC 21 · value ${value}`, accent: 'yellow' })
    } else changePet('Growing into the moment.', { size: 1.18 + value / 100 * 0.64 }, { label: 'KNOB 2 / GROW', detail: `CC 22 · value ${value}`, accent: 'coral' })
  }, [changePet])

  const handleMidiMessage = useCallback((message: MIDIMessageEvent) => {
    const [status, noteOrCc, value] = message.data ?? []
    if (status === undefined || noteOrCc === undefined || value === undefined) return
    const command = status & 0xf0
    if (command === 0x90 && value > 0) {
      if (MIDI_CONFIG.pads[noteOrCc as keyof typeof MIDI_CONFIG.pads]) triggerPad(noteOrCc)
      else danceToNote(noteOrCc, value, 'MIDI')
    } else if (command === 0x80 || (command === 0x90 && value === 0)) {
      releaseNote(noteOrCc)
    } else if (command === 0xb0) {
      if (noteOrCc === MIDI_CONFIG.knobs.mood) setKnob('mood', value)
      else if (noteOrCc === MIDI_CONFIG.knobs.size) setKnob('size', value)
      else if (noteOrCc === MIDI_CONFIG.joystick.x) movePet(value < 64 ? 'left' : 'right')
      else if (noteOrCc === MIDI_CONFIG.joystick.y) movePet(value < 64 ? 'up' : 'down')
    }
  }, [danceToNote, movePet, releaseNote, setKnob, triggerPad])

  const connectMidi = async () => {
    await wakeAudio()
    if (!navigator.requestMIDIAccess) { pushEvent({ label: 'MIDI NOT AVAILABLE', detail: 'Please use Chrome for MIDI input', accent: 'coral' }); return }
    try {
      const access = await navigator.requestMIDIAccess()
      midiRef.current = access
      const attachInputs = () => {
        const inputs = [...access.inputs.values()]
        inputs.forEach((input) => { input.onmidimessage = handleMidiMessage })
        setConnected(inputs.length > 0); setIsSimulating(inputs.length === 0); setDeviceName(inputs[0]?.name ?? 'No MIDI device detected')
        return inputs
      }
      const inputs = attachInputs()
      access.onstatechange = () => {
        const nextInputs = attachInputs()
        if (!nextInputs.length) pushEvent({ label: 'DEVICE DISCONNECTED', detail: 'The on-screen piano is still here for you', accent: 'coral' })
      }
      pushEvent({ label: inputs.length ? 'MIDI + SOUND READY' : 'SOUND READY', detail: inputs.length ? `${inputs[0]?.name ?? 'MIDI device'} is listening` : 'Try the on-screen keys below', accent: 'cyan' })
    } catch { pushEvent({ label: 'MIDI PERMISSION BLOCKED', detail: 'Allow MIDI access in Chrome and try again', accent: 'coral' }) }
  }

  useEffect(() => () => { if (midiRef.current) [...midiRef.current.inputs.values()].forEach((input) => { input.onmidimessage = null }); if (celebrationTimeoutRef.current) window.clearTimeout(celebrationTimeoutRef.current); noteReleaseTimeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout)); void audioRef.current?.close() }, [])
  const moodLabel = useMemo(() => pet.isSleeping ? 'resting' : pet.mood, [pet.isSleeping, pet.mood])
  const pianoNotes = useMemo(() => Array.from({ length: 13 }, (_, index) => keyboardStartNote + index), [keyboardStartNote])

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">✿</span><span>LITTLE GIANT</span><small>care through play</small></div><div className="topbar-meta"><span className={soundReady ? 'sound-dot is-on' : 'sound-dot'} /> {soundReady ? 'SOUND ON' : 'SOUND SLEEPS'} <span className="slash">•</span> MIDI PET</div></header>
    <section className="hero"><div><p className="eyebrow">A TINY MUSIC GARDEN</p><h1>Play a note.<br /><em>Let it move through you.</em></h1><p className="hero-copy">Your MIDI controller becomes a gentle way to make sound,<br />move your hands, and watch a little companion dance along.</p></div><div className="care-card"><span className="care-icon">⌁</span><div><strong>Research-informed care</strong><p>Music engagement can support emotional self-regulation across adulthood.</p><small>Saarikallio (2011) · <em>Psychology of Music</em>, 39(3), 307–327.</small></div></div></section>
    <section className="workspace">
      <div className="pet-stage"><div className="cloud cloud-one" /><div className="cloud cloud-two" /><div className="leaf leaf-one">✦</div><div className="leaf leaf-two">✿</div><div className="stage-label"><span>YOUR CARE SPACE</span><span>{connected ? 'MIDI IS LISTENING' : 'PLAY WITH THE SCREEN KEYS'}</span></div>{isCelebrating && <div className="fireworks" aria-label="Energy full celebration"><div className="firework firework-one">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div><div className="firework firework-two">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div><div className="firework firework-three">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div></div>}<div className="pet-ground" /><div className={`pet ${danceMove} pet-${pet.mood} ${pet.isSleeping ? 'pet-sleeping' : ''}`} style={{ left: `${pet.x}%`, top: `${pet.y}%`, transform: `translate(-50%, -50%) scale(${pet.size}) scaleX(${pet.facing === 'left' ? -1 : 1})` }}><div className="aura aura-outer" /><div className="aura aura-mid" /><div className="aura aura-inner" /><div className="pet-shadow" /><div className="pet-body"><div className="ear ear-left" /><div className="ear ear-right" /><div className="tuft tuft-left" /><div className="tuft tuft-right" /><div className="pet-face"><span className="eye eye-left" /><span className="eye eye-right" /><span className="mouth" /><span className="tooth tooth-left" /><span className="tooth tooth-right" /></div><div className="pet-belly" /></div>{pet.isSleeping && <div className="sleep-bubble">z z</div>}</div><div className="speech"><span>✦</span>{pet.lastAction}</div><div className="stage-hint">Every note adds energy · reach 100% to light up the garden</div></div>
      <aside className="side-panel"><div className="panel-block state-block"><div className="panel-heading"><span>HOW YOUR FRIEND FEELS</span><span className="live-tag">● WITH YOU</span></div><div className="state-main"><div className={`mood-orb orb-${pet.mood}`} /><div><small>RIGHT NOW</small><strong>{moodLabel}</strong></div></div><div className="meter-row"><span>ENERGY</span><div className="meter"><i style={{ width: `${pet.energy}%` }} /></div><b>{pet.energy}%</b></div><p className="state-note">Every note adds energy. Reach 100% and light up the garden.</p></div><div className="panel-block event-block"><div className="panel-heading"><span>YOUR LITTLE CONCERT</span><span className="packet-count">LIVE</span></div><div className="event-list">{events.map((event, index) => <div className={`event-item ${index === 0 ? 'event-new' : ''}`} key={`${event.time}-${index}`}><span className={`event-accent ${event.accent}`} /><div><strong>{event.label}</strong><small>{event.detail}</small></div><time>{index === 0 ? 'NOW' : event.time}</time></div>)}</div></div></aside>
    </section>
    <section className="simulator"><div className="sim-title"><span className="eyebrow">TRY A LITTLE MELODY</span><strong>PLAY THE MARIMBA</strong><small>{activeNotes.length ? `NOW PLAYING · ${activeNotes.map(noteName).join(' + ')}` : `KEYBOARD VIEW · ${noteName(keyboardStartNote)}–${noteName(keyboardStartNote + 12)}`}</small></div><div className="keys" aria-label="On-screen marimba keyboard">{pianoNotes.map((note) => <button key={note} className={activeNotes.includes(note) ? 'key is-active' : 'key'} aria-pressed={activeNotes.includes(note)} onClick={() => danceToNote(note, 100, 'SIMULATOR')}><span>{noteName(note)}</span></button>)}</div><div className="sim-controls"><div className="control-group"><label>CARE PADS</label><div className="pads">{Object.entries(MIDI_CONFIG.pads).map(([note, label], index) => <button className={`pad pad-${index + 1}`} key={note} onClick={() => triggerPad(Number(note))}><span>0{index + 1}</span>{label}</button>)}</div></div><div className="control-group knobs-group"><label>FEELING</label><div className="knobs"><label className="knob-control"><input type="range" min="0" max="127" defaultValue="52" onChange={(e) => setKnob('mood', Number(e.target.value))} /><span className="knob" /><small>MOOD</small></label><label className="knob-control"><input type="range" min="0" max="127" defaultValue="52" onChange={(e) => setKnob('size', Number(e.target.value))} /><span className="knob knob-coral" /><small>GROW</small></label></div></div><button className="connect-button" onClick={connectMidi}><span className="connect-symbol">♫</span><span>{connected ? 'MIDI CONNECTED' : 'CONNECT MIDI + SOUND'}</span></button></div></section>
    <footer><span>A gentle HCI moment: touch → sound → movement → release</span><span>Web MIDI + Web Audio · made with care</span></footer>
  </main>
}

export default App
