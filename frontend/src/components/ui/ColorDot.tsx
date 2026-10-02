interface ColorDotProps {
  color: string
  className?: string
}

/** A small decorative swatch, e.g. a duty-status color next to its label. */
export function ColorDot({ color, className = 'size-2.5' }: ColorDotProps) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${className}`} style={{ backgroundColor: color }} />
}
