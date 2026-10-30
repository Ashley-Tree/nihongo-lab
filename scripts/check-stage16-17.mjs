import fs from 'node:fs'
import path from 'node:path'
const root = process.cwd()
const required = [
  'src/pages/StudyReportPage.tsx',
  'src/pages/UnifiedReviewPage.tsx',
  'src/services/fullBackupService.ts',
  'src/services/unifiedReviewService.ts',
  'src/services/unifiedReviewAlgorithm.ts',
  'src/db/database.v5.patch.txt',
]
let failed = false
for (const file of required) {
  const ok = fs.existsSync(path.join(root, file))
  console.log(`${ok ? '✓' : '✗'} ${file}`)
  if (!ok) failed = true
}
if (failed) process.exitCode = 1
else console.log('\nStage 16–17 package file check passed.')
