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
            'relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 group text-left shadow-lg',
            activeMode === mode.id
              ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(124,58,237,0.2)] scale-[1.02]'
              : 'border-white/10 bg-secondary hover:bg-secondary/80 hover:border-primary/50 hover:shadow-xl'
          )}
        >
          {/* Active Border Gradient */}
          {activeMode === mode.id && (
            <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-r from-primary to-accent -z-10 opacity-50" />
          )}

          <h3 className={clsx(
            'text-xl font-display font-bold mb-2 transition-colors flex items-center gap-2',
            activeMode === mode.id ? 'text-primary' : 'text-gray-400 group-hover:text-white'
          )}>
            {activeMode === mode.id && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
            {mode.label}
          </h3>
          <p className="text-sm text-gray-500 font-sans group-hover:text-gray-400 leading-relaxed">
            {mode.description}
          </p>
        </button>
      ))}
    </div>
  );
}
