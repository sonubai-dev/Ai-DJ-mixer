export interface AudioTrack {
  id: string;
  file: File | Blob;
  name: string;
  duration: number;
  genre?: string;
  buffer?: AudioBuffer;
  bpm?: number;
  status?: 'uploaded' | 'searching' | 'ready' | 'error';
}

export interface RemixSettings {
  // DJ Mode
  bassBoost: number; // dB
  bass: number; // dB (-12 to +12)
  treble: number; // dB (-12 to +12)
  echoDelay: number; // ms
  echoFeedback: number; // %

  // Slowed Mode
  slowFactor: number; // %
  reverbWet: number; // %
  reverbSize: number; // seconds

  // Spatial Mode (3D/8D/16D)
  panningSpeed: number; // seconds per revolution

  // Mashup Mode
  crossfadeDuration: number; // seconds
}

export type RemixMode = 
  | 'dj' 
  | 'slowed' 
  | 'mashup'
  | '3d' 
  | '8d' 
  | '16d' 
  | '3d-dj' 
  | '3d-slowed' 
  | '8d-dj' 
  | '8d-slowed' 
  | '16d-dj' 
  | '16d-slowed';
