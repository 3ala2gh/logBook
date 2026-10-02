import type { ReactNode } from 'react'

interface AppHeaderProps {
  /** Shown under the product name. */
  tagline?: string
  /** Right-hand side: a status pill, a link back, etc. */
  actions?: ReactNode
  maxWidth?: string
}

export function AppHeader({ tagline, actions, maxWidth = 'max-w-[1500px]' }: AppHeaderProps) {
  return (
    <header className="bg-ink text-white">
      <div className={`mx-auto flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 ${maxWidth}`}>
        <a href="/" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span>
            <span className="block text-[17px] leading-tight font-semibold">Logbook</span>
            {tagline && <span className="block text-[12px] leading-tight text-white/60">{tagline}</span>}
          </span>
        </a>
        {actions}
      </div>
    </header>
  )
}
