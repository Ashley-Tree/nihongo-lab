import { db } from '../db/database'

const TABLE_NAMES = [
  'vocabularyProgress', 'customVocabulary', 'deletedVocabulary',
  'reviewSchedules', 'reviewLogs', 'studyProgress', 'examAttempts',
  'unifiedReviewSchedules', 'unifiedReviewLogs', 'dailyVocabularyPlans',
] as const
const REQUIRED_TABLE_NAMES = TABLE_NAMES.filter(name => name !== 'dailyVocabularyPlans')
export type RestoreMode = 'merge' | 'replace'
export interface FullBackup {
  format: 'NihongoLabFullBackupV2'
  exportedAt: string
  app: 'Nihongo Lab'
  tables: Record<string, unknown[]>
}

export async function createFullBackup(): Promise<FullBackup> {
  const tables: Record<string, unknown[]> = {}
  for (const name of TABLE_NAMES) tables[name] = await db.table(name).toArray()
  return { format: 'NihongoLabFullBackupV2', exportedAt: new Date().toISOString(), app: 'Nihongo Lab', tables }
}

export async function downloadFullBackup(): Promise<void> {
  const backup = await createFullBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `nihongo-lab-full-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function validateFullBackup(value: unknown): asserts value is FullBackup {
  if (!value || typeof value !== 'object') throw new Error('备份文件不是有效 JSON 对象。')
  const backup = value as Partial<FullBackup>
  if (backup.format !== 'NihongoLabFullBackupV2' || !backup.tables || typeof backup.tables !== 'object') {
    throw new Error('备份格式不匹配。请使用 Nihongo Lab 完整备份文件。')
  }
  for (const name of TABLE_NAMES) {
    if (backup.tables[name] !== undefined && !Array.isArray(backup.tables[name])) throw new Error(`备份表 ${name} 格式错误。`)
  }
}

/** merge 会按主键合并；replace 会清空本应用列出的本地学习表后恢复。必须由用户主动选择调用。 */
export async function restoreFullBackup(value: unknown, mode: RestoreMode): Promise<void> {
  validateFullBackup(value)
  const backup = value as FullBackup
  if (mode === 'replace' && REQUIRED_TABLE_NAMES.some(name => !Array.isArray(backup.tables[name]))) {
    throw new Error('此备份缺少当前版本的数据表，不能使用替换恢复。请选择合并恢复或导出最新版完整备份。')
  }
  const tables = TABLE_NAMES.map(name => db.table(name))
  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      for (const name of TABLE_NAMES) await db.table(name).clear()
    }
    for (const name of TABLE_NAMES) {
      const rows = backup.tables[name] ?? []
      if (rows.length) await db.table(name).bulkPut(rows)
    }
  })
}
