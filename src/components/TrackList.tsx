import { AudioTrack } from '../types';
import { INDIAN_LANGUAGES } from '../constants';
import { X, Music, Activity, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface TrackListProps {
  tracks: AudioTrack[];
  onRemoveTrack: (id: string) => void;
  onUpdateLanguage: (id: string, language: string) => void;
  onDetectBPM: (id: string) => void;
  detectingBPMId: string | null;
}

export function TrackList({ tracks, onRemoveTrack, onUpdateLanguage, onDetectBPM, detectingBPMId }: TrackListProps) {
  if (tracks.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <h3 className="text-white font-orbitron text-lg mb-4">Uploaded Tracks ({tracks.length})</h3>
      <div className="space-y-3">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:border-white/20"
          >
            <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-orange-500">
                <Music size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="text-white font-rajdhani font-medium truncate">{track.name}</p>
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  {track.status === 'searching' ? (
                    <span className="text-orange-400 flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> Searching...
                    </span>
                  ) : track.status === 'error' ? (
                    <span className="text-red-400 flex items-center gap-1 text-[10px] uppercase tracking-wider border border-red-500/30 px-1.5 py-0.5 rounded">
                      ⚠️ Placeholder (No Audio)
                    </span>
                  ) : (
                    <>
                      <span>{(track.duration || 0).toFixed(1)}s</span>
                      <span>•</span>
                      <span>{((track.file.size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                    </>
                  )}
                  {track.bpm && (
                    <>
                      <span>•</span>
                      <span className="text-pink-400 font-bold">{track.bpm} BPM</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {!track.bpm && (
                <button
                  onClick={() => onDetectBPM(track.id)}
                  disabled={detectingBPMId === track.id}
                  className="flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 text-pink-400 px-2 py-1.5 rounded border border-pink-500/20 transition-colors disabled:opacity-50"
                  title="Detect BPM with AI"
                >
                  {detectingBPMId === track.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Activity size={12} />
                  )}
                  <span>{detectingBPMId === track.id ? 'Detecting...' : 'Detect BPM'}</span>
                </button>
              )}

              <select
                value={track.language || ''}
                onChange={(e) => onUpdateLanguage(track.id, e.target.value)}
                className="bg-black/50 border border-white/10 text-gray-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-orange-500 font-rajdhani"
              >
                <option value="" disabled>Select Language</option>
                {INDIAN_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onRemoveTrack(track.id)}
                className="text-gray-500 hover:text-red-500 transition-colors p-2"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
