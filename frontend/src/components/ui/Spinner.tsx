interface SpinnerProps {
  /** `light` for dark backgrounds (buttons), `dark` for light ones. */
  tone?: 'light' | 'dark'
  className?: string
}

const TONES = {
  light: 'border-white/30 border-t-white',
  dark: 'border-line border-t-ink',
}

export function Spinner({ tone = 'dark', className = 'size-4' }: SpinnerProps) {
  return <span aria-hidden className={`inline-block animate-spin rounded-full border-2 ${TONES[tone]} ${className}`} />
}
