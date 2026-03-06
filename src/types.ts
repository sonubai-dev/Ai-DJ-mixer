export interface AudioTrack {
  id: string;
  file: File | Blob;
  name: string;
  duration: number;
  language?: string;
  buffer?: AudioBuffer;
  bpm?: number;
}

export interface RemixSettings {
  // DJ Mode
  bassBoost: number; // dB
  echoDelay: number; // ms
  echoFeedback: number; // %

  // Slowed Mode
  slowFactor: number; // %
  reverbWet: number; // %
  reverbSize: number; // seconds

  // Mashup Mode
  crossfadeDuration: number; // seconds
}

export type RemixMode = 'dj' | 'slowed' | 'mashup';
