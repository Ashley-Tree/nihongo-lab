import { useEffect, useState } from 'react'
import { Brain, Check, Clock3, RefreshCw } from 'lucide-react'
import { listDueReviewTasks, rateUnifiedReview, syncUnifiedReviewQueue, type ReviewTask } from '../services/unifiedReviewService'
import type { ReviewRating } from '../services/unifiedReviewAlgorithm'

const ratings: { value: ReviewRating; label: string; style: string }[] = [
  { value: 0, label: '忘记', style: 'bg-rose-50 text-rose-700' },
  { value: 1, label: '困难', style: 'bg-amber-50 text-amber-700' },
  { value: 2, label: '记得', style: 'bg-emerald-50 text-emerald-700' },
  { value: 3, label: '简单', style: 'bg-sky-50 text-sky-700' },
]
const kindLabel: Record<string,string> = { vocabulary:'词汇', grammar:'语法', kanji:'汉字', reading:'阅读', listening:'听力' }

export default function UnifiedReviewPage() {
  const [tasks,setTasks] = useState<ReviewTask[]>([])
  const [index,setIndex] = useState(0)
  const [revealed,setRevealed] = useState(false)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  async function refresh() { setBusy(true); try { await syncUnifiedReviewQueue(); setTasks(await listDueReviewTasks()); setIndex(0); setRevealed(false) } catch(e) { console.error(e); setMessage('读取复习队列失败，请检查数据库 v5 升级。') } finally { setBusy(false) } }
  useEffect(() => { void refresh() }, [])
  const current = tasks[index]
  async function submit(rating:ReviewRating) { if(!current) return; setBusy(true); try { await rateUnifiedReview(current.key,rating); const next=tasks.filter((_,i)=>i!==index); setTasks(next); setIndex(i=>Math.min(i,next.length-1)); setRevealed(false); setMessage('已记录本次复习。') } catch(e) { console.error(e); setMessage(e instanceof Error?e.message:'保存复习结果失败。') } finally { setBusy(false) } }
  return <main className="mx-auto max-w-3xl space-y-6 pb-10">
    <header className="flex items-end justify-between gap-3"><div><p className="text-xs tracking-[.2em] text-stone-400">UNIFIED REVIEW</p><h1 className="mt-2 text-3xl font-semibold text-stone-800">全站智能复习</h1><p className="mt-2 text-sm text-stone-500">统一复习词汇、语法、汉字、阅读和听力记录。</p></div><button onClick={() => void refresh()} disabled={busy} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><RefreshCw size={16}/>同步队列</button></header>
    <div className="grid grid-cols-3 gap-3"><Stat label="今日待复习" value={tasks.length}/><Stat label="当前进度" value={tasks.length?`${Math.min(index+1,tasks.length)}/${tasks.length}`:'0/0'}/><Stat label="当前模块" value={current?kindLabel[current.kind]:'—'}/></div>
    {message && <p role="status" className="rounded-xl bg-stone-100 p-3 text-sm text-stone-600">{message}</p>}
    {!current ? <section className="rounded-3xl border border-stone-200 bg-white px-6 py-16 text-center"><Check className="mx-auto text-[#789078]" size={38}/><h2 className="mt-4 text-xl font-semibold">当前没有到期复习任务</h2><p className="mt-2 text-sm text-stone-500">先在词汇、语法、汉字、阅读或听力模块学习并建立记录，再点击同步队列。</p><button onClick={() => void refresh()} className="mt-6 rounded-xl bg-[#66836D] px-5 py-3 text-sm text-white">重新检查</button></section> : <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-8"><div className="flex items-center justify-between"><span className="rounded-full bg-[#EEF3EC] px-3 py-1 text-xs text-[#66836D]">{kindLabel[current.kind]}</span><span className="flex items-center gap-1 text-xs text-stone-400"><Clock3 size={14}/>到期复习</span></div><h2 className="mt-7 text-2xl font-semibold text-stone-800">{current.title}</h2><p className="mt-4 text-base leading-8 text-stone-700">{current.prompt}</p>{revealed ? <div className="mt-6 rounded-2xl bg-[#F5F7F2] p-5"><p className="text-xs text-stone-400">参考答案</p><p className="mt-2 whitespace-pre-wrap leading-7 text-stone-800">{current.answer}</p>{current.detail && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-500">{current.detail}</p>}</div> : <button onClick={() => setRevealed(true)} className="mt-7 w-full rounded-xl bg-[#66836D] py-3 text-sm font-medium text-white"><Brain className="mr-2 inline" size={16}/>显示答案</button>}{revealed && <div className="mt-6"><p className="mb-3 text-sm text-stone-500">根据刚才的回忆情况评分</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{ratings.map(r=><button key={r.value} disabled={busy} onClick={()=>void submit(r.value)} className={`rounded-xl px-3 py-3 text-sm font-medium ${r.style} disabled:opacity-50`}>{r.label}</button>)}</div></div>}</section>}
    <p className="text-xs leading-6 text-stone-400">评分安排：忘记约 10 分钟后重试；困难、记得、简单会逐步延长间隔。此为本地学习辅助算法，不代表官方 JLPT 评价。</p>
  </main>
}
function Stat({label,value}:{label:string;value:string|number}) { return <div className="rounded-2xl border border-stone-200 bg-white p-3"><p className="text-xl font-semibold text-stone-800">{value}</p><p className="mt-1 text-xs text-stone-500">{label}</p></div> }
