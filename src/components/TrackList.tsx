import { useRef, useState, ChangeEvent } from 'react';
import { AudioTrack } from '../types';
import { INDIAN_LANGUAGES } from '../constants';
import { X, Music, Activity, Loader2, Upload } from 'lucide-react';
import clsx from 'clsx';

interface TrackListProps {
  tracks: AudioTrack[];
  onRemoveTrack: (id: string) => void;
  onUpdateLanguage: (id: string, language: string) => void;
  onDetectBPM: (id: string) => void;
  onReplaceTrack: (id: string, file: File) => void;
  detectingBPMId: string | null;
}

export function TrackList({ tracks, onRemoveTrack, onUpdateLanguage, onDetectBPM, onReplaceTrack, detectingBPMId }: TrackListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const handleReplaceClick = (id: string) => {
    setReplacingId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && replacingId) {
      onReplaceTrack(replacingId, file);
    }
    setReplacingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (tracks.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="audio/*" 
        onChange={handleFileChange} 
      />
      <h3 className="text-white font-orbitron text-lg mb-4">Uploaded Tracks ({tracks.length})</h3>
      <div className="space-y-3">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-gray-900 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 hover:border-white/30 hover:bg-gray-800 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] group"
          >
            <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
              <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center text-white shadow-inner group-hover:scale-105 transition-all">
                <Music size={24} />
              </div>
              <div className="overflow-hidden">
                <p className="text-white font-rajdhani font-bold text-xl truncate tracking-wide group-hover:text-orange-200 transition-colors drop-shadow-md">{track.name}</p>
                <div className="flex items-center gap-3 text-gray-300 text-xs font-bold tracking-wide">
                  {track.status === 'searching' ? (
                    <span className="text-orange-400 flex items-center gap-1.5 drop-shadow-sm">
                      <Loader2 size={12} className="animate-spin" /> Searching...
                    </span>
                  ) : track.status === 'error' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider border border-red-500/40 bg-red-500/10 px-2 py-1 rounded shadow-sm">
                        ⚠️ Placeholder (No Audio)
                      </span>
                      <button 
                        onClick={() => handleReplaceClick(track.id)}
                        className="flex items-center gap-1.5 text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded transition-all border border-white/10 hover:border-white/30 shadow-sm"
                      >
                        <Upload size={12} /> Upload File
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-blue-200">Duration: {Math.round(track.duration || 0)}s</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-blue-200">{((track.file.size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                    </>
                  )}
                  {track.bpm && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-orange-400 font-black flex items-center gap-1 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                        <Activity size={10} /> {track.bpm} BPM
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {!track.bpm && track.status !== 'error' && track.status !== 'searching' && (
                <button
                  onClick={() => onDetectBPM(track.id)}
                  disabled={detectingBPMId === track.id}
                  className="flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 text-orange-400 px-2 py-1.5 rounded border border-orange-500/20 transition-colors disabled:opacity-50"
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
