import { db, type ReviewSchedule } from '../db/database'
import { getAllVocabulary } from './vocabularyService'
import { scheduleReview, type ReviewRating } from './reviewAlgorithm'

export async function loadReviewDashboard(now = Date.now()) {
  const [words, schedules, logs] = await Promise.all([
    getAllVocabulary(), db.reviewSchedules.toArray(), db.reviewLogs.toArray(),
  ])
  const byId = new Map(schedules.map(s => [s.wordId, s]))
  const activeIds = new Set(words.map(w => w.id))
  const due = words.filter(w => { const s = byId.get(w.id); return s && s.dueAt <= now })
  const newWords = words.filter(w => !byId.has(w.id))
  const learned = words.length - newWords.length
  const todayStart = new Date(now).setHours(0, 0, 0, 0)
  const reviewedToday = logs.filter(l => l.reviewedAt >= todayStart && l.reviewedAt <= now && activeIds.has(l.wordId)).length
  return { due, newWords, learned, total: words.length, reviewedToday, schedules, logs }
}

export async function gradeReview(wordId: number, rating: ReviewRating, now = Date.now()) {
  if (!Number.isSafeInteger(wordId) || wordId <= 0) throw new Error('无效词条 ID')
  if (![0, 1, 2, 3].includes(rating)) throw new Error('无效评分')
  if (!(await getAllVocabulary()).some(w => w.id === wordId)) throw new Error('词条不存在')
  return db.transaction('rw', db.reviewSchedules, db.reviewLogs, async () => {
    const previous = await db.reviewSchedules.get(wordId)
    const result = scheduleReview(previous ?? null, rating, now)
    const updated: ReviewSchedule = { ...result, wordId, lastReviewedAt: now }
    await db.reviewSchedules.put(updated)
    await db.reviewLogs.add({ wordId, rating, reviewedAt: now, nextDueAt: result.dueAt })
    return updated
  })
}

export async function resetReview(wordId: number) {
  await db.transaction('rw', db.reviewSchedules, db.reviewLogs, async () => {
    await db.reviewSchedules.delete(wordId)
    await db.reviewLogs.where('wordId').equals(wordId).delete()
  })
}
