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
                <label className="text-gray-200 text-sm font-sans font-bold tracking-widest group-hover:text-primary transition-colors">Echo Delay</label>
                <span className="text-primary font-mono font-bold text-xs bg-primary/10 px-2 py-1 rounded border border-primary/20">{settings.echoDelay}ms</span>
              </div>
              <input
                type="range"
                min="50"
                max="800"
                value={settings.echoDelay}
                onChange={(e) => handleChange('echoDelay', Number(e.target.value))}
                className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
              />
            </div>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-sans font-bold tracking-widest group-hover:text-primary transition-colors">Feedback</label>
                <span className="text-primary font-mono font-bold text-xs bg-primary/10 px-2 py-1 rounded border border-primary/20">{settings.echoFeedback}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="70"
                value={settings.echoFeedback}
                onChange={(e) => handleChange('echoFeedback', Number(e.target.value))}
                className="w-full h-2 bg-bg rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
              />
            </div>
          </>
        )}

        {isSlowed && (
          <>
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

            {/* Crossfade Visualizer */}
            {tracks.length >= 2 && (
              <div className="bg-bg/40 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-gray-400 font-mono mb-3 uppercase tracking-wider">Transition Preview</p>
                <div className="relative h-24 bg-secondary/50 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
                  {/* Center Line (Mix Point) */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20 z-10 border-l border-dashed border-white/20" />
                  
                  {/* Track 1 (Outgoing) */}
                  <div 
                    className="absolute top-4 bottom-4 left-0 bg-gradient-to-r from-primary/80 to-primary/0 border-r border-primary/50 rounded-l-md"
                    style={{ 
                      right: '50%', 
                      marginRight: `-${(settings.crossfadeDuration / 20) * 100 / 2}%`,
                      width: '45%' 
                    }}
                  >
                    <span className="absolute left-2 top-2 text-[10px] font-bold text-primary-200 truncate max-w-[80px]">{tracks[0].name}</span>
                  </div>

                  {/* Track 2 (Incoming) */}
                  <div 
                    className="absolute top-4 bottom-4 right-0 bg-gradient-to-l from-accent/80 to-accent/0 border-l border-accent/50 rounded-r-md"
                    style={{ 
                      left: '50%', 
                      marginLeft: `-${(settings.crossfadeDuration / 20) * 100 / 2}%`,
                      width: '45%'
                    }}
                  >
                    <span className="absolute right-2 bottom-2 text-[10px] font-bold text-accent-200 truncate max-w-[80px] text-right">{tracks[1].name}</span>
                  </div>

                  {/* Overlap Highlight */}
                  <div 
                    className="absolute top-0 bottom-0 bg-primary/10 border-x border-primary/30 z-0"
                    style={{
                      left: '50%',
                      marginLeft: `-${(settings.crossfadeDuration / 20) * 100 / 2}%`,
                      width: `${(settings.crossfadeDuration / 20) * 100}%`
                    }}
                  >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] text-primary-300 font-mono bg-bg/50 px-1 rounded">
                      {settings.crossfadeDuration}s Overlap
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1 px-1">
                  <span>-10s</span>
                  <span>Mix Point</span>
                  <span>+10s</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
