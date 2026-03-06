import { INDIAN_LANGUAGES } from '../constants';
import clsx from 'clsx';

interface LanguageChipsProps {
  selectedLanguage: string | undefined;
  onSelect: (langId: string) => void;
}

export function LanguageChips({ selectedLanguage, onSelect }: LanguageChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {INDIAN_LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          onClick={() => onSelect(lang.id)}
          className={clsx(
            'px-3 py-1 rounded-full text-xs font-rajdhani font-bold uppercase tracking-wider transition-all',
            selectedLanguage === lang.id
              ? `${lang.color} text-white shadow-lg scale-105`
              : 'bg-white/10 text-gray-400 hover:bg-white/20'
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
