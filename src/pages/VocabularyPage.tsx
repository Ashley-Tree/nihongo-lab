import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Search, Star, CheckCircle2, Play, Minus, Plus, Eye, GraduationCap } from 'lucide-react'
import { db } from '../db/database'
import { getAllVocabulary, type VocabularyItem } from '../services/vocabularyService'
import { getTodayVocabularyPlan, saveTodayVocabularyPlan } from '../services/vocabularyPlanService'

const levels = ['全部', 'N5', 'N4', 'N3', 'N2', 'N1'] as const
type ViewMode = 'browse' | 'study'

export default function VocabularyPage() {
  const navigate = useNavigate()
  const [words, setWords] = useState<VocabularyItem[]>([])
  const [level, setLevel] = useState<(typeof levels)[number]>('全部')
  const [keyword, setKeyword] = useState('')
  const [mode, setMode] = useState<ViewMode>('browse')
  const [revealedWordIds, setRevealedWordIds] = useState<number[]>([])
  const [targetCount, setTargetCount] = useState(20)
  const [favorites, setFavorites] = useState<number[]>([])
  const [mastered, setMastered] = useState<number[]>([])
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [todayCompleted, setTodayCompleted] = useState(0)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [allWords, records, plan] = await Promise.all([
          getAllVocabulary(), db.vocabularyProgress.toArray(), getTodayVocabularyPlan(),
        ])
        if (!active) return
        setWords(allWords)
        setFavorites(records.filter(item => item.favorite).map(item => item.wordId))
        setMastered(records.filter(item => item.mastered).map(item => item.wordId))
        if (plan) {
          setTargetCount(plan.targetCount)
          setLevel(plan.level)
          setTodayCompleted(plan.completedIds.length)
        }
      } catch (err) {
        console.error(err)
        if (active) setError('读取词库或学习记录失败，请刷新页面重试。')
      } finally { if (active) setLoading(false) }
    }
    void load()
    const onChanged = () => { void load() }
    window.addEventListener('nihongo-vocabulary-changed', onChanged)
    return () => { active = false; window.removeEventListener('nihongo-vocabulary-changed', onChanged) }
  }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLocaleLowerCase()
    return words.filter(word =>
      (level === '全部' || word.level === level) &&
      (!onlyFavorites || favorites.includes(word.id)) &&
      (!q || [word.japanese, word.kana, word.meaning, word.romaji ?? ''].some(value => value.toLocaleLowerCase().includes(q))),
    )
  }, [words, level, keyword, favorites, onlyFavorites])

  function changeMode(next: ViewMode) {
    setMode(next)
    setRevealedWordIds([])
  }

  function toggleReveal(id: number) {
    setRevealedWordIds(old => old.includes(id) ? old.filter(item => item !== id) : [...old, id])
  }

  const todayCount = words.filter(word => level === '全部' || word.level === level).length

  async function startLearning() {
    if (!words.length) return
    setStarting(true); setError('')
    try {
      const plan = await saveTodayVocabularyPlan(words, targetCount, level, mastered)
      if (!plan.wordIds.length) { setError('当前等级没有可安排的词汇，请更换等级或导入词库。'); return }
      navigate('/vocabulary/study')
    } catch (err) {
      console.error(err); setError('保存今日学习计划失败，请检查浏览器存储权限。')
    } finally { setStarting(false) }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-12">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[10px] tracking-[2px] text-[#9A9D95]">VOCABULARY CENTER</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">词汇学习</h1><p className="mt-2 text-sm text-[#858B82]">先制定每日目标，再进入独立学习界面记忆单词。</p></div>
        <div className="flex items-center gap-2 rounded-xl bg-[#EAF0E8] px-4 py-3 text-sm text-[#66836D]"><BookOpen size={18}/> 共 {words.length.toLocaleString()} 个词汇</div>
      </section>
      {error && <div role="alert" className="rounded-xl bg-[#F9EDEA] p-3 text-sm text-[#A5685E]">{error}</div>}
      {loading && <p className="text-sm text-[#92978E]">正在加载词库...</p>}

      <section className="rounded-2xl border border-[#ECEDE7] bg-white p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] tracking-[2px] text-[#9A9D95]">DAILY GOAL</p><h2 className="mt-1 text-lg font-semibold">我的每日学习计划</h2></div><span className="rounded-lg bg-[#F1F3ED] px-3 py-1.5 text-xs text-[#71836F]">今日已完成 {todayCompleted} 个</span></div>
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-4">
            <div><label htmlFor="daily-level" className="mb-2 block text-xs text-[#858B82]">学习等级</label><select id="daily-level" value={level} onChange={e => setLevel(e.target.value as (typeof levels)[number])} className="w-full rounded-xl border border-[#ECEDE7] bg-white px-3 py-3 text-sm md:max-w-xs">{levels.map(item => <option key={item} value={item}>{item === '全部' ? '全部等级' : item}</option>)}</select></div>
            <div><label htmlFor="daily-count" className="mb-2 block text-xs text-[#858B82]">每天学习多少个单词？（1～200）</label><div className="flex max-w-xs items-center gap-2"><button type="button" aria-label="减少每日单词数" onClick={() => setTargetCount(value => Math.max(1, value - 1))} className="rounded-xl border p-3"><Minus size={16}/></button><input id="daily-count" type="number" min={1} max={200} value={targetCount} onChange={e => setTargetCount(Math.min(200, Math.max(1, Number(e.target.value) || 1)))} className="w-full rounded-xl border border-[#ECEDE7] px-3 py-3 text-center text-lg font-semibold"/><button type="button" aria-label="增加每日单词数" onClick={() => setTargetCount(value => Math.min(200, value + 1))} className="rounded-xl border p-3"><Plus size={16}/></button></div></div>
            <p className="text-xs text-[#A0A39B]">当前筛选等级共有 {todayCount} 个词汇；优先安排尚未掌握的单词。</p>
          </div>
          <button onClick={() => void startLearning()} disabled={loading || starting || !words.length} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#66836D] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#56745D] disabled:opacity-50"><Play size={17} fill="currentColor"/>{starting ? '正在准备...' : '去学习'}</button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">词汇列表</h2><p className="mt-1 text-xs text-[#A0A39B]">首页负责浏览、搜索和筛选；记忆卡片在独立学习页面。</p></div><div className="inline-flex rounded-xl border border-[#ECEDE7] bg-white p-1"><button onClick={() => changeMode('browse')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${mode === 'browse' ? 'bg-[#EAF0E8] text-[#526D57]' : 'text-[#858B82]'}`}><Eye size={14}/>浏览模式</button><button onClick={() => changeMode('study')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${mode === 'study' ? 'bg-[#EAF0E8] text-[#526D57]' : 'text-[#858B82]'}`}><GraduationCap size={14}/>学习模式</button></div></div>
        <div className="flex flex-wrap gap-2">{levels.map(item => <button key={item} onClick={() => setLevel(item)} className={`rounded-xl px-4 py-2.5 text-xs ${level === item ? 'bg-[#66836D] text-white' : 'border border-[#ECEDE7] bg-white text-[#858B82]'}`}>{item}</button>)}<button onClick={() => setOnlyFavorites(value => !value)} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-xs ${onlyFavorites ? 'bg-[#F3EDE3] text-[#98794E]' : 'border border-[#ECEDE7] bg-white text-[#858B82]'}`}><Star size={13}/>只看收藏</button></div>
        <div className="flex items-center gap-3 rounded-xl border border-[#ECEDE7] bg-white px-4 py-3"><Search size={18} className="shrink-0 text-[#A0A39B]"/><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索日语、假名、罗马音或释义..." className="w-full bg-transparent text-sm outline-none"/>{keyword && <button onClick={() => setKeyword('')} className="text-xs text-[#92978E]">清除</button>}</div>
        <div className="overflow-hidden rounded-2xl border border-[#ECEDE7] bg-white">
          <div className="flex items-center justify-between border-b border-[#F0F0EB] px-4 py-3 text-xs text-[#92978E]">
            <span>共 {filtered.length.toLocaleString()} 个单词</span>
            <span>{mode === 'browse' ? '浏览模式 · 显示释义' : '学习模式 · 点击单词查看/隐藏释义'}</span>
          </div>
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#92978E]">没有找到符合条件的单词。</p>
          ) : (
            <div className="divide-y divide-[#F0F0EB]">
              {filtered.map(word => {
                const revealed = mode === 'browse' || revealedWordIds.includes(word.id)
                const contents = (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{word.japanese}</span>
                        <span className="text-xs text-[#899487]">{word.kana}</span>
                        {word.romaji && <span className="text-[11px] text-[#A0A39B]">{word.romaji}</span>}
                        {favorites.includes(word.id) && <Star size={13} className="fill-[#B69A65] text-[#B69A65]"/>}
                        {mastered.includes(word.id) && <CheckCircle2 size={14} className="text-[#66836D]"/>}
                      </div>
                      {revealed ? (
                        <>
                          <p className="mt-1 text-xs text-[#858B82]">{word.meaning}</p>
                          {word.pitchAccent !== undefined && word.pitchAccent !== null && <p className="mt-1 text-[11px] text-[#899487]">音调：{word.pitchAccent} · {word.pitchPattern || '音调类型待补充'}</p>}
                        </>
                      ) : <p className="mt-1 text-xs text-[#A0A39B]">点击查看释义</p>}
                    </div>
                    <span className="shrink-0 rounded-md bg-[#F1F3ED] px-2 py-1 text-[10px] text-[#789079]">{word.level}</span>
                  </>
                )
                return mode === 'study' ? (
                  <button
                    key={word.id}
                    type="button"
                    aria-expanded={revealed}
                    aria-label={`${word.japanese}，${revealed ? '点击隐藏释义' : '点击显示释义'}`}
                    onClick={() => toggleReveal(word.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#F8FAF6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#66836D]"
                  >
                    {contents}
                  </button>
                ) : (
                  <div key={word.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    {contents}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
