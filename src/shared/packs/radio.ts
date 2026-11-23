// Radio stations you can tune to in vehicles. Tracks are the audio files in each station's folder
// (see server/radio.ts); the order here is the order the radio key cycles through, after Off.
export interface RadioStation { id: string; name: string; color: string }

export const RADIO: RadioStation[] = [
  // id is the station's folder (radio/weather/); name is what players see.
  { id: 'weather', name: '98.2 The Spa', color: '#7fd1e8' },
];
