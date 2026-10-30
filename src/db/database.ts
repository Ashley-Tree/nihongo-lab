
import Dexie, { type Table } from 'dexie'

export interface VocabularyProgress {
  wordId: number
  mastered: boolean
  favorite: boolean
  updatedAt: number
}

export interface CustomVocabulary {
  id: number
  japanese: string
  kana: string
  meaning: string
  example: string
  exampleMeaning: string
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  type: string
  romaji?: string
  pitchAccent?: number | null
  pitchPattern?: string
  pitchSource?: string
  updatedAt: number
}

export interface DeletedVocabulary {
  id: number
  deletedAt: number
}

export interface ReviewSchedule {
  wordId: number
  dueAt: number
  intervalDays: number
  ease: number
  repetitions: number
  lapses: number
  lastReviewedAt: number
}

export interface ReviewLog {
  id?: number
  wordId: number
  rating: 0 | 1 | 2 | 3
  reviewedAt: number
  nextDueAt: number
}

export interface StudyProgress {
  key: string
  kind: 'grammar' | 'kanji' | 'reading' | 'listening'
  itemId: string
  mastered: boolean
  favorite: boolean
  updatedAt: number
  attempts: number
  correct: number
}

export interface ExamAttempt {
  id?: number
  level: string
  startedAt: number
  finishedAt: number
  total: number
  correct: number
  answers: {
    questionId: string
    selected: number
    correct: number
  }[]
}

// 第十七阶段：全站统一复习计划
export interface UnifiedReviewSchedule {
  key: string
  kind: 'vocabulary' | 'grammar' | 'kanji' | 'reading' | 'listening'
  itemId: string
  dueAt: number
  intervalDays: number
  ease: number
  repetitions: number
  lapses: number
  lastReviewedAt: number
  createdAt: number
}

// 第十七阶段：全站统一复习记录
export interface UnifiedReviewLog {
  id?: number
  key: string
  kind: 'vocabulary' | 'grammar' | 'kanji' | 'reading' | 'listening'
  itemId: string
  rating: 0 | 1 | 2 | 3
  reviewedAt: number
  nextDueAt: number
}

export interface DailyVocabularyPlan {
  date: string
  targetCount: number
  level: '全部' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  wordIds: number[]
  completedIds: number[]
  updatedAt: number
}

class NihongoDatabase extends Dexie {
  vocabularyProgress!: Table<VocabularyProgress, number>
  customVocabulary!: Table<CustomVocabulary, number>
  deletedVocabulary!: Table<DeletedVocabulary, number>
  reviewSchedules!: Table<ReviewSchedule, number>
  reviewLogs!: Table<ReviewLog, number>

  studyProgress!: Table<StudyProgress, string>
  examAttempts!: Table<ExamAttempt, number>

  // 第十七阶段新增数据表
  unifiedReviewSchedules!: Table<UnifiedReviewSchedule, string>
  unifiedReviewLogs!: Table<UnifiedReviewLog, number>
  dailyVocabularyPlans!: Table<DailyVocabularyPlan, string>

  constructor() {
    super('NihongoLabDB')

    // V1：原始词汇学习记录
    this.version(1).stores({
      vocabularyProgress: 'wordId, mastered, favorite, updatedAt',
    })

    // V2：个人词库和删除记录
    this.version(2).stores({
      vocabularyProgress: 'wordId, mastered, favorite, updatedAt',
      customVocabulary: 'id, level, japanese, kana, updatedAt',
      deletedVocabulary: 'id, deletedAt',
    })

    // V3：词汇间隔复习
    this.version(3).stores({
      vocabularyProgress: 'wordId, mastered, favorite, updatedAt',
      customVocabulary: 'id, level, japanese, kana, updatedAt',
      deletedVocabulary: 'id, deletedAt',
      reviewSchedules: 'wordId, dueAt, lastReviewedAt',
      reviewLogs: '++id, wordId, reviewedAt, rating',
    })

    // V4：语法、汉字、阅读、听力及考试记录
    this.version(4).stores({
      vocabularyProgress: 'wordId, mastered, favorite, updatedAt',
      customVocabulary: 'id, level, japanese, kana, updatedAt',
      deletedVocabulary: 'id, deletedAt',
      reviewSchedules: 'wordId, dueAt, lastReviewedAt',
      reviewLogs: '++id, wordId, reviewedAt, rating',
      studyProgress: 'key, kind, itemId, mastered, favorite, updatedAt',
      examAttempts: '++id, level, finishedAt',
    })

    // V5：全站统一智能复习系统
    this.version(5).stores({
      vocabularyProgress: 'wordId, mastered, favorite, updatedAt',
      customVocabulary: 'id, level, japanese, kana, updatedAt',
      deletedVocabulary: 'id, deletedAt',
      reviewSchedules: 'wordId, dueAt, lastReviewedAt',
      reviewLogs: '++id, wordId, reviewedAt, rating',
      studyProgress: 'key, kind, itemId, mastered, favorite, updatedAt',
      examAttempts: '++id, level, finishedAt',

      unifiedReviewSchedules: 'key, kind, itemId, dueAt, lastReviewedAt',
      unifiedReviewLogs: '++id, key, kind, itemId, reviewedAt, rating',
    })

    // V6：新增每日词汇学习计划表，不清空既有学习数据。
    this.version(6).stores({
      vocabularyProgress: 'wordId, mastered, favorite, updatedAt',
      customVocabulary: 'id, level, japanese, kana, updatedAt',
      deletedVocabulary: 'id, deletedAt',
      reviewSchedules: 'wordId, dueAt, lastReviewedAt',
      reviewLogs: '++id, wordId, reviewedAt, rating',
      studyProgress: 'key, kind, itemId, mastered, favorite, updatedAt',
      examAttempts: '++id, level, finishedAt',
      unifiedReviewSchedules: 'key, kind, itemId, dueAt, lastReviewedAt',
      unifiedReviewLogs: '++id, key, kind, itemId, reviewedAt, rating',
      dailyVocabularyPlans: 'date, level, updatedAt',
    })
  }
}

export const db = new NihongoDatabase()
