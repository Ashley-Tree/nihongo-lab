import { db } from '../db/database'
import { nextReviewState, type ReviewRating } from './unifiedReviewAlgorithm'

export type ReviewKind = 'vocabulary' | 'grammar' | 'kanji' | 'reading' | 'listening'
export interface UnifiedReviewSchedule {
  key: string
  kind: ReviewKind
  itemId: string
  dueAt: number
  intervalDays: number
  ease: number
  repetitions: number
  lapses: number
  lastReviewedAt: number
  createdAt: number
}
export interface ReviewTask extends UnifiedReviewSchedule {
  title: string
  prompt: string
  answer: string
  detail?: string
}

const now = () => Date.now()
const keyOf = (kind: ReviewKind, itemId: string) => `${kind}:${itemId}`

/** 把旧词汇复习计划和其他模块已有的学习记录汇入统一复习队列。 */
export async function syncUnifiedReviewQueue(): Promise<number> {
  let added = 0
  await db.transaction('rw', db.unifiedReviewSchedules, db.reviewSchedules, db.studyProgress, async () => {
    const existing = new Set((await db.unifiedReviewSchedules.toArray()).map(x => x.key))
    const vocabularySchedules = await db.reviewSchedules.toArray()
    for (const item of vocabularySchedules) {
      const key = keyOf('vocabulary', String(item.wordId))
      if (!existing.has(key)) {
        await db.unifiedReviewSchedules.add({ key, kind: 'vocabulary', itemId: String(item.wordId), dueAt: item.dueAt, intervalDays: item.intervalDays, ease: item.ease, repetitions: item.repetitions, lapses: item.lapses, lastReviewedAt: item.lastReviewedAt, createdAt: now() })
        added += 1
      }
    }
    const progress = await db.studyProgress.toArray()
    for (const item of progress) {
      const kind = item.kind as Exclude<ReviewKind, 'vocabulary'>
      const key = keyOf(kind, item.itemId)
      if (!existing.has(key)) {
        await db.unifiedReviewSchedules.add({ key, kind, itemId: item.itemId, dueAt: now(), intervalDays: 0, ease: 2.5, repetitions: 0, lapses: 0, lastReviewedAt: 0, createdAt: now() })
        added += 1
      }
    }
  })
  return added
}

export async function listDueReviewTasks(at = now()): Promise<ReviewTask[]> {
  const schedules = await db.unifiedReviewSchedules.where('dueAt').belowOrEqual(at).sortBy('dueAt')
  const [grammars, kanjis, readings, listenings] = await Promise.all([
    import('./studyContent').then(m => m.grammars),
    import('./studyContent').then(m => m.kanjis),
    import('./studyContent').then(m => m.readings),
    import('./studyContent').then(m => m.listenings),
  ])
  return schedules.map(schedule => {
    const item = schedule.kind === 'grammar' ? grammars.find(x => x.id === schedule.itemId)
      : schedule.kind === 'kanji' ? kanjis.find(x => x.id === schedule.itemId)
      : schedule.kind === 'reading' ? readings.find(x => x.id === schedule.itemId)
      : schedule.kind === 'listening' ? listenings.find(x => x.id === schedule.itemId)
      : undefined
    let title = `${schedule.kind} ${schedule.itemId}`
    let prompt = '请回忆该学习内容。'
    let answer = '请进入对应学习模块查看完整内容。'
    let detail: string | undefined
    if (schedule.kind === 'grammar' && item && 'pattern' in item) {
      title = item.pattern; prompt = `这个语法的中文含义是什么？`; answer = item.meaning_zh; detail = item.formation_zh || item.usage_zh
    } else if (schedule.kind === 'kanji' && item && 'character' in item) {
      title = item.character; prompt = '请回忆这个汉字的读音和含义。'; answer = `${item.meaning_zh}；音读：${item.on_readings}；训读：${item.kun_readings}`; detail = item.common_words.join('、')
    } else if (schedule.kind === 'reading' && item && 'title' in item) {
      title = item.title; prompt = item.prompt_zh || '请回忆文章主旨和重点。'; answer = item.explanation_zh || '请重新阅读文章并核对理解。'; detail = item.passage_ja
    } else if (schedule.kind === 'listening' && item && 'title' in item) {
      title = item.title; prompt = item.prompt_zh || '请回忆听力材料内容。'; answer = item.explanation_zh || '请重新练习并核对理解。'; detail = item.script_ja
    } else if (schedule.kind === 'vocabulary') {
      title = `词汇编号 ${schedule.itemId}`; prompt = '请先回忆该词汇的读音和中文释义。'; answer = '请在词汇学习模块搜索该编号对应的单词。'
    }
    return { ...schedule, title, prompt, answer, detail }
  })
}

export async function rateUnifiedReview(key: string, rating: ReviewRating): Promise<void> {
  await db.transaction('rw', db.unifiedReviewSchedules, db.unifiedReviewLogs, db.reviewSchedules, async () => {
    const old = await db.unifiedReviewSchedules.get(key)
    if (!old) throw new Error('复习任务不存在，请刷新页面后重试。')
    const next = nextReviewState(old, rating)
    await db.unifiedReviewSchedules.put({ ...old, ...next })
    await db.unifiedReviewLogs.add({ key, kind: old.kind, itemId: old.itemId, rating, reviewedAt: next.lastReviewedAt, nextDueAt: next.dueAt })
    if (old.kind === 'vocabulary') {
      const wordId = Number(old.itemId)
      const previous = await db.reviewSchedules.get(wordId)
      await db.reviewSchedules.put({ ...previous, wordId, dueAt: next.dueAt, intervalDays: next.intervalDays, ease: next.ease, repetitions: next.repetitions, lapses: next.lapses, lastReviewedAt: next.lastReviewedAt })
    }
  })
}

export async function addContentToReview(kind: Exclude<ReviewKind, 'vocabulary'>, itemId: string): Promise<void> {
  const key = keyOf(kind, itemId)
  if (await db.unifiedReviewSchedules.get(key)) return
  await db.unifiedReviewSchedules.add({ key, kind, itemId, dueAt: now(), intervalDays: 0, ease: 2.5, repetitions: 0, lapses: 0, lastReviewedAt: 0, createdAt: now() })
}
