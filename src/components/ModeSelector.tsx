import { RemixMode } from '../types';
import { REMIX_MODES } from '../constants';
import clsx from 'clsx';

interface ModeSelectorProps {
  activeMode: RemixMode;
  onModeChange: (mode: RemixMode) => void;
}

export function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {REMIX_MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id as RemixMode)}
          className={clsx(
            'relative overflow-hidden p-6 rounded-xl border transition-all duration-300 group text-left',
            activeMode === mode.id
              ? 'border-transparent bg-black/60 shadow-[0_0_20px_rgba(255,107,26,0.3)]'
              : 'border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/20'
          )}
        >
          {/* Active Border Gradient */}
          {activeMode === mode.id && (
            <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-r from-orange-500 via-pink-500 to-yellow-500 -z-10" />
          )}

          <h3 className={clsx(
            'text-xl font-orbitron mb-2 transition-colors',
            activeMode === mode.id ? 'text-white' : 'text-gray-400 group-hover:text-white'
          )}>
            {mode.label}
          </h3>
          <p className="text-sm text-gray-500 font-rajdhani group-hover:text-gray-400">
            {mode.description}
          </p>
        </button>
      ))}
    </div>
  );
}
