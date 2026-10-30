import { words as initialWords, type Word } from '../data/vocabulary'
import { db, type CustomVocabulary, type DeletedVocabulary, type VocabularyProgress } from '../db/database'

export type VocabularyInput = Omit<Word, 'id'>
export type VocabularyItem = Word & { source: 'initial' | 'custom'; modified?: boolean }
export type ImportMode = 'skip' | 'overwrite'
export type ImportResult = { added: number; updated: number; skipped: number }
export type Backup = {
  format: 'nihongo-lab-backup'
  version: 1
  exportedAt: string
  customVocabulary: CustomVocabulary[]
  deletedVocabulary: DeletedVocabulary[]
  vocabularyProgress: VocabularyProgress[]
}

const fields = ['japanese', 'kana', 'meaning', 'example', 'exampleMeaning', 'level', 'type'] as const
const levels = new Set(['N5', 'N4', 'N3', 'N2', 'N1'])
const keyOf = (w: Pick<Word, 'japanese' | 'kana'>) => `${w.japanese.trim()}\u0000${w.kana.trim()}`
export const notifyVocabularyChanged = () => window.dispatchEvent(new Event('nihongo-vocabulary-changed'))

export function validateVocabularyInput(value: unknown): VocabularyInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('词条必须是对象')
  const item = value as Record<string, unknown>
  const clean: Record<string, string> = {}
  for (const field of fields) {
    if (typeof item[field] !== 'string' || !item[field].trim()) throw new Error(`缺少有效字段：${field}`)
    clean[field] = item[field].trim()
  }
  if (!levels.has(clean.level)) throw new Error(`无效 JLPT 等级：${clean.level}`)
  return clean as unknown as VocabularyInput
}

export async function getAllVocabulary(): Promise<VocabularyItem[]> {
  const [custom, deleted] = await Promise.all([db.customVocabulary.toArray(), db.deletedVocabulary.toArray()])
  const customMap = new Map(custom.map(w => [w.id, w]))
  const initialIds = new Set(initialWords.map(w => w.id))
  const deletedIds = new Set(deleted.map(w => w.id))
  const result: VocabularyItem[] = initialWords.filter(w => !deletedIds.has(w.id)).map(w => {
    const override = customMap.get(w.id)
    return override ? { ...override, source: 'initial', modified: true } : { ...w, source: 'initial', modified: false }
  })
  for (const w of custom) if (!initialIds.has(w.id) && !deletedIds.has(w.id)) result.push({ ...w, source: 'custom' })
  return result.sort((a, b) => a.id - b.id)
}

export async function getVocabularyById(id: number) {
  return (await getAllVocabulary()).find(w => w.id === id)
}

// 在写事务内统一分配 ID，已删除 ID 也保留，避免复用旧学习记录。
async function nextId(): Promise<number> {
  const [custom, deleted] = await Promise.all([db.customVocabulary.toArray(), db.deletedVocabulary.toArray()])
  return Math.max(0, ...initialWords.map(w => w.id), ...custom.map(w => w.id), ...deleted.map(w => w.id)) + 1
}

export async function addVocabulary(input: VocabularyInput): Promise<number> {
  const valid = validateVocabularyInput(input)
  const existing = await getAllVocabulary()
  if (existing.some(w => keyOf(w) === keyOf(valid))) throw new Error('该日语单词和假名组合已经存在')
  const id = await db.transaction('rw', db.customVocabulary, db.deletedVocabulary, async () => {
    const newId = await nextId()
    await db.customVocabulary.add({ ...valid, id: newId, updatedAt: Date.now() })
    return newId
  })
  notifyVocabularyChanged()
  return id
}

export async function updateVocabulary(id: number, input: VocabularyInput): Promise<void> {
  const valid = validateVocabularyInput(input)
  const all = await getAllVocabulary()
  if (!all.some(w => w.id === id)) throw new Error('找不到要编辑的词汇')
  if (all.some(w => w.id !== id && keyOf(w) === keyOf(valid))) throw new Error('另一个词条已使用相同日语和假名')
  await db.customVocabulary.put({ ...valid, id, updatedAt: Date.now() })
  notifyVocabularyChanged()
}

export async function deleteVocabulary(id: number): Promise<void> {
  if (!(await getVocabularyById(id))) throw new Error('词条不存在或已删除')
  await db.transaction('rw', db.customVocabulary, db.deletedVocabulary, async () => {
    await db.customVocabulary.delete(id)
    // 个人词汇也写入墓碑，确保旧 ID 不再被分配。
    await db.deletedVocabulary.put({ id, deletedAt: Date.now() })
  })
  notifyVocabularyChanged()
}

export async function restoreInitialVocabulary(id: number): Promise<void> {
  if (!initialWords.some(w => w.id === id)) throw new Error('只能恢复初始词库词条')
  await db.transaction('rw', db.customVocabulary, db.deletedVocabulary, async () => {
    await db.deletedVocabulary.delete(id)
    await db.customVocabulary.delete(id)
  })
  notifyVocabularyChanged()
}

export async function getDeletedInitialVocabulary() {
  const tombstones = await db.deletedVocabulary.toArray()
  const ids = new Set(tombstones.map(w => w.id))
  return initialWords.filter(w => ids.has(w.id))
}

export async function resetInitialOverride(id: number): Promise<void> {
  if (!initialWords.some(w => w.id === id)) throw new Error('不是初始词库词条')
  await db.customVocabulary.delete(id)
  notifyVocabularyChanged()
}

// CSV 支持 UTF-8 BOM、带引号字段、逗号和单元格内换行。
export function parseCSV(csv: string): Record<string, string>[] {
  const source = csv.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') {
      if (cell !== '') throw new Error('CSV 引号位置不正确')
      quoted = true
    } else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i++
      row.push(cell); if (row.some(v => v.trim())) rows.push(row)
      row = []; cell = ''
    } else cell += c
  }
  if (quoted) throw new Error('CSV 引号没有闭合')
  row.push(cell); if (row.some(v => v.trim())) rows.push(row)
  if (rows.length < 2) throw new Error('CSV 需要表头和至少一行数据')
  const header = rows.shift()!.map(h => h.trim().replace(/^\uFEFF/, ''))
  if (new Set(header).size !== header.length) throw new Error('CSV 存在重复表头')
  for (const field of fields) if (!header.includes(field)) throw new Error(`CSV 缺少列：${field}`)
  return rows.map((values, index) => {
    if (values.length !== header.length) throw new Error(`CSV 第 ${index + 2} 行列数不匹配`)
    return Object.fromEntries(header.map((key, i) => [key, values[i]]))
  })
}

export function parseVocabularyFile(text: string, filename: string): VocabularyInput[] {
  let records: unknown
  if (filename.toLowerCase().endsWith('.csv')) records = parseCSV(text)
  else if (filename.toLowerCase().endsWith('.json')) {
    try { records = JSON.parse(text.replace(/^\uFEFF/, '')) }
    catch { throw new Error('JSON 格式不正确') }
  } else throw new Error('请选择 .json 或 .csv 文件')
  if (!Array.isArray(records) || !records.length) throw new Error('文件需要包含非空词条数组')
  if (records.length > 20000) throw new Error('一次最多导入 20000 条词汇')
  const items = records.map((w, i) => {
    try { return validateVocabularyInput(w) }
    catch (error) { throw new Error(`第 ${i + 1} 条：${(error as Error).message}`) }
  })
  const seen = new Set<string>()
  for (const [index, w] of items.entries()) {
    if (seen.has(keyOf(w))) throw new Error(`导入文件第 ${index + 1} 条与前面的词条重复`)
    seen.add(keyOf(w))
  }
  return items
}

export async function importVocabulary(items: VocabularyInput[], mode: ImportMode): Promise<ImportResult> {
  if (!items.length || items.length > 20000) throw new Error('词条数量必须在 1～20000 之间')
  const valid = items.map(validateVocabularyInput)
  const seen = new Set<string>()
  for (const w of valid) {
    if (seen.has(keyOf(w))) throw new Error('文件内部包含重复词条')
    seen.add(keyOf(w))
  }
  const result: ImportResult = { added: 0, updated: 0, skipped: 0 }
  await db.transaction('rw', db.customVocabulary, db.deletedVocabulary, async () => {
    const current = await getAllVocabulary()
    const byKey = new Map(current.map(w => [keyOf(w), w]))
    let id = await nextId()
    for (const w of valid) {
      const match = byKey.get(keyOf(w))
      if (match) {
        if (mode === 'skip') { result.skipped++; continue }
        await db.customVocabulary.put({ ...w, id: match.id, updatedAt: Date.now() })
        result.updated++
      } else {
        await db.customVocabulary.add({ ...w, id, updatedAt: Date.now() })
        byKey.set(keyOf(w), { ...w, id, source: 'custom' })
        id++
        result.added++
      }
    }
  })
  notifyVocabularyChanged()
  return result
}

const escapeCSV = (value: string | number) => {
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}
export function vocabularyToCSV(words: Word[]): string {
  const headers = [...fields]
  return '\uFEFF' + [headers.join(','), ...words.map(w => headers.map(h => escapeCSV(w[h])).join(','))].join('\r\n')
}

export function downloadText(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export async function exportBackup(): Promise<Backup> {
  const [customVocabulary, deletedVocabulary, vocabularyProgress] = await Promise.all([
    db.customVocabulary.toArray(), db.deletedVocabulary.toArray(), db.vocabularyProgress.toArray(),
  ])
  return { format: 'nihongo-lab-backup', version: 1, exportedAt: new Date().toISOString(), customVocabulary, deletedVocabulary, vocabularyProgress }
}

export async function restoreBackup(value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('备份内容无效')
  const data = value as Partial<Backup>
  if (data.format !== 'nihongo-lab-backup' || data.version !== 1) throw new Error('不是支持的 Nihongo Lab 备份文件')
  if (!Array.isArray(data.customVocabulary) || !Array.isArray(data.deletedVocabulary) || !Array.isArray(data.vocabularyProgress)) throw new Error('备份缺少数据表')
  const custom = data.customVocabulary.map(w => {
    const input = validateVocabularyInput(w)
    if (!Number.isSafeInteger(w.id) || w.id <= 0 || !Number.isFinite(w.updatedAt)) throw new Error('备份中存在无效词条编号或时间')
    return { ...input, id: w.id, updatedAt: w.updatedAt }
  })
  const deleted = data.deletedVocabulary.map(w => {
    if (!w || !Number.isSafeInteger(w.id) || w.id <= 0 || !Number.isFinite(w.deletedAt)) throw new Error('无效的删除记录')
    return { id: w.id, deletedAt: w.deletedAt }
  })
  const progress = data.vocabularyProgress.map(w => {
    if (!w || !Number.isSafeInteger(w.wordId) || w.wordId <= 0 || typeof w.favorite !== 'boolean' || typeof w.mastered !== 'boolean' || !Number.isFinite(w.updatedAt)) throw new Error('无效的学习记录')
    return { wordId: w.wordId, favorite: w.favorite, mastered: w.mastered, updatedAt: w.updatedAt }
  })
  const unique = <T,>(arr: T[], id: (v: T) => number) => new Set(arr.map(id)).size === arr.length
  if (!unique(custom, w => w.id) || !unique(deleted, w => w.id) || !unique(progress, w => w.wordId)) throw new Error('备份包含重复 ID')
  if (custom.length > 100000 || deleted.length > 100000 || progress.length > 100000) throw new Error('备份数据量超过限制')
  await db.transaction('rw', db.customVocabulary, db.deletedVocabulary, db.vocabularyProgress, async () => {
    await Promise.all([db.customVocabulary.clear(), db.deletedVocabulary.clear(), db.vocabularyProgress.clear()])
    if (custom.length) await db.customVocabulary.bulkAdd(custom)
    if (deleted.length) await db.deletedVocabulary.bulkAdd(deleted)
    if (progress.length) await db.vocabularyProgress.bulkAdd(progress)
  })
  notifyVocabularyChanged()
}
