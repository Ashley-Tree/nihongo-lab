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

class NihongoDatabase extends Dexie {
  vocabularyProgress!: Table<VocabularyProgress, number>
  customVocabulary!: Table<CustomVocabulary, number>
  deletedVocabulary!: Table<DeletedVocabulary, number>

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
  }
}

export const db = new NihongoDatabase()
