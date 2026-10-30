import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BookOpen, Brain, CalendarDays, CheckCircle2, Download, GraduationCap, RotateCcw, Target } from 'lucide-react'
import { db } from '../db/database'
import { downloadFullBackup, restoreFullBackup } from '../services/fullBackupService'

type Snapshot = { vocab: number; mastered: number; favorites: number; reviewCount: number; dueCount: number; examCount: number; examCorrect: number; examTotal: number; moduleCount: number; recentDays: { day: string; count: number }[] }
const empty: Snapshot = { vocab: 0, mastered: 0, favorites: 0, reviewCount: 0, dueCount: 0, examCount: 0, examCorrect: 0, examTotal: 0, moduleCount: 0, recentDays: [] }

export default function StudyReportPage() {
  const [data, setData] = useState<Snapshot>(empty)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [restoreFile, setRestoreFile] = useState<File | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [vocab, logs, schedules, exams, progress, unifiedLogs, unifiedSchedules] = await Promise.all([
        db.vocabularyProgress.toArray(), db.reviewLogs.toArray(), db.reviewSchedules.toArray(),
        db.examAttempts.toArray(), db.studyProgress.toArray(),
        db.unifiedReviewLogs.toArray(), db.unifiedReviewSchedules.toArray(),
      ])
      const examCorrect = exams.reduce((sum, x) => sum + x.correct, 0)
      const examTotal = exams.reduce((sum, x) => sum + x.total, 0)
      const counts = new Map<string, number>()
      for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - offset)
        counts.set(date.toISOString().slice(0, 10), 0)
      }
      for (const log of [...logs, ...unifiedLogs]) {
        const day = new Date(log.reviewedAt).toISOString().slice(0, 10)
        if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1)
      }
      setData({
        vocab: vocab.length,
        mastered: vocab.filter(x => x.mastered).length + progress.filter(x => x.mastered).length,
        favorites: vocab.filter(x => x.favorite).length + progress.filter(x => x.favorite).length,
        reviewCount: logs.length + unifiedLogs.length,
        dueCount: schedules.filter(x => x.dueAt <= Date.now()).length + unifiedSchedules.filter(x => x.dueAt <= Date.now()).length,
        examCount: exams.length, examCorrect, examTotal, moduleCount: progress.length,
        recentDays: [...counts].map(([day, count]) => ({ day: day.slice(5), count })),
      })
    } catch (error) {
      console.error(error); setMessage('读取学习报告失败，请确认数据库已升级到 v5。')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const accuracy = useMemo(() => data.examTotal ? Math.round(data.examCorrect / data.examTotal * 100) : 0, [data])
  const max = Math.max(1, ...data.recentDays.map(x => x.count))

  return <main className="mx-auto max-w-6xl space-y-6 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs tracking-[.2em] text-stone-400">LEARNING ANALYTICS</p><h1 className="mt-2 text-3xl font-semibold text-stone-800">学习报告</h1><p className="mt-2 text-sm text-stone-500">查看本地记录的学习进度与复习表现。</p></div>
      <div className="flex gap-2"><button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><RotateCcw size={16}/>刷新</button><button onClick={() => void downloadFullBackup().then(() => setMessage('完整备份已导出。')).catch(() => setMessage('备份导出失败。'))} className="flex items-center gap-2 rounded-xl bg-[#66836D] px-3 py-2 text-sm text-white"><Download size={16}/>完整备份</button></div>
    </header>
    {message && <p role="status" className="rounded-xl bg-stone-100 p-3 text-sm text-stone-600">{message}</p>}
    {loading ? <p className="py-16 text-center text-stone-500">正在读取学习数据…</p> : <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<BookOpen/>} label="词汇学习记录" value={data.vocab}/><Metric icon={<CheckCircle2/>} label="已掌握项目" value={data.mastered}/><Metric icon={<Brain/>} label="累计复习次数" value={data.reviewCount}/><Metric icon={<CalendarDays/>} label="待复习词汇" value={data.dueCount}/>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">最近 7 天复习活动</h2><div className="mt-6 flex h-40 items-end justify-between gap-2">{data.recentDays.map(x => <div key={x.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs text-stone-500">{x.count}</span><div className="w-full max-w-10 rounded-t-md bg-[#8DA58D]" style={{ height: `${Math.max(4, x.count / max * 100)}%` }}/><span className="text-[10px] text-stone-400">{x.day}</span></div>)}</div></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">模拟考试表现</h2><div className="mt-5 flex items-center gap-5"><div className="flex size-28 items-center justify-center rounded-full border-[10px] border-[#E7EEE5]"><span className="text-2xl font-semibold">{accuracy}%</span></div><div className="space-y-2 text-sm text-stone-600"><p>完成考试：<b className="text-stone-800">{data.examCount}</b> 次</p><p>答对题目：<b className="text-stone-800">{data.examCorrect}</b> / {data.examTotal}</p><p>跨模块学习记录：<b className="text-stone-800">{data.moduleCount}</b> 条</p></div></div></div>
      </section>
      <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">本地备份与恢复</h2><p className="mt-2 text-sm leading-6 text-stone-500">完整备份包含词汇学习状态、个人词库、删除记录、词汇复习计划、跨模块学习记录、考试历史和全站复习计划。恢复前请先导出当前备份。</p><div className="mt-4 flex flex-wrap items-center gap-3"><input type="file" accept="application/json,.json" onChange={e=>setRestoreFile(e.target.files?.[0] ?? null)} className="max-w-full text-sm"/><button disabled={!restoreFile} onClick={async()=>{if(!restoreFile)return;try{const parsed=JSON.parse(await restoreFile.text());await restoreFullBackup(parsed,'merge');setMessage('备份已合并恢复；已有主键记录按备份内容更新。');await load()}catch(error){setMessage(error instanceof Error?error.message:'恢复失败。')}}} className="rounded-xl border px-3 py-2 text-sm disabled:opacity-40">合并恢复</button><button disabled={!restoreFile} onClick={async()=>{if(!restoreFile)return;if(!window.confirm('替换恢复会清空本应用相关学习表，再导入备份。请确认已另存当前备份。'))return;try{const parsed=JSON.parse(await restoreFile.text());await restoreFullBackup(parsed,'replace');setMessage('已替换恢复备份数据。');await load()}catch(error){setMessage(error instanceof Error?error.message:'恢复失败。')}}} className="rounded-xl bg-rose-700 px-3 py-2 text-sm text-white disabled:opacity-40">替换恢复</button></div></section>
      <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">学习数据说明</h2><p className="mt-2 text-sm leading-6 text-stone-500">报告只统计当前浏览器 IndexedDB 中已有的数据。尚未学习或尚未记录的内容不会被估算为已完成；不同设备之间的数据不会自动同步。建议定期导出完整备份。</p><div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-600"><span><Target className="mr-1 inline" size={15}/>收藏：{data.favorites}</span><span><GraduationCap className="mr-1 inline" size={15}/>考试正确率：{accuracy}%</span></div></section>
    </>}
  </main>
}
function Metric({icon,label,value}:{icon:ReactNode;label:string;value:number}) { return <div className="rounded-2xl border border-stone-200 bg-white p-4"><div className="text-[#789078]">{icon}</div><p className="mt-3 text-2xl font-semibold text-stone-800">{value}</p><p className="mt-1 text-xs text-stone-500">{label}</p></div> }
