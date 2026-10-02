import { useId, useState } from 'react'
import { Spinner } from '@/components/ui'
import type { Place } from '@/types'
import { MIN_SEARCH_CHARS } from '../constants'
import { usePlaceSearch } from '../hooks/usePlaceSearch'
import { optionId } from '../utils/ids'
import { SuggestionList } from './SuggestionList'

interface LocationAutocompleteProps {
  label: string
  placeholder?: string
  marker: { glyph: string; className: string }
  value: Place | null
  onChange: (place: Place | null) => void
  error?: string
}

/** ARIA combobox: type to search, arrows to move, Enter to choose, Escape to close. */
export function LocationAutocomplete({ label, placeholder, marker, value, onChange, error }: LocationAutocompleteProps) {
  const id = useId()
  const listId = `${id}-list`
  const errorId = `${id}-error`

  const [text, setText] = useState(value?.label ?? '')
  const [dirty, setDirty] = useState(false) // typed since the last selection
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState({ query: '', index: 0 })

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

  const query = dirty && text.trim().length >= MIN_SEARCH_CHARS ? text.trim() : ''
  const search = usePlaceSearch(query)
  const activeIndex = active.query === query ? active.index : 0
  const showList = open && search.ready
  const message = error ?? search.error

  function choose(place: Place) {
    setDirty(false)
    setText(place.label)
    setOpen(false)
    onChange(place)
  }

  function move(step: number) {
    const count = search.places.length
    if (count) setActive({ query, index: (activeIndex + step + count) % count })
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      move(e.key === 'ArrowDown' ? 1 : -1)
    } else if (e.key === 'Enter' && showList && search.places[activeIndex]) {
      e.preventDefault()
      choose(search.places[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

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
          aria-activedescendant={showList && search.places.length ? optionId(listId, activeIndex) : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? errorId : undefined}
          className={`field pr-9 pl-11 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setDirty(true)
            setText(e.target.value)
            setOpen(true)
            if (value) onChange(null)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        />
        <span className="absolute top-1/2 right-3 -translate-y-1/2">
          {search.loading ? (
            <Spinner />
          ) : (
            value && (
              <span aria-hidden className="text-duty-d">
                ✓
              </span>
            )
          )}
        </span>
      </div>

      {showList && (
        <SuggestionList
          id={listId}
          label={label}
          places={search.places}
          activeIndex={activeIndex}
          onHover={(index) => setActive({ query, index })}
          onChoose={choose}
        />
      )}

      {message && (
        <p id={errorId} className="mt-1.5 text-[13px] text-red-600">
          {message}
        </p>
      )}
    </div>
  )
}
