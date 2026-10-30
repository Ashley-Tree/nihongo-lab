import n5Batch01 from '../data/imports/n5_import_batch_01.json'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Search, Plus, Pencil, Trash2, X, Save, RotateCcw, Download, Upload, RotateCw, FileJson } from 'lucide-react'
import { words as initialWords } from '../data/vocabulary'
import {
  addVocabulary, deleteVocabulary, downloadText, exportBackup, getAllVocabulary,
  getDeletedInitialVocabulary, importVocabulary, parseVocabularyFile,
  resetInitialOverride, restoreBackup, restoreInitialVocabulary, updateVocabulary,
  vocabularyToCSV, type ImportMode, type VocabularyInput, type VocabularyItem,
} from '../services/vocabularyService'

const levels = ['全部', 'N5', 'N4', 'N3', 'N2', 'N1'] as const
const blank: VocabularyInput = { japanese: '', kana: '', meaning: '', example: '', exampleMeaning: '', level: 'N5', type: '名词' }
const formFields = [
  { key: 'japanese', title: '日语单词', placeholder: '例：図書館' },
  { key: 'kana', title: '假名', placeholder: '例：としょかん' },
  { key: 'meaning', title: '中文释义', placeholder: '例：图书馆' },
  { key: 'example', title: '日语例句', placeholder: '例：図書館で本を読みます。' },
  { key: 'exampleMeaning', title: '例句翻译', placeholder: '例：在图书馆读书。' },
  { key: 'type', title: '词性', placeholder: '例：名词' },
] as const

export default function VocabularyManagerPage() {
  const [words, setWords] = useState<VocabularyItem[]>([])
  const [deleted, setDeleted] = useState<typeof initialWords>([])
  const [keyword, setKeyword] = useState('')
  const [level, setLevel] = useState<string>('全部')
  const [source, setSource] = useState('全部')
  const [viewDeleted, setViewDeleted] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<VocabularyInput>({ ...blank })
  const [pending, setPending] = useState<VocabularyInput[] | null>(null)
  const [pendingName, setPendingName] = useState('')
  const [mode, setMode] = useState<ImportMode>('skip')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    const [items, removed] = await Promise.all([getAllVocabulary(), getDeletedInitialVocabulary()])
    setWords(items)
    setDeleted(removed)
    setReady(true)
  }, [])

  useEffect(() => {
    refresh().catch(err => { console.error(err); setError('读取本地词库失败'); setReady(true) })
  }, [refresh])

  const filtered = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase()
    const candidates: VocabularyItem[] = viewDeleted
      ? deleted.map(w => ({ ...w, source: 'initial' as const })) : words
    return candidates.filter(w =>
      (level === '全部' || w.level === level) &&
      (viewDeleted || source === '全部' || w.source === source) &&
      (!query || [w.japanese, w.kana, w.meaning].some(s => s.toLocaleLowerCase().includes(query)))
    )
  }, [words, deleted, keyword, level, source, viewDeleted])

  async function act(task: () => Promise<string>) {
    setBusy(true); setError(''); setNotice('')
    try { const text = await task(); await refresh(); setNotice(text) }
    catch (err) { console.error(err); setError(err instanceof Error ? err.message : '操作失败') }
    finally { setBusy(false) }
  }

  function openNew() { setEditingId(null); setForm({ ...blank }); setError(''); setFormOpen(true) }
  function openEdit(w: VocabularyItem) {
    setEditingId(w.id)
    setForm({ japanese: w.japanese, kana: w.kana, meaning: w.meaning, example: w.example, exampleMeaning: w.exampleMeaning, level: w.level, type: w.type })
    setError(''); setFormOpen(true)
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await act(async () => {
      if (editingId !== null) await updateVocabulary(editingId, form)
      else await addVocabulary(form)
      setFormOpen(false)
      return editingId === null ? '添加成功' : '修改成功'
    })
  }
  function remove(w: VocabularyItem) {
    if (!window.confirm(`确定删除「${w.japanese}」吗？\n初始词汇以后可以在“已删除”中恢复。`)) return
    void act(async () => { await deleteVocabulary(w.id); return '词条已删除' })
  }
  function restore(id: number) { void act(async () => { await restoreInitialVocabulary(id); return '已恢复初始词条' }) }
  function reset(id: number) {
    if (!window.confirm('恢复该词条的原始内容？个人修改将被删除。')) return
    void act(async () => { await resetInitialOverride(id); return '已恢复原始内容' })
  }

  async function onImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(''); setNotice(''); setPending(null)
    if (file.size > 10 * 1024 * 1024) { setError('文件不能超过 10 MB'); return }
    try {
      const items = parseVocabularyFile(await file.text(), file.name)
      setPending(items); setPendingName(file.name)
    } catch (err) { setError(err instanceof Error ? err.message : '文件解析失败') }
  }
  function confirmImport() {
    if (!pending) return
    void act(async () => {
      const res = await importVocabulary(pending, mode)
      setPending(null)
      return `导入完成：新增 ${res.added}，覆盖 ${res.updated}，跳过 ${res.skipped}`
    })
  }
  function exportWords(format: 'json' | 'csv') {
    const list = words.map(({ id, japanese, kana, meaning, example, exampleMeaning, level, type }) => ({ id, japanese, kana, meaning, example, exampleMeaning, level, type }))
    const date = new Date().toISOString().slice(0, 10)
    if (format === 'json') downloadText(`nihongo-vocabulary-${date}.json`, JSON.stringify(list, null, 2), 'application/json;charset=utf-8')
    else downloadText(`nihongo-vocabulary-${date}.csv`, vocabularyToCSV(list), 'text/csv;charset=utf-8')
  }
  async function backup() {
    await act(async () => {
      const data = await exportBackup()
      downloadText(`nihongo-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json;charset=utf-8')
      return '备份文件已导出（含学习记录）'
    })
  }
  async function onRestoreBackup(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { setError('备份文件不能超过 25 MB'); return }
    let data: unknown
    try { data = JSON.parse(await file.text()) }
    catch { setError('备份 JSON 格式无效'); return }
    if (!window.confirm('恢复备份将替换当前个人词库、删除记录、收藏和掌握状态。\n请先点击“完整备份”保存当前数据。\n确定继续吗？')) return
    await act(async () => { await restoreBackup(data); return '备份恢复成功；返回学习页后请刷新一次页面' })
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] tracking-[2px] text-[#9A9D95]">VOCABULARY MANAGEMENT</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">词库管理中心</h1><p className="mt-2 text-sm text-[#858B82]">词库在本机保存；初始 JSON 不会被直接修改。</p></div>
        <button onClick={openNew} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#66836D] px-4 py-3 text-sm text-white disabled:opacity-50"><Plus size={17}/>添加词汇</button>
      </div>
      {notice && <div role="status" className="rounded-xl bg-[#EAF0E8] p-3 text-sm text-[#526D57]">{notice}</div>}
      {error && <div role="alert" className="rounded-xl bg-[#F9EDEA] p-3 text-sm text-[#A5685E]">{error}</div>}
      <div className="grid grid-cols-3 gap-3">
        {[
          { title: '当前总数', count: words.length },
          { title: '初始词库', count: words.filter(w => w.source === 'initial').length },
          { title: '个人词库', count: words.filter(w => w.source === 'custom').length },
        ].map(item => <div key={item.title} className="rounded-2xl border border-[#ECEDE7] bg-white p-4"><p className="text-2xl font-semibold">{ready ? item.count : '—'}</p><p className="mt-1 text-xs text-[#92978E]">{item.title}</p></div>)}
      </div>
      <section className="space-y-3 rounded-2xl border border-[#ECEDE7] bg-white p-4">
        <h2 className="font-medium">导入、导出与备份</h2>
        <p className="text-xs leading-6 text-[#858B82]">普通 JSON/CSV 词库可导入；“完整备份”另含已收藏、已掌握和删除记录。请勿把完整备份当成普通词库导入。</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void act(async () => { const result = await importVocabulary(n5Batch01 as unknown as VocabularyInput[], 'skip'); return `内置 N5 第一批：新增 ${result.added}，跳过 ${result.skipped}` })} disabled={busy} className="rounded-xl border border-[#819A7D] px-3 py-2 text-xs text-[#66836D]">导入内置 N5 50 词</button>
          <button onClick={() => importRef.current?.click()} disabled={busy} className="rounded-xl border px-3 py-2 text-xs"><Upload size={15} className="mr-1 inline"/>导入 JSON/CSV</button>
          <button onClick={() => exportWords('json')} className="rounded-xl border px-3 py-2 text-xs"><FileJson size={15} className="mr-1 inline"/>导出词库 JSON</button>
          <button onClick={() => exportWords('csv')} className="rounded-xl border px-3 py-2 text-xs"><Download size={15} className="mr-1 inline"/>导出词库 CSV</button>
          <button onClick={() => void backup()} disabled={busy} className="rounded-xl border px-3 py-2 text-xs">完整备份</button>
          <button onClick={() => backupRef.current?.click()} disabled={busy} className="rounded-xl border px-3 py-2 text-xs">恢复完整备份</button>
        </div>
        <input ref={importRef} className="hidden" type="file" accept=".json,.csv,application/json,text/csv" onChange={onImportFile}/>
        <input ref={backupRef} className="hidden" type="file" accept=".json,application/json" onChange={e => void onRestoreBackup(e)}/>
      </section>
      <section className="space-y-3 rounded-2xl border border-[#ECEDE7] bg-white p-4">
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2"><Search size={17} className="text-[#92978E]"/><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索单词、假名、中文..." className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>{keyword && <button aria-label="清除搜索" onClick={() => setKeyword('')}><X size={16}/></button>}</div>
        <div className="flex flex-wrap gap-2">{levels.map(l => <button key={l} onClick={() => setLevel(l)} className={`rounded-xl px-3 py-2 text-xs ${level === l ? 'bg-[#66836D] text-white' : 'bg-[#F4F5F0] text-[#71836F]'}`}>{l}</button>)}</div>
        <div className="flex flex-wrap gap-2">
          {[['全部','全部'],['初始词库','initial'],['个人词库','custom']].map(([label,value]) => <button key={value} onClick={() => { setSource(value); setViewDeleted(false) }} className={`rounded-lg px-3 py-2 text-xs ${!viewDeleted && source === value ? 'bg-[#EAF0E8] text-[#526D57]' : 'text-[#92978E]'}`}>{label}</button>)}
          <button onClick={() => setViewDeleted(true)} className={`rounded-lg px-3 py-2 text-xs ${viewDeleted ? 'bg-[#EAF0E8] text-[#526D57]' : 'text-[#92978E]'}`}>已删除的初始词汇（{deleted.length}）</button>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#ECEDE7] bg-white">
        <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-semibold">{viewDeleted ? '可恢复词汇' : '词汇列表'}</h2><p className="text-xs text-[#92978E]">显示 {filtered.length} 条</p></div><button onClick={() => void act(async () => { await refresh(); return '列表已刷新' })} disabled={busy} aria-label="刷新列表"><RotateCcw size={18}/></button></div>
        {!ready ? <p className="p-6 text-sm">加载中...</p> : !filtered.length ? <p className="p-8 text-center text-sm text-[#92978E]">没有符合条件的词条</p> : <div className="divide-y divide-[#F0F0EB]">{filtered.map(w => <div key={w.id} className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{w.japanese}</span><span className="text-xs text-[#899487]">{w.kana}</span><span className="rounded bg-[#F1F3ED] px-2 py-1 text-[10px]">{w.level}</span></div><p className="mt-1 text-xs text-[#858B82]">{w.meaning}</p><p className="mt-1 text-[10px] text-[#A0A39B]">ID {w.id} · {w.source === 'initial' ? '初始词库' : '个人词库'}{w.modified ? ' · 已修改' : ''}</p></div>
          <div className="flex shrink-0 gap-1">{viewDeleted ? <button onClick={() => restore(w.id)} disabled={busy} title="恢复初始词汇" className="rounded-lg p-2 text-[#66836D]"><RotateCw size={18}/></button> : <><button title="编辑" aria-label={`编辑 ${w.japanese}`} onClick={() => openEdit(w)} disabled={busy} className="rounded-lg p-2 text-[#66836D]"><Pencil size={18}/></button>{w.modified && <button title="恢复原始内容" aria-label={`还原 ${w.japanese}`} onClick={() => reset(w.id)} disabled={busy} className="rounded-lg p-2 text-[#66836D]"><RotateCcw size={18}/></button>}<button title="删除" aria-label={`删除 ${w.japanese}`} onClick={() => remove(w)} disabled={busy} className="rounded-lg p-2 text-[#B17D73]"><Trash2 size={18}/></button></>}</div>
        </div>)}</div>}
      </section>
      <p className="text-xs leading-6 text-[#92978E]">提示：个人词汇删除后不会自动恢复；完整备份可恢复它。发音功能仍暂缓处理。</p>
      {formOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setFormOpen(false) }}><div role="dialog" aria-modal="true" aria-label={editingId === null ? '添加词汇' : '编辑词汇'} className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-2xl sm:p-7"><div className="mb-5 flex justify-between"><h2 className="text-xl font-semibold">{editingId === null ? '添加词汇' : `编辑词汇 #${editingId}`}</h2><button aria-label="关闭" disabled={busy} onClick={() => setFormOpen(false)}><X/></button></div><form onSubmit={e => void save(e)} className="space-y-3">{formFields.map(field => <label key={field.key} className="block text-sm"><span className="mb-1 block text-xs text-[#687469]">{field.title}</span><input required value={form[field.key]} onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder} className="w-full rounded-xl border bg-[#FAFBF8] p-3 outline-none focus:border-[#819A7D]"/></label>)}<label className="block text-sm"><span className="mb-1 block text-xs">JLPT 等级</span><select value={form.level} onChange={e => setForm(prev => ({ ...prev, level: e.target.value as VocabularyInput['level'] }))} className="w-full rounded-xl border p-3">{levels.slice(1).map(l => <option key={l}>{l}</option>)}</select></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex gap-3 pt-3"><button type="button" disabled={busy} onClick={() => setFormOpen(false)} className="flex-1 rounded-xl border p-3">取消</button><button type="submit" disabled={busy} className="flex-1 rounded-xl bg-[#66836D] p-3 text-white"><Save size={16} className="mr-1 inline"/>{busy ? '保存中...' : '保存'}</button></div></form></div></div>}
      {pending && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-5"><div role="dialog" aria-modal="true" aria-label="确认导入" className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-5 sm:rounded-2xl"><div className="flex justify-between"><h2 className="text-lg font-semibold">确认导入</h2><button disabled={busy} aria-label="关闭" onClick={() => setPending(null)}><X/></button></div><p className="mt-3 text-sm">文件：{pendingName}；有效词条 {pending.length} 条。</p><p className="mt-2 text-xs text-[#858B82]">同日语+假名组合视为同一词条。覆盖时保留已有 ID 和学习记录；新增词条重新分配 ID。导入文件原 ID 不会直接使用。</p><div className="mt-4 space-y-2 text-sm"><label className="block"><input type="radio" checked={mode === 'skip'} onChange={() => setMode('skip')}/> 跳过已有词汇（推荐）</label><label className="block"><input type="radio" checked={mode === 'overwrite'} onChange={() => setMode('overwrite')}/> 覆盖已有词汇的内容（保留 ID）</label></div><div className="mt-4 max-h-40 overflow-auto rounded-xl bg-[#F6F7F3] p-3 text-xs">{pending.slice(0, 8).map((w, i) => <div key={i} className="py-1">{w.japanese} · {w.kana} · {w.meaning}</div>)}{pending.length > 8 && <p>……其余 {pending.length - 8} 条</p>}</div><div className="mt-5 flex gap-2"><button disabled={busy} className="flex-1 rounded-xl border p-3" onClick={() => setPending(null)}>取消</button><button disabled={busy} className="flex-1 rounded-xl bg-[#66836D] p-3 text-white" onClick={confirmImport}>{busy ? '导入中...' : '确认导入'}</button></div></div></div>}
    </div>
  )
}
