export type ReviewRating = 0 | 1 | 2 | 3 // 忘记 / 困难 / 记得 / 简单
export interface ReviewState {
  intervalDays: number
  ease: number
  repetitions: number
  lapses: number
  dueAt: number
  lastReviewedAt: number
}

/** 简化 SM-2 风格间隔算法；评分 0-3，所有日期均使用毫秒时间戳。 */
export function nextReviewState(
  previous: Partial<ReviewState> | undefined,
  rating: ReviewRating,
  now = Date.now(),
): ReviewState {
  const old: ReviewState = {
    intervalDays: previous?.intervalDays ?? 0,
    ease: previous?.ease ?? 2.5,
    repetitions: previous?.repetitions ?? 0,
    lapses: previous?.lapses ?? 0,
    dueAt: previous?.dueAt ?? now,
    lastReviewedAt: previous?.lastReviewedAt ?? 0,
  }
  let intervalDays: number
  let ease = old.ease
  let repetitions = old.repetitions
  let lapses = old.lapses

  if (rating === 0) {
    intervalDays = 0
    repetitions = 0
    lapses += 1
    ease = Math.max(1.3, ease - 0.2)
  } else if (rating === 1) {
    intervalDays = old.intervalDays <= 1 ? 1 : Math.max(1, Math.round(old.intervalDays * 1.2))
    repetitions += 1
    ease = Math.max(1.3, ease - 0.15)
  } else if (rating === 2) {
    intervalDays = old.repetitions === 0 ? 1 : old.repetitions === 1 ? 3 : Math.max(1, Math.round(old.intervalDays * ease))
    repetitions += 1
  } else {
    intervalDays = old.repetitions === 0 ? 3 : Math.max(2, Math.round(old.intervalDays * (ease + 0.3)))
    repetitions += 1
    ease = Math.min(3.2, ease + 0.15)
  }

  const delay = rating === 0 ? 10 * 60 * 1000 : intervalDays * 24 * 60 * 60 * 1000
  return { intervalDays, ease, repetitions, lapses, dueAt: now + delay, lastReviewedAt: now }
}
