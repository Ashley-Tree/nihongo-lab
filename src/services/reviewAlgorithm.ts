export type ReviewRating = 0 | 1 | 2 | 3 // 忘记、困难、记得、简单
export interface ReviewState {
  intervalDays: number
  ease: number
  repetitions: number
  lapses: number
}
export interface ReviewResult extends ReviewState { dueAt: number }
export const DAY_MS = 86_400_000
export const MINUTE_MS = 60_000
export function scheduleReview(previous: ReviewState | null, rating: ReviewRating, now: number): ReviewResult {
  if (![0, 1, 2, 3].includes(rating) || !Number.isFinite(now)) throw new Error('无效的复习评分或时间')
  const ease = Math.max(1.3, Math.min(3.0, previous?.ease ?? 2.5))
  const repetitions = previous?.repetitions ?? 0
  const lapses = previous?.lapses ?? 0
  if (rating === 0) return { intervalDays: 10 / 1440, ease: Math.max(1.3, ease - 0.2), repetitions: 0, lapses: lapses + 1, dueAt: now + 10 * MINUTE_MS }
  if (rating === 1) return { intervalDays: 1, ease: Math.max(1.3, ease - 0.15), repetitions: repetitions + 1, lapses, dueAt: now + DAY_MS }
  let days: number
  if (repetitions === 0) days = rating === 3 ? 4 : 1
  else if (repetitions === 1) days = rating === 3 ? 8 : 3
  else days = Math.max(1, Math.round(Math.max(1, previous?.intervalDays ?? 1) * (rating === 3 ? ease * 1.3 : ease)))
  return { intervalDays: days, ease: Math.min(3, ease + (rating === 3 ? 0.1 : 0)), repetitions: repetitions + 1, lapses, dueAt: now + days * DAY_MS }
}
