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

class NihongoDatabase extends Dexie {
  vocabularyProgress!: Table<VocabularyProgress, number>
  customVocabulary!: Table<CustomVocabulary, number>
  deletedVocabulary!: Table<DeletedVocabulary, number>
  reviewSchedules!: Table<ReviewSchedule, number>
  reviewLogs!: Table<ReviewLog, number>

  constructor() {
    super('NihongoLabDB')
    // 不删除旧版本定义；Dexie 会保留用户现有学习记录。
    this.version(1).stores({
      vocabularyProgress: 'wordId, mastered, favorite, updatedAt',
    })
    this.version(2).stores({
      vocabularyProgress: 'wordId, mastered, favorite, updatedAt',
      customVocabulary: 'id, level, japanese, kana, updatedAt',
      deletedVocabulary: 'id, deletedAt',
    })
    this.version(3).stores({
      vocabularyProgress: 'wordId, mastered, favorite, updatedAt',
      customVocabulary: 'id, level, japanese, kana, updatedAt',
      deletedVocabulary: 'id, deletedAt',
      reviewSchedules: 'wordId, dueAt, lastReviewedAt',
      reviewLogs: '++id, wordId, reviewedAt, rating',
    })
  }
}

export const db = new NihongoDatabase()
