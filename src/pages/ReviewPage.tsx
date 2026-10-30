import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, RotateCcw, CalendarDays, CheckCircle2 } from 'lucide-react'
import { loadReviewDashboard, gradeReview } from '../services/reviewService'
import type { VocabularyItem } from '../services/vocabularyService'
import type { ReviewRating } from '../services/reviewAlgorithm'

type Dashboard = Awaited<ReturnType<typeof loadReviewDashboard>>
const options: { rating: ReviewRating; label: string; sub: string }[] = [
  { rating: 0, label: '忘记', sub: '10 分钟后' },
  { rating: 1, label: '困难', sub: '1 天后' },
  { rating: 2, label: '记得', sub: '按记忆间隔' },
  { rating: 3, label: '简单', sub: '较长间隔' },
]
export default function ReviewPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [queue, setQueue] = useState<VocabularyItem[]>([])
  const [showBack, setShowBack] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sessionDone, setSessionDone] = useState(0)
  const [level, setLevel] = useState('全部')
  const [dailyNewLimit, setDailyNewLimit] = useState(10)
  const refresh = useCallback(async () => {
    const d = await loadReviewDashboard()
    setDashboard(d)
    return d
  }, [])
  useEffect(() => { void refresh().catch(() => setError('读取复习数据失败')) }, [refresh])
  const due = useMemo(() => dashboard?.due.filter(w => level === '全部' || w.level === level) ?? [], [dashboard, level])
  const fresh = useMemo(() => dashboard?.newWords.filter(w => level === '全部' || w.level === level) ?? [], [dashboard, level])
  const current = queue[0]
  async function rate(rating: ReviewRating) {
    if (!current || busy) return
    setBusy(true); setError('')
    try {
      await gradeReview(current.id, rating)
      setQueue(previous => previous.slice(1))
      setSessionDone(n => n + 1)
      setShowBack(false)
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败') }
    finally { setBusy(false) }
  }
  function start(words: VocabularyItem[]) {
    setQueue(words); setShowBack(false); setSessionDone(0); setError('')
  }
  return <main className="mx-auto max-w-5xl space-y-6 pb-12">
    <header><p className="text-xs tracking-[0.2em] text-[#8A9487]">SPACED REPETITION</p><h1 className="mt-2 text-3xl font-semibold">每日智能复习</h1><p className="mt-2 text-sm text-gray-500">复习记录只保存在当前浏览器。今天到期的单词优先，新单词单独开始。</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {([['到期复习',due.length],['未学新词',fresh.length],['已开始学习',dashboard?.learned ?? 0],['今日复习次数',dashboard?.reviewedToday ?? 0]] as const).map(([label,value]) => <div key={label} className="rounded-2xl border bg-white p-4"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-semibold text-[#66836D]">{value}</p></div>)}
    </section>
    {!dashboard && <p>正在加载复习记录...</p>}
    {!current && <section className="space-y-4 rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-center gap-3"><label htmlFor="review-level">选择等级</label><select id="review-level" className="rounded-lg border px-3 py-2" value={level} onChange={e => setLevel(e.target.value)}>{['全部','N5','N4','N3','N2','N1'].map(l => <option key={l}>{l}</option>)}</select><label htmlFor="daily-limit">每轮新词</label><select id="daily-limit" className="rounded-lg border px-3 py-2" value={dailyNewLimit} onChange={e => setDailyNewLimit(Number(e.target.value))}>{[5,10,20,30].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
      {sessionDone > 0 && <p className="flex items-center gap-2 text-[#66836D]"><CheckCircle2 size={18}/>上一轮完成 {sessionDone} 次评分</p>}
      <div className="flex flex-wrap gap-3"><button disabled={!due.length} onClick={() => start(due)} className="rounded-xl bg-[#66836D] px-5 py-3 text-white disabled:opacity-40"><CalendarDays size={17} className="mr-2 inline"/>开始到期复习（{due.length}）</button><button disabled={!fresh.length} onClick={() => start(fresh.slice(0,dailyNewLimit))} className="rounded-xl border px-5 py-3 disabled:opacity-40"><BookOpen size={17} className="mr-2 inline"/>学习新词（最多 {dailyNewLimit}）</button></div>
      {!due.length && <p className="text-sm text-gray-500">当前没有到期的单词。你可以开始学习新词，或等复习时间到来。</p>}
      <Link className="inline-block text-sm text-[#66836D] underline" to="/vocabulary">返回词汇学习页</Link>
    </section>}
    {current && <section className="space-y-5 rounded-2xl border bg-white p-6 text-center">
      <p className="text-sm text-gray-400">本轮剩余 {queue.length} · 已评分 {sessionDone}</p>
      <p className="text-4xl font-semibold">{current.japanese}</p><p className="text-lg text-gray-500">{current.kana}</p>
      {showBack ? <div className="space-y-3 border-t pt-5"><p className="text-xl font-medium">{current.meaning}</p><p>{current.example}</p><p className="text-sm text-gray-500">{current.exampleMeaning}</p><p className="text-xs text-gray-400">{current.level} · {current.type}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{options.map(o => <button key={o.rating} disabled={busy} onClick={() => void rate(o.rating)} className="rounded-xl border p-3 hover:bg-[#EAF0E8] disabled:opacity-50"><strong className="block">{o.label}</strong><span className="text-xs text-gray-500">{o.sub}</span></button>)}</div></div> : <button className="rounded-xl bg-[#66836D] px-6 py-3 text-white" onClick={() => setShowBack(true)}>显示答案</button>}
      <button disabled={busy} onClick={() => start([])} className="flex items-center gap-2 mx-auto text-sm text-gray-500"><RotateCcw size={14}/>结束本轮</button>
    </section>}
  </main>
}
