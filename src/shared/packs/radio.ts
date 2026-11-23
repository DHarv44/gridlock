// Radio stations you can tune to in vehicles. Tracks are the audio files in each station's folder
// (see server/radio.ts); the order here is the order the radio key cycles through, after Off.
/** `font` is the station name's typeface (a CSS font family, bundled by client/audio/radioFonts.ts). */
export interface RadioStation { id: string; name: string; color: string; font: string }

export const RADIO: RadioStation[] = [
  // id is the station's folder (radio/weather/); name is what players see.
  { id: 'eagle', name: '97.1 The Eagle', color: '#d9822b', font: 'Rye' },
  { id: 'weather', name: '98.2 The Spa', color: '#7fd1e8', font: 'Comfortaa' },
  { id: 'jazzy', name: '99.9 Jazzy J', color: '#e8b04c', font: 'Yellowtail' },
  { id: 'trunk', name: '102.2 Funk in the Trunk', color: '#ff5fa2', font: 'Shrikhand' },
  { id: 'talk', name: '103.3 The Talking Heads', color: '#b9a4ff', font: 'Bebas Neue' },
  { id: 'kiss', name: '106.1 KISS FM', color: '#ff3b3b', font: 'Monoton' },
];
