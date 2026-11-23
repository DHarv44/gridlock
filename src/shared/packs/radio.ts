// Radio stations you can tune to in vehicles. Tracks are the audio files in each station's folder
// (see server/radio.ts); the order here is the order the radio key cycles through, after Off.
export interface RadioStation { id: string; name: string; color: string }

export const RADIO: RadioStation[] = [
  { id: 'weather', name: 'Weather Station', color: '#7fd1e8' },
];
