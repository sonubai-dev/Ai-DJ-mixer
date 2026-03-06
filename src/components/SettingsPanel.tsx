import { RemixMode, RemixSettings } from '../types';
import { REMIX_MODES } from '../constants';

interface SettingsPanelProps {
  mode: RemixMode;
  settings: RemixSettings;
  onSettingsChange: (newSettings: RemixSettings) => void;
}

export function SettingsPanel({ mode, settings, onSettingsChange }: SettingsPanelProps) {
  const handleChange = (key: keyof RemixSettings, value: number) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-8">
      <h3 className="text-xl font-orbitron text-white mb-6 flex items-center">
        <span className="w-2 h-8 bg-orange-500 mr-3 rounded-full"></span>
        {REMIX_MODES.find(m => m.id === mode)?.label} Settings
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {mode === 'dj' && (
          <>
            <div className="space-y-2">
              <label className="text-gray-400 text-sm font-rajdhani uppercase tracking-wider">Bass Boost ({settings.bassBoost}dB)</label>
              <input
                type="range"
                min="0"
                max="18"
                value={settings.bassBoost}
                onChange={(e) => handleChange('bassBoost', Number(e.target.value))}
                className="w-full accent-orange-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-gray-400 text-sm font-rajdhani uppercase tracking-wider">Echo Delay ({settings.echoDelay}ms)</label>
              <input
                type="range"
                min="50"
                max="800"
                value={settings.echoDelay}
                onChange={(e) => handleChange('echoDelay', Number(e.target.value))}
                className="w-full accent-orange-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-gray-400 text-sm font-rajdhani uppercase tracking-wider">Feedback ({settings.echoFeedback}%)</label>
              <input
                type="range"
                min="0"
                max="70"
                value={settings.echoFeedback}
                onChange={(e) => handleChange('echoFeedback', Number(e.target.value))}
                className="w-full accent-orange-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </>
        )}

        {mode === 'slowed' && (
          <>
            <div className="space-y-2">
              <label className="text-gray-400 text-sm font-rajdhani uppercase tracking-wider">Slow Factor ({settings.slowFactor}%)</label>
              <input
                type="range"
                min="40"
                max="95"
                value={settings.slowFactor}
                onChange={(e) => handleChange('slowFactor', Number(e.target.value))}
                className="w-full accent-pink-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-gray-400 text-sm font-rajdhani uppercase tracking-wider">Reverb Mix ({settings.reverbWet}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.reverbWet}
                onChange={(e) => handleChange('reverbWet', Number(e.target.value))}
                className="w-full accent-pink-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-gray-400 text-sm font-rajdhani uppercase tracking-wider">Room Size ({settings.reverbSize}s)</label>
              <input
                type="range"
                min="1"
                max="6"
                step="0.1"
                value={settings.reverbSize}
                onChange={(e) => handleChange('reverbSize', Number(e.target.value))}
                className="w-full accent-pink-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </>
        )}

        {mode === 'mashup' && (
          <div className="space-y-2">
            <label className="text-gray-400 text-sm font-rajdhani uppercase tracking-wider">Crossfade ({settings.crossfadeDuration}s)</label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={settings.crossfadeDuration}
              onChange={(e) => handleChange('crossfadeDuration', Number(e.target.value))}
              className="w-full accent-yellow-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
