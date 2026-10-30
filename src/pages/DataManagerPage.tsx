import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Download, FileUp, RotateCcw, ShieldCheck, Upload } from 'lucide-react'
import { downloadFullBackup, restoreFullBackup, validateFullBackup, type FullBackup, type RestoreMode } from '../services/fullBackupService'
import { getAllVocabulary, importVocabulary, parseVocabularyFile, type ImportMode, type VocabularyInput } from '../services/vocabularyService'

const btn = 'rounded-xl border border-[#DCE3D8] bg-white px-4 py-2 text-sm hover:bg-[#F2F6F0] disabled:opacity-50'
export default function DataManagerPage() {
  const wordFile = useRef<HTMLInputElement>(null)
  const backupFile = useRef<HTMLInputElement>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [words, setWords] = useState<VocabularyInput[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [mode, setMode] = useState<ImportMode>('skip')
  const [backup, setBackup] = useState<FullBackup | null>(null)
  const [backupName, setBackupName] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  async function refresh() { setTotal((await getAllVocabulary()).length) }
  useEffect(() => { void refresh().catch(e => setError(String(e))) }, [])
  async function chooseWords(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
    setError(''); setNotice(''); setWords(null)
    if (f.size > 10 * 1024 * 1024) { setError('文件不能超过 10MB'); return }
    try { const entries = parseVocabularyFile(await f.text(), f.name); setWords(entries); setFileName(f.name) }
    catch (e) { setError(e instanceof Error ? e.message : '词库文件读取失败') }
  }
  async function importWords() {
    if (!words || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await importVocabulary(words, mode)
      await refresh()
      setWords(null)
      setNotice(`导入成功：新增 ${result.added} 条、覆盖 ${result.updated} 条、跳过重复 ${result.skipped} 条。请点击左侧“词汇学习”查看。`)
    } catch (e) { setError(e instanceof Error ? e.message : '导入失败') }
    finally { setBusy(false) }
  }
  async function chooseBackup(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
    setBackup(null); setError(''); setNotice('')
    if (f.size > 30 * 1024 * 1024) { setError('备份不能超过 30MB'); return }
    try {
      const data: unknown = JSON.parse(await f.text())
      validateFullBackup(data)
      setBackup(data); setBackupName(f.name)
    } catch (e) { setError(e instanceof Error ? e.message : '备份无效') }
  }
  async function restore(mode: RestoreMode) {
    if (!backup || busy) return
    const danger = mode === 'replace'
    const message = danger ? '替换恢复将清空本应用现有学习数据再写入备份，无法撤销。请先下载当前完整备份。确定继续吗？' : '将备份中的记录按 ID 合并到当前数据；冲突记录可能被覆盖。请先下载当前完整备份。确定继续吗？'
    if (!window.confirm(message)) return
    if (danger && window.prompt('请输入「替换恢复」确认高风险操作') !== '替换恢复') return
    setBusy(true); setError(''); setNotice('')
    try { await restoreFullBackup(backup, mode); setBackup(null); await refresh(); window.dispatchEvent(new Event('nihongo-vocabulary-changed')); setNotice('恢复完成。请刷新其他学习页面，确认数据。') }
    catch (e) { setError(e instanceof Error ? e.message : '恢复失败') }
    finally { setBusy(false) }
  }
  return <div className="mx-auto max-w-[1000px] space-y-6 pb-12">
    <header><p className="text-xs tracking-widest text-[#899889]">DATA MANAGEMENT</p><h1 className="mt-2 text-3xl font-semibold">数据管理</h1><p className="mt-2 text-sm text-[#788579]">普通词汇导入与完整学习备份分开管理。当前词库：{total ?? '读取中'} 条。</p></header>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</div>}
    <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">1. 上传词库 JSON / CSV</h2>
      <p className="text-sm text-[#788579]">导入后存储到当前浏览器的 IndexedDB。不会自动修改 GitHub 上的 JSON 文件。</p>
      <input className="hidden" ref={wordFile} type="file" accept=".json,.csv" onChange={e => void chooseWords(e)}/>
      <button type="button" className={btn} onClick={() => wordFile.current?.click()}><FileUp className="mr-2 inline" size={17}/>选择词汇文件</button>
      {words && <div className="space-y-3 rounded-xl bg-[#F4F8F2] p-4 text-sm"><p>待导入：{fileName}，共 {words.length} 条</p><p>预览：{words.slice(0, 3).map(w => `${w.japanese}（${w.kana}）`).join('、')}</p>
      <label className="block">重复词处理：<select value={mode} onChange={e => setMode(e.target.value as ImportMode)} className="ml-2 rounded border p-2"><option value="skip">跳过已有（推荐）</option><option value="overwrite">覆盖已有内容</option></select></label>
      <button type="button" disabled={busy} onClick={() => void importWords()} className="rounded-xl bg-[#66836D] px-4 py-2 text-white disabled:opacity-50">确认导入 {words.length} 条</button></div>}
    </section>
    <section className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">2. 完整备份</h2><p className="text-sm text-[#788579]">包括词库、收藏、复习、语法、汉字、阅读、听力和考试记录。与普通词库 JSON 不同。</p>
      <button type="button" disabled={busy} className={btn} onClick={() => void (async () => { try { await downloadFullBackup(); setNotice('完整备份已下载，请妥善保存。') } catch (e) { setError(String(e)) } })()}><Download className="mr-2 inline" size={17}/>下载完整备份</button>
      <input className="hidden" ref={backupFile} type="file" accept=".json" onChange={e => void chooseBackup(e)}/>
      <button type="button" disabled={busy} className={btn} onClick={() => backupFile.current?.click()}><Upload className="mr-2 inline" size={17}/>选择备份文件</button>
      {backup && <div className="space-y-3 rounded-xl bg-[#F4F8F2] p-4 text-sm"><p>备份：{backupName}</p><p>备份时间：{backup.exportedAt}</p><p>数据表：{Object.entries(backup.tables).map(([k, v]) => `${k} ${v.length}`).join(' · ')}</p>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void restore('merge')} className={btn}><RotateCcw className="mr-1 inline" size={16}/>合并恢复</button><button type="button" disabled={busy} onClick={() => void restore('replace')} className="rounded-xl border border-red-300 px-4 py-2 text-sm text-red-700">替换恢复（危险）</button></div></div>}
      <p className="flex items-start gap-2 text-xs text-[#788579]"><ShieldCheck size={17}/>恢复前务必先下载当前备份；首次恢复建议在另一浏览器测试。</p>
    </section>
  </div>
}
