
import vocabularyData from './vocabulary.json'

export type RelatedWord = {
  category: string
  japanese: string
  kana?: string
  meaning: string
  readingHints?: string[]
}

export type Word = {
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
  relatedWords?: RelatedWord[]
}

export const words = vocabularyData as unknown as Word[]
