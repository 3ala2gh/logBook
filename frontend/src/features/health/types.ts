/** checking → ready, or checking → waking → ready when the host has to boot. */
export type ServerStatus = 'checking' | 'waking' | 'ready' | 'down'
