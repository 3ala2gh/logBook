/** Show "Waking the server…" if /health hasn't answered by then (Render's free tier cold-starts in ~1 min). */
export const SLOW_AFTER_MS = 2_500
export const GIVE_UP_AFTER_MS = 120_000
export const PING_TIMEOUT_MS = 20_000
export const RETRY_EVERY_MS = 3_000
