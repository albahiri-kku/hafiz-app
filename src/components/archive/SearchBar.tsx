import { IconSearch } from './Icons';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative">
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-royal-700/60">
        <IconSearch />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'ابحث في الوثائق…'}
        className="input pr-11"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/60 hover:text-royal-700 text-sm"
        >
          مسح
        </button>
      )}
    </div>
  );
}
