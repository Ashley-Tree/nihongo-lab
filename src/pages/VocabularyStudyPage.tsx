import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Bookmark } from 'lucide-react'
import { db } from '../db/database'
import { getAllVocabulary, type VocabularyItem } from '../services/vocabularyService'
import { getTodayVocabularyPlan, markDailyWordCompleted } from '../services/vocabularyPlanService'

type Rating = 'again' | 'hard' | 'good' | 'mastered'

export default function VocabularyStudyPage() {
  const navigate = useNavigate()
  const [words, setWords] = useState<VocabularyItem[]>([])
  const [wordIds, setWordIds] = useState<number[]>([])
  const [completedIds, setCompletedIds] = useState<number[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [favorites, setFavorites] = useState<number[]>([])
  const touchStartX = useRef<number | null>(null)
  const suppressClick = useRef(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [all, plan, progress] = await Promise.all([getAllVocabulary(), getTodayVocabularyPlan(), db.vocabularyProgress.toArray()])
        if (!active) return
        if (!plan || !plan.wordIds.length) { navigate('/vocabulary', { replace: true }); return }
        const ids = plan.wordIds.filter(id => all.some(word => word.id === id))
        setWords(all); setWordIds(ids); setCompletedIds(plan.completedIds)
        setFavorites(progress.filter(item => item.favorite).map(item => item.wordId))
        const next = ids.findIndex(id => !plan.completedIds.includes(id))
        setIndex(next >= 0 ? next : Math.max(0, ids.length - 1))
      } catch (err) { console.error(err); setError('读取今日学习计划失败，请返回词汇首页重新开始。') }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [navigate])

  const currentWord = useMemo(() => words.find(word => word.id === wordIds[index]), [wordIds, index, words])
  const doneCount = completedIds.filter(id => wordIds.includes(id)).length
  const finished = wordIds.length > 0 && doneCount >= wordIds.length
  const move = useCallback((direction: -1 | 1) => {
    if (!wordIds.length) return
    setIndex(current => Math.min(wordIds.length - 1, Math.max(0, current + direction)))
    setFlipped(false)
  }, [wordIds.length])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [move])

  async function rate(rating: Rating) {
    if (!currentWord) return
    const id = currentWord.id
    try {
      const old = await db.vocabularyProgress.get(id)
      await db.vocabularyProgress.put({ wordId: id, favorite: old?.favorite ?? false, mastered: rating === 'mastered' ? true : old?.mastered ?? false, updatedAt: Date.now() })
      const updatedPlan = await markDailyWordCompleted(id)
      if (updatedPlan) setCompletedIds(updatedPlan.completedIds)
      if (index < wordIds.length - 1) { setIndex(value => value + 1); setFlipped(false) }
    } catch (err) { console.error(err); setError('保存本次学习结果失败，请检查浏览器存储空间。') }
  }

  async function toggleFavorite() {
    if (!currentWord) return
    const id = currentWord.id
    try {
      const favorite = !favorites.includes(id)
      const old = await db.vocabularyProgress.get(id)
      await db.vocabularyProgress.put({ wordId: id, favorite, mastered: old?.mastered ?? false, updatedAt: Date.now() })
      setFavorites(items => favorite ? [...items, id] : items.filter(item => item !== id))
    } catch (err) { console.error(err); setError('收藏状态保存失败。') }
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) { touchStartX.current = event.changedTouches[0]?.clientX ?? null }
  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 55) return
    suppressClick.current = true
    window.setTimeout(() => { suppressClick.current = false }, 250)
    move(delta < 0 ? 1 : -1)
  }

  if (loading) return <div className="rounded-2xl bg-white p-8 text-sm text-[#858B82]">正在准备今日学习...</div>

  return (
    <main className="mx-auto max-w-3xl space-y-3 pb-4">
      <div className="flex items-center justify-between gap-3">
        <Link to="/vocabulary" className="inline-flex items-center gap-2 text-sm text-[#71836F]"><ArrowLeft size={16}/>返回词汇首页</Link>
        <span className="rounded-lg bg-[#EAF0E8] px-3 py-1 text-xs text-[#66836D]">今日学习</span>
      </div>
      {error && <p role="alert" className="rounded-xl bg-[#F9EDEA] p-3 text-sm text-[#A5685E]">{error}</p>}
      <section className="rounded-xl border border-[#ECEDE7] bg-white px-4 py-2.5">
        <div className="flex items-center justify-between text-xs text-[#858B82]"><span>今日进度</span><span>{doneCount} / {wordIds.length}</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EEF0EA]"><div className="h-full rounded-full bg-[#819A7D] transition-all" style={{ width: `${wordIds.length ? doneCount / wordIds.length * 100 : 0}%` }}/></div>
      </section>
      {finished ? (
        <section className="rounded-3xl border border-[#ECEDE7] bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF0E8] text-[#66836D]"><Check size={28}/></div>
          <h1 className="text-2xl font-semibold">今日目标完成！</h1>
          <p className="mt-2 text-sm text-[#858B82]">今天安排的 {wordIds.length} 个单词已经学习完成。</p>
          <button onClick={() => navigate('/vocabulary')} className="mt-5 rounded-xl bg-[#66836D] px-6 py-3 text-sm text-white">返回词汇首页</button>
        </section>
      ) : currentWord ? (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-[#92978E]">
            <span>{currentWord.level} · 第 {index + 1} / {wordIds.length} 个</span>
            <span>{completedIds.includes(currentWord.id) ? '已完成，可再次复习' : '尚未完成'}</span>
          </div>
          <div className="overflow-hidden rounded-[24px] border border-[#ECEDE7] bg-white shadow-sm">
            <div
              role="button"
              tabIndex={0}
              aria-label="记忆卡片，点击翻转查看释义；左右滑动切换单词"
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setFlipped(value => !value) } }}
              onClick={() => { if (!suppressClick.current) setFlipped(value => !value) }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="relative flex min-h-[220px] max-h-[48vh] cursor-pointer select-none flex-col items-center justify-center overflow-y-auto px-5 py-5 text-center sm:min-h-[260px]"
              style={{ touchAction: 'pan-y' }}
            >
              <span className="absolute right-4 top-3 rounded-md bg-[#F1F3ED] px-2 py-1 text-[10px] text-[#789079]">{currentWord.level}</span>
              {!flipped ? (
                <>
                  <p className="mb-3 text-[10px] tracking-[2px] text-[#A0A99A]">JAPANESE WORD</p>
                  <h1 className="break-all text-4xl font-semibold tracking-wide text-[#394A3D] sm:text-5xl">{currentWord.japanese}</h1>
                  <p className="mt-3 text-lg tracking-wider text-[#81917D]">{currentWord.kana}</p>
                  {currentWord.romaji && <p className="mt-1 text-xs text-[#A0A39B]">{currentWord.romaji}</p>}
                  {currentWord.pitchAccent !== undefined && currentWord.pitchAccent !== null && <p className="mt-2 text-xs text-[#71836F]">音调 {currentWord.pitchAccent}{currentWord.pitchPattern ? ` · ${currentWord.pitchPattern}` : ''}</p>}
                  <p className="mt-3 text-[11px] text-[#A0A39B]">点击卡片查看释义 · 左右滑动切换单词</p>
                </>
              ) : (
                <>
                  <p className="mb-2 text-[10px] tracking-[2px] text-[#A0A99A]">MEANING & EXAMPLE</p>
                  <h2 className="max-w-xl text-2xl font-semibold leading-snug text-[#526D57]">{currentWord.meaning}</h2>
                  <p className="mt-1 text-xs text-[#899487]">{currentWord.type}</p>
                  {currentWord.example && <div className="mt-3 max-w-lg rounded-xl bg-[#F4F6F1] px-4 py-3"><p className="text-sm font-medium text-[#46574A]">{currentWord.example}</p>{currentWord.exampleMeaning && <p className="mt-1 text-xs text-[#92978E]">{currentWord.exampleMeaning}</p>}</div>}
                  {!!currentWord.relatedWords?.length && <div className="mt-3 w-full max-w-lg text-left" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
                    <details className="rounded-xl border border-[#E4E9E0] bg-[#F8FAF6] px-3 py-2 text-xs">
                      <summary className="cursor-pointer font-medium text-[#526D57]">相关表达（{currentWord.relatedWords.length}）</summary>
                      <div className="mt-2 max-h-32 space-y-2 overflow-y-auto">
                        {currentWord.relatedWords.map((related, i) => <div key={i} className="border-t border-[#E4E9E0] pt-2">
                          <span className="mr-2 text-[#71836F]">{related.category}</span><strong>{related.japanese}</strong>
                          {related.kana && <span className="ml-2 text-[#899487]">{related.kana}</span>}
                          <p className="mt-1 text-[#858B82]">{related.meaning}</p>
                        </div>)}
                      </div>
                    </details>
                  </div>}
                  <p className="mt-2 text-[11px] text-[#A0A39B]">点击卡片返回单词正面</p>
                </>
              )}
            </div>
            {/* 记忆评价移到单词卡片内部底部，节约垂直空间 */}
            <div className="border-t border-[#ECEDE7] bg-[#FCFDFB] px-3 pb-3 pt-2.5 sm:px-5">
              <p className="mb-2 text-center text-xs font-medium text-[#6F7D70]">你记住了吗？</p>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                <button type="button" onClick={() => void rate('again')} className="rounded-lg bg-[#F8ECE9] px-1 py-2.5 text-xs text-[#A5685E]">不认识</button>
                <button type="button" onClick={() => void rate('hard')} className="rounded-lg bg-[#F7F1E7] px-1 py-2.5 text-xs text-[#98794E]">模糊</button>
                <button type="button" onClick={() => void rate('good')} className="rounded-lg bg-[#EEF2EA] px-1 py-2.5 text-xs text-[#66836D]">认识</button>
                <button type="button" onClick={() => void rate('mastered')} className="rounded-lg bg-[#66836D] px-1 py-2.5 text-xs text-white">已掌握</button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => move(-1)} disabled={index === 0} className="inline-flex items-center gap-1 rounded-xl border border-[#ECEDE7] bg-white px-3 py-2.5 text-xs disabled:opacity-30"><ChevronLeft size={17}/>上一个</button>
            <button onClick={() => void toggleFavorite()} className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2.5 text-xs ${favorites.includes(currentWord.id) ? 'border-[#E8D9BD] bg-[#F8F2E8] text-[#98794E]' : 'border-[#ECEDE7] bg-white text-[#858B82]'}`}><Bookmark size={15} className={favorites.includes(currentWord.id) ? 'fill-current' : ''}/>{favorites.includes(currentWord.id) ? '已收藏' : '收藏'}</button>
            <button onClick={() => move(1)} disabled={index >= wordIds.length - 1} className="inline-flex items-center gap-1 rounded-xl border border-[#ECEDE7] bg-white px-3 py-2.5 text-xs disabled:opacity-30">下一个<ChevronRight size={17}/></button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-white p-8 text-center"><p className="text-sm text-[#858B82]">今日计划中没有可学习的单词。</p><button onClick={() => navigate('/vocabulary')} className="mt-4 rounded-xl bg-[#66836D] px-5 py-3 text-sm text-white">返回词汇首页</button></section>
      )}
    </main>
  )
}
