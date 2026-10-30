
import vocabularyData from './vocabulary.json'

export type Word = {
  id: number
  japanese: string
  kana: string
  meaning: string
  example: string
  exampleMeaning: string
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  type: string
}

export const words = vocabularyData as unknown as Word[]
