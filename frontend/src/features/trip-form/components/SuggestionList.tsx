import type { Place } from '@/types'
import { optionId } from '../utils/ids'

interface SuggestionListProps {
  id: string
  label: string
  places: Place[]
  activeIndex: number
  onHover: (index: number) => void
  onChoose: (place: Place) => void
}

export function SuggestionList({ id, label, places, activeIndex, onHover, onChoose }: SuggestionListProps) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label={`${label} suggestions`}
      className="absolute z-1100 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg"
    >
      {places.length === 0 ? (
        <li className="px-3 py-2.5 text-sm text-muted">No places found. Try a city and state, e.g. "Tulsa, OK".</li>
      ) : (
        places.map((place, i) => (
          <li
            key={`${place.label}-${place.lat}-${place.lng}`}
            id={optionId(id, i)}
            role="option"
            aria-selected={i === activeIndex}
            className={`cursor-pointer px-3 py-2.5 text-[15px] ${i === activeIndex ? 'bg-paper text-ink' : 'text-ink-soft'}`}
            // keep focus in the input so the combobox stays open
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => onHover(i)}
            onClick={() => onChoose(place)}
          >
            {place.label}
          </li>
        ))
      )}
    </ul>
  )
}
