import { useEffect, useId, useState } from 'react'
import type { Place } from '../../../types/api'
import { searchPlaces } from '../api'

const MIN_CHARS = 3
const DEBOUNCE_MS = 300

interface Props {
  label: string
  marker: { glyph: string; className: string }
  value: Place | null
  onChange: (place: Place | null) => void
  placeholder?: string
  error?: string
}

export function LocationAutocomplete({ label, marker, value, onChange, placeholder, error }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const [text, setText] = useState(value?.label ?? '')
  const [dirty, setDirty] = useState(false) // the user has typed since the last selection
  const [results, setResults] = useState<{ query: string; places: Place[] }>({ query: '', places: [] })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Follow the value when it is set from outside (e.g. "Try an example").
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (value) {
      setText(value.label)
      setDirty(false)
    } else if (!dirty) {
      setText('')
    }
  }

  const query = dirty && text.trim().length >= MIN_CHARS ? text.trim() : ''
  const options = query && results.query === query ? results.places : []
  const loading = Boolean(query) && results.query !== query && !searchError

  useEffect(() => {
    if (!query) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const places = await searchPlaces(query, controller.signal)
        setResults({ query, places })
        setActive(places.length ? 0 : -1)
        setSearchError(null)
      } catch (err) {
        if ((err as { code?: string }).code !== 'CANCELLED') setSearchError((err as Error).message)
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function choose(place: Place) {
    setDirty(false)
    setText(place.label)
    setOpen(false)
    onChange(place)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (options.length ? (i + 1) % options.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (options.length ? (i - 1 + options.length) % options.length : -1))
    } else if (e.key === 'Enter' && open && active >= 0 && options[active]) {
      e.preventDefault()
      choose(options[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && Boolean(query) && results.query === query
  const describedBy = error || searchError ? `${id}-error` : undefined

  return (
    <div className="relative">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden
          className={`pointer-events-none absolute top-1/2 left-3 grid size-6 -translate-y-1/2 place-items-center rounded-full text-[11px] font-bold text-white ${marker.className}`}
        >
          {marker.glyph}
        </span>
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`field pr-9 pl-11 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setDirty(true)
            setText(e.target.value)
            setSearchError(null)
            setOpen(true)
            if (value) onChange(null)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        />
        {loading && (
          <span
            aria-hidden
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-ink"
          />
        )}
        {!loading && value && (
          <span aria-hidden className="absolute top-1/2 right-3 -translate-y-1/2 text-duty-d">
            ✓
          </span>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-1100 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">No places found. Try a city and state, e.g. "Tulsa, OK".</li>
          ) : (
            options.map((place, i) => (
              <li
                key={`${place.label}-${place.lat}-${place.lng}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`cursor-pointer px-3 py-2.5 text-[15px] ${i === active ? 'bg-paper text-ink' : 'text-ink-soft'}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(place)}
              >
                {place.label}
              </li>
            ))
          )}
        </ul>
      )}

      {(error || searchError) && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-red-600">
          {error ?? searchError}
        </p>
      )}
    </div>
  )
}
