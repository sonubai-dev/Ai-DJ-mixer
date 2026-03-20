import { RemixMode, RemixSettings, AudioTrack } from '../types';
import { REMIX_MODES } from '../constants';

interface SettingsPanelProps {
  mode: RemixMode;
  settings: RemixSettings;
  onSettingsChange: (newSettings: RemixSettings) => void;
  tracks?: AudioTrack[];
}

export function SettingsPanel({ mode, settings, onSettingsChange, tracks = [] }: SettingsPanelProps) {
  const handleChange = (key: keyof RemixSettings, value: number) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const isDJ = mode.includes('dj') || mode === 'dj';
  const isSlowed = mode.includes('slowed') || mode === 'slowed';
  const isSpatial = mode.includes('3d') || mode.includes('8d') || mode.includes('16d');
  const isMashup = mode === 'mashup';

  return (
    <div className="bg-secondary border border-white/10 rounded-2xl p-8 mb-8 shadow-2xl shadow-primary/10 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-50" />
      
      <h3 className="text-xl font-display font-bold text-white mb-8 flex items-center">
        <span className="w-1.5 h-8 bg-gradient-to-b from-primary to-accent mr-4 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"></span>
        <span className="tracking-wider">{REMIX_MODES.find(m => m.id === mode)?.label} Settings</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {isDJ && (
          <>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-sans font-bold tracking-widest group-hover:text-primary transition-colors">Bass Boost</label>
                <span className="text-primary font-mono font-bold text-xs bg-primary/10 px-2 py-1 rounded border border-primary/20">{settings.bassBoost}dB</span>
              </div>
              <input
                type="range"
                min="0"
                max="18"
                value={settings.bassBoost}
                onChange={(e) => handleChange('bassBoost', Number(e.target.value))}
                className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
              />
            </div>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-sans font-bold tracking-widest group-hover:text-primary transition-colors">Bass</label>
                <span className="text-primary font-mono font-bold text-xs bg-primary/10 px-2 py-1 rounded border border-primary/20">{settings.bass}dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={settings.bass}
                onChange={(e) => handleChange('bass', Number(e.target.value))}
                className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
              />
            </div>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-sans font-bold tracking-widest group-hover:text-primary transition-colors">Treble</label>
                <span className="text-primary font-mono font-bold text-xs bg-primary/10 px-2 py-1 rounded border border-primary/20">{settings.treble}dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={settings.treble}
                onChange={(e) => handleChange('treble', Number(e.target.value))}
                className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
              />
            </div>
          </>
        )}

        {isSlowed && (
          <div className="space-y-4 group">
            <div className="flex justify-between items-center">
              <label className="text-gray-200 text-sm font-sans font-bold tracking-widest group-hover:text-accent transition-colors">Slow Factor</label>
              <span className="text-accent font-mono font-bold text-xs bg-accent/10 px-2 py-1 rounded border border-accent/20">{settings.slowFactor}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              value={settings.slowFactor}
              onChange={(e) => handleChange('slowFactor', Number(e.target.value))}
              className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent/80 transition-all"
            />
          </div>
        )}

        {(isSlowed || isSpatial) && (
          <>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-sans font-bold tracking-widest group-hover:text-accent transition-colors">Reverb Mix</label>
                <span className="text-accent font-mono font-bold text-xs bg-accent/10 px-2 py-1 rounded border border-accent/20">{settings.reverbWet}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.reverbWet}
                onChange={(e) => handleChange('reverbWet', Number(e.target.value))}
                className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent/80 transition-all"
              />
            </div>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-sans font-bold tracking-widest group-hover:text-accent transition-colors">Room Size</label>
                <span className="text-accent font-mono font-bold text-xs bg-accent/10 px-2 py-1 rounded border border-accent/20">{settings.reverbSize}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="0.1"
                value={settings.reverbSize}
                onChange={(e) => handleChange('reverbSize', Number(e.target.value))}
                className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent/80 transition-all"
              />
            </div>
          </>
        )}

        {isSpatial && (
          <div className="space-y-4 group">
            <div className="flex justify-between items-center">
              <label className="text-gray-200 text-sm font-sans font-bold tracking-widest group-hover:text-accent transition-colors">Panning Speed</label>
              <span className="text-accent font-mono font-bold text-xs bg-accent/10 px-2 py-1 rounded border border-accent/20">{settings.panningSpeed}s</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={settings.panningSpeed}
              onChange={(e) => handleChange('panningSpeed', Number(e.target.value))}
              className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent/80 transition-all"
            />
            <p className="text-xs text-gray-500 font-mono mt-1">
              {mode.includes('16d') ? 'Hyper-fast rotation' : mode.includes('8d') ? 'Standard 8D rotation' : 'Slow 3D drift'}
            </p>
          </div>
        )}

        {isMashup && (
          <div className="col-span-full space-y-6">
            <div className="space-y-4 group max-w-md">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-sans font-bold tracking-widest group-hover:text-primary transition-colors">Crossfade Duration</label>
                <span className="text-primary font-mono font-bold text-xs bg-primary/10 px-2 py-1 rounded border border-primary/20">{settings.crossfadeDuration}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={settings.crossfadeDuration}
                onChange={(e) => handleChange('crossfadeDuration', Number(e.target.value))}
                className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
              />
            </div>

            {/* Enhanced Crossfade Visualizer */}
            {tracks.length >= 2 && (
              <div className="bg-bg/40 rounded-xl p-6 border border-white/5 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-400 font-mono uppercase tracking-wider mb-1">Transition Dynamics</p>
                    <h4 className="text-sm font-display font-bold text-white">Crossfade Curve</h4>
                  </div>
                  <div className="text-[10px] font-mono text-primary-400 bg-primary/5 px-2 py-1 rounded border border-primary/10">
                    {settings.crossfadeDuration}s OVERLAP
                  </div>
                </div>

                <div className="relative h-32 bg-secondary/30 rounded-xl overflow-hidden border border-white/5 group/viz">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex justify-between px-4 pointer-events-none opacity-20">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-px h-full bg-white/20" />
                    ))}
                  </div>

                  <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="fade1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="fade2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>

                    {/* Track 1 Curve (Outgoing) */}
                    <path
                      d={`M 0,20 L ${200 - (settings.crossfadeDuration / 20) * 200},20 L ${200 + (settings.crossfadeDuration / 20) * 200},80 L 400,80`}
                      fill="none"
                      stroke="url(#fade1)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                    
                    {/* Track 2 Curve (Incoming) */}
                    <path
                      d={`M 0,80 L ${200 - (settings.crossfadeDuration / 20) * 200},80 L ${200 + (settings.crossfadeDuration / 20) * 200},20 L 400,20`}
                      fill="none"
                      stroke="url(#fade2)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />

                    {/* Fill Areas */}
                    <path
                      d={`M 0,20 L ${200 - (settings.crossfadeDuration / 20) * 200},20 L ${200 + (settings.crossfadeDuration / 20) * 200},80 L 400,80 L 400,100 L 0,100 Z`}
                      fill="url(#fade1)"
                      fillOpacity="0.1"
                      className="transition-all duration-300"
                    />
                    <path
                      d={`M 0,80 L ${200 - (settings.crossfadeDuration / 20) * 200},80 L ${200 + (settings.crossfadeDuration / 20) * 200},20 L 400,20 L 400,100 L 0,100 Z`}
                      fill="url(#fade2)"
                      fillOpacity="0.1"
                      className="transition-all duration-300"
                    />
                  </svg>

                  {/* Labels */}
                  <div className="absolute top-2 left-4 text-[9px] font-bold text-primary-300 uppercase tracking-tighter bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                    {tracks[0].name}
                  </div>
                  <div className="absolute bottom-2 right-4 text-[9px] font-bold text-accent-300 uppercase tracking-tighter bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                    {tracks[1].name}
                  </div>

                  {/* Mix Point Indicator */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/40 z-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white]" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white]" />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span>Track 1 Out</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-white/60 font-bold">MIX POINT</span>
                    <span className="text-[8px] opacity-50">0.0s</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Track 2 In</span>
                    <div className="w-2 h-2 rounded-full bg-accent" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
