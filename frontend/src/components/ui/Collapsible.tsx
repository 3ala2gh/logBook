import type { ReactNode } from 'react'

interface CollapsibleProps {
  title: ReactNode
  children: ReactNode
  className?: string
  summaryClassName?: string
}

/** A native <details> disclosure (keyboard accessible for free) with a rotating chevron. */
export function Collapsible({ title, children, className = '', summaryClassName = 'px-5 py-4' }: CollapsibleProps) {
  return (
    <details className={`group ${className}`}>
      <summary className={`flex cursor-pointer list-none items-center justify-between select-none ${summaryClassName}`}>
        <span>{title}</span>
        <span aria-hidden className="text-muted transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      {children}
    </details>
  )
}
