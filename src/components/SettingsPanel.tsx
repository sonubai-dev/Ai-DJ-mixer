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
    <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 mb-8 shadow-2xl shadow-indigo-900/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-white/20 opacity-50" />
      
      <h3 className="text-xl font-orbitron text-white mb-8 flex items-center">
        <span className="w-1.5 h-8 bg-gradient-to-b from-orange-500 to-red-600 mr-4 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></span>
        <span className="tracking-wider">{REMIX_MODES.find(m => m.id === mode)?.label} Settings</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {isDJ && (
          <>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-orbitron font-bold tracking-widest group-hover:text-orange-400 transition-colors">Bass Boost</label>
                <span className="text-orange-500 font-mono font-bold text-xs bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">{settings.bassBoost}dB</span>
              </div>
              <input
                type="range"
                min="0"
                max="18"
                value={settings.bassBoost}
                onChange={(e) => handleChange('bassBoost', Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
              />
            </div>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-orbitron font-bold tracking-widest group-hover:text-orange-400 transition-colors">Echo Delay</label>
                <span className="text-orange-500 font-mono font-bold text-xs bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">{settings.echoDelay}ms</span>
              </div>
              <input
                type="range"
                min="50"
                max="800"
                value={settings.echoDelay}
                onChange={(e) => handleChange('echoDelay', Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
              />
            </div>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-orbitron font-bold tracking-widest group-hover:text-orange-400 transition-colors">Feedback</label>
                <span className="text-orange-500 font-mono font-bold text-xs bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">{settings.echoFeedback}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="70"
                value={settings.echoFeedback}
                onChange={(e) => handleChange('echoFeedback', Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
              />
            </div>
          </>
        )}

        {isSlowed && (
          <>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-orbitron font-bold tracking-widest group-hover:text-pink-400 transition-colors">Slow Factor</label>
                <span className="text-pink-500 font-mono font-bold text-xs bg-pink-500/10 px-2 py-1 rounded border border-pink-500/20">{settings.slowFactor}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                value={settings.slowFactor}
                onChange={(e) => handleChange('slowFactor', Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-all"
              />
            </div>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-orbitron font-bold tracking-widest group-hover:text-pink-400 transition-colors">Reverb Mix</label>
                <span className="text-pink-500 font-mono font-bold text-xs bg-pink-500/10 px-2 py-1 rounded border border-pink-500/20">{settings.reverbWet}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.reverbWet}
                onChange={(e) => handleChange('reverbWet', Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-all"
              />
            </div>
            <div className="space-y-4 group">
              <div className="flex justify-between items-center">
                <label className="text-gray-200 text-sm font-orbitron font-bold tracking-widest group-hover:text-pink-400 transition-colors">Room Size</label>
                <span className="text-pink-500 font-mono font-bold text-xs bg-pink-500/10 px-2 py-1 rounded border border-pink-500/20">{settings.reverbSize}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="0.1"
                value={settings.reverbSize}
                onChange={(e) => handleChange('reverbSize', Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-all"
              />
            </div>
          </>
        )}

        {isSpatial && (
          <div className="space-y-4 group">
            <div className="flex justify-between items-center">
              <label className="text-gray-200 text-sm font-orbitron font-bold tracking-widest group-hover:text-cyan-400 transition-colors">Panning Speed</label>
              <span className="text-cyan-500 font-mono font-bold text-xs bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">{settings.panningSpeed}s</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={settings.panningSpeed}
              onChange={(e) => handleChange('panningSpeed', Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
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
                <label className="text-gray-200 text-sm font-orbitron font-bold tracking-widest group-hover:text-orange-400 transition-colors">Crossfade Duration</label>
                <span className="text-orange-500 font-mono font-bold text-xs bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">{settings.crossfadeDuration}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={settings.crossfadeDuration}
                onChange={(e) => handleChange('crossfadeDuration', Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
              />
            </div>

            {/* Crossfade Visualizer */}
            {tracks.length >= 2 && (
              <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-gray-400 font-mono mb-3 uppercase tracking-wider">Transition Preview</p>
                <div className="relative h-24 bg-gray-900/50 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
                  {/* Center Line (Mix Point) */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20 z-10 border-l border-dashed border-white/20" />
                  
                  {/* Track 1 (Outgoing) */}
                  <div 
                    className="absolute top-4 bottom-4 left-0 bg-gradient-to-r from-blue-600/80 to-blue-600/0 border-r border-blue-400/50 rounded-l-md"
                    style={{ 
                      right: '50%', 
                      marginRight: `-${(settings.crossfadeDuration / 20) * 100 / 2}%`,
                      width: '45%' 
                    }}
                  >
                    <span className="absolute left-2 top-2 text-[10px] font-bold text-blue-200 truncate max-w-[80px]">{tracks[0].name}</span>
                  </div>

                  {/* Track 2 (Incoming) */}
                  <div 
                    className="absolute top-4 bottom-4 right-0 bg-gradient-to-l from-green-600/80 to-green-600/0 border-l border-green-400/50 rounded-r-md"
                    style={{ 
                      left: '50%', 
                      marginLeft: `-${(settings.crossfadeDuration / 20) * 100 / 2}%`,
                      width: '45%'
                    }}
                  >
                    <span className="absolute right-2 bottom-2 text-[10px] font-bold text-green-200 truncate max-w-[80px] text-right">{tracks[1].name}</span>
                  </div>

                  {/* Overlap Highlight */}
                  <div 
                    className="absolute top-0 bottom-0 bg-orange-500/10 border-x border-orange-500/30 z-0"
                    style={{
                      left: '50%',
                      marginLeft: `-${(settings.crossfadeDuration / 20) * 100 / 2}%`,
                      width: `${(settings.crossfadeDuration / 20) * 100}%`
                    }}
                  >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] text-orange-300 font-mono bg-black/50 px-1 rounded">
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
