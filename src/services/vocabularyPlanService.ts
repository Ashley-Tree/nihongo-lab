import { db, type DailyVocabularyPlan } from '../db/database'
import type { VocabularyItem } from './vocabularyService'

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getTodayVocabularyPlan(): Promise<DailyVocabularyPlan | undefined> {
  return db.dailyVocabularyPlans.get(localDateKey())
}

export async function saveTodayVocabularyPlan(
  words: VocabularyItem[], targetCount: number,
  level: DailyVocabularyPlan['level'], masteredIds: number[] = [],
): Promise<DailyVocabularyPlan> {
  const date = localDateKey()
  const existing = await db.dailyVocabularyPlans.get(date)
  const validIds = new Set(words.map(word => word.id))
  const completed = (existing?.completedIds ?? []).filter(id => validIds.has(id))
  const candidates = words.filter(word => (level === '全部' || word.level === level) && !completed.includes(word.id))
  const wordsById = new Map(words.map(word => [word.id, word]))
  const alreadyChosen = existing?.level === level
    ? existing.wordIds.filter(id => validIds.has(id) && !completed.includes(id) && (level === '全部' || wordsById.get(id)?.level === level))
    : []
  const needed = Math.max(0, targetCount - completed.length)
  const selected = alreadyChosen.slice(0, needed)
  const selectedSet = new Set(selected)
  const fresh = candidates.filter(word => !selectedSet.has(word.id))
  const unmastered = fresh.filter(word => !masteredIds.includes(word.id))
  const mastered = fresh.filter(word => masteredIds.includes(word.id))
  for (const word of [...unmastered, ...mastered].slice(0, Math.max(0, needed - selected.length))) selected.push(word.id)
  const plan: DailyVocabularyPlan = {
    date, targetCount, level,
    wordIds: [...completed, ...selected].slice(0, Math.max(targetCount, completed.length)),
    completedIds: completed, updatedAt: Date.now(),
  }
  await db.dailyVocabularyPlans.put(plan)
  return plan
}

export async function markDailyWordCompleted(wordId: number): Promise<DailyVocabularyPlan | undefined> {
  const date = localDateKey()
  const plan = await db.dailyVocabularyPlans.get(date)
  if (!plan || !plan.wordIds.includes(wordId)) return plan
  if (!plan.completedIds.includes(wordId)) {
    plan.completedIds = [...plan.completedIds, wordId]
    plan.updatedAt = Date.now()
    await db.dailyVocabularyPlans.put(plan)
  }
  return plan
}
