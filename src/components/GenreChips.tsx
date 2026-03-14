import { GENRES } from '../constants';
import clsx from 'clsx';

interface GenreChipsProps {
  selectedGenre: string | undefined;
  onSelect: (genreId: string) => void;
}

export function GenreChips({ selectedGenre, onSelect }: GenreChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {GENRES.map((genre) => (
        <button
          key={genre.id}
          onClick={() => onSelect(genre.id)}
          className={clsx(
            'px-3 py-1 rounded-full text-xs font-sans font-bold uppercase tracking-wider transition-all',
            selectedGenre === genre.id
              ? `${genre.color} text-white shadow-lg scale-105`
              : 'bg-white/10 text-gray-400 hover:bg-white/20'
          )}
        >
          {genre.label}
        </button>
      ))}
    </div>
  );
}
