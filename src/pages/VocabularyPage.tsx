
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../db/database'
import { getAllVocabulary, type VocabularyItem } from '../services/vocabularyService'
import {
  Search,
  Volume2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Check,
  X,
  Shuffle,
  BookOpen,
  Star,
  Layers,
  CircleHelp,
} from 'lucide-react'

const levels = ['全部', 'N5', 'N4', 'N3', 'N2', 'N1']

export default function VocabularyPage() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [words, setWords] = useState<VocabularyItem[]>([])
  const [wordsLoading, setWordsLoading] = useState(true)
  const [wordsError, setWordsError] = useState('')

  const [level, setLevel] = useState('全部')
  const [keyword, setKeyword] = useState('')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])
  const [mastered, setMastered] = useState<number[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [dbError, setDbError] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [studyMode, setStudyMode] = useState(true)

  
useEffect(() => {
    let alive = true
    async function loadWords() {
      try {
        const data = await getAllVocabulary()
        if (alive) { setWords(data); setWordsError(''); setWordsLoading(false) }
      } catch (err) {
        console.error('读取词库失败：', err)
        if (alive) { setWordsError('词库读取失败，请检查数据库'); setWordsLoading(false) }
      }
    }
    void loadWords()
    const onChange = () => { void loadWords() }
    window.addEventListener('nihongo-vocabulary-changed', onChange)
    window.addEventListener('focus', onChange)
    return () => {
      alive = false
      window.removeEventListener('nihongo-vocabulary-changed', onChange)
      window.removeEventListener('focus', onChange)
    }
  }, [])

  useEffect(() => {
    let active = true
  
    async function loadProgress() {
      try {
        const records = await db.vocabularyProgress.toArray()
  
        if (!active) return
  
        setFavorites(
          records.filter(item => item.favorite).map(item => item.wordId)
        )
  
        setMastered(
          records.filter(item => item.mastered).map(item => item.wordId)
        )
  
        setDataLoaded(true)
      } catch (error) {
        console.error('读取学习记录失败：', error)
  
        if (active) {
          setDbError('无法读取本地学习记录，请检查浏览器存储权限。')
        }
      }
    }
  
    loadProgress()
  
    return () => {
      active = false
    }
  }, [])
  

  const filteredWords = useMemo(() => {
    return words.filter(word => {
      const matchesLevel = level === '全部' || word.level === level
      const matchesKeyword =
        word.japanese.includes(keyword.trim()) ||
        word.kana.includes(keyword.trim()) ||
        word.meaning.includes(keyword.trim())

      const matchesFavorite = !showFavorites || favorites.includes(word.id)

      return matchesLevel && matchesKeyword && matchesFavorite
    })
  }, [level, keyword, showFavorites, favorites])

  const safeIndex = index >= filteredWords.length ? 0 : index
  const currentWord = filteredWords[safeIndex]

  const masteredCount = mastered.length
  const progress = Math.round(masteredCount / words.length * 100)

  const changeLevel = (value: string) => {
    setLevel(value)
    setIndex(0)
    setFlipped(false)
  }

  const nextWord = () => {
    if (!filteredWords.length) return
    setIndex(current => (current + 1) % filteredWords.length)
    setFlipped(false)
  }

  const previousWord = () => {
    if (!filteredWords.length) return
    setIndex(current => (current - 1 + filteredWords.length) % filteredWords.length)
    setFlipped(false)
  }

  
const toggleFavorite = async (id: number) => {
    if (!dataLoaded || dbError) return
  
    try {
      const newFavorite = !favorites.includes(id)
  
      await db.transaction('rw', db.vocabularyProgress, async () => {
        const previous = await db.vocabularyProgress.get(id)
  
        await db.vocabularyProgress.put({
          wordId: id,
          favorite: newFavorite,
          mastered: previous?.mastered ?? false,
          updatedAt: Date.now(),
        })
      })
  
      setFavorites(current =>
        newFavorite
          ? [...new Set([...current, id])]
          : current.filter(item => item !== id)
      )
    } catch (error) {
      console.error('保存收藏状态失败：', error)
      setDbError('保存收藏状态失败，请检查浏览器存储权限。')
    }
  }
  

  
const toggleMastered = async (id: number) => {
    if (!dataLoaded || dbError) return
  
    try {
      const newMastered = !mastered.includes(id)
  
      await db.transaction('rw', db.vocabularyProgress, async () => {
        const previous = await db.vocabularyProgress.get(id)
  
        await db.vocabularyProgress.put({
          wordId: id,
          mastered: newMastered,
          favorite: previous?.favorite ?? false,
          updatedAt: Date.now(),
        })
      })
  
      setMastered(current =>
        newMastered
          ? [...new Set([...current, id])]
          : current.filter(item => item !== id)
      )
    } catch (error) {
      console.error('保存掌握状态失败：', error)
      setDbError('保存掌握状态失败，请检查浏览器存储权限。')
    }
  }
  

  
const playAudio = async (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('当前浏览器不支持语音播放，请使用最新版 Chrome。')
      return
    }
  
    const synth = window.speechSynthesis
  
    // 获取浏览器语音列表
    let voices = synth.getVoices()
  
    // 某些浏览器需要等待语音列表加载
    if (voices.length === 0) {
      voices = await new Promise<SpeechSynthesisVoice[]>(resolve => {
        const timer = window.setTimeout(() => {
          resolve(synth.getVoices())
        }, 2000)
  
        synth.addEventListener(
          'voiceschanged',
          () => {
            window.clearTimeout(timer)
            resolve(synth.getVoices())
          },
          { once: true }
        )
      })
    }
  
    // 查找日语语音
    const japaneseVoice = voices.find(
      voice => voice.lang.toLowerCase() === 'ja-jp'
    ) || voices.find(
      voice => voice.lang.toLowerCase().startsWith('ja')
    )
  
    if (!japaneseVoice) {
      console.warn('当前浏览器没有可用的日语语音。', voices)
  
      alert(
        '没有找到日语语音包！\n\n请检查 Windows 的日语语音设置，安装日语语音后再试。'
      )
      return
    }
  
    // 停止之前的播放
    synth.cancel()
  
    const utterance = new SpeechSynthesisUtterance(text)
  
    utterance.voice = japaneseVoice
    utterance.lang = japaneseVoice.lang
    utterance.rate = 0.85
    utterance.pitch = 1
    utterance.volume = 1
  
    utterance.onerror = event => {
      console.error('日语语音播放失败：', event.error)
    }
  
    synth.speak(utterance)
  }
  

  return (
    <div className="mx-auto max-w-[1200px] space-y-7">

        
{!dataLoaded && !dbError && (
  <div className="rounded-xl bg-[#EAF0E8] px-4 py-3 text-sm text-[#66836D]">
    正在读取本地学习记录，请稍候...
  </div>
)}

{dbError && (
  <div
    role="alert"
    className="rounded-xl bg-[#F9EDEA] px-4 py-3 text-sm text-[#A5685E]"
  >
    {dbError}
  </div>
)}


      {wordsLoading && <p className="text-sm text-[#92978E]">正在加载词库...</p>}
      {wordsError && <p role="alert" className="text-sm text-red-600">{wordsError}</p>}
      {/* 标题区域 */}
      <section>
        <p className="mb-2 text-[10px] tracking-[2px] text-[#9A9D95]">
          VOCABULARY LEARNING
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              词汇学习
            </h1>
            <p className="mt-2 text-sm text-[#858B82]">
              每天积累新单词，让日语表达更加自然。
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-[#EAF0E8] px-4 py-3 text-[#66836D]">
            <BookOpen size={18} />
            <span className="text-xs font-medium">JLPT N5 — N1</span>
          </div>
        </div>
      </section>

      {/* 统计卡片 */}
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#ECEDE7] bg-white p-4 sm:p-5">
          <Layers size={19} className="mb-3 text-[#819781]" />
          <p className="text-xl font-semibold">{words.length}</p>
          <p className="mt-1 text-[10px] text-[#92978E] sm:text-xs">当前词汇</p>
        </div>

        <div className="rounded-2xl border border-[#ECEDE7] bg-white p-4 sm:p-5">
          <Check size={19} className="mb-3 text-[#819781]" />
          <p className="text-xl font-semibold">{masteredCount}</p>
          <p className="mt-1 text-[10px] text-[#92978E] sm:text-xs">已掌握</p>
        </div>

        <div className="rounded-2xl border border-[#ECEDE7] bg-white p-4 sm:p-5">
          <Star size={19} className="mb-3 text-[#B69A65]" />
          <p className="text-xl font-semibold">{favorites.length}</p>
          <p className="mt-1 text-[10px] text-[#92978E] sm:text-xs">我的收藏</p>
        </div>
      </section>

      {/* 学习进度 */}
      <section className="rounded-2xl border border-[#ECEDE7] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">整体掌握进度</span>
          <span className="text-sm font-semibold text-[#66836D]">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#EEF0EA]">
          <div
            className="h-full rounded-full bg-[#819A7D] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-[#A0A39B]">
          已掌握 {masteredCount} / {words.length} 个单词
        </p>
      </section>

      {/* 筛选区域 */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">选择学习等级</h2>
            <p className="mt-1 text-xs text-[#A0A39B]">根据 JLPT 等级筛选单词</p>
          </div>
          <button
            onClick={() => {
              setShowFavorites(!showFavorites)
              setIndex(0)
              setFlipped(false)
            }}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
              showFavorites
                ? 'bg-[#F3EDE3] text-[#98794E]'
                : 'border border-[#ECEDE7] bg-white text-[#858B82]'
            }`}
          >
            <Bookmark size={15} />
            只看收藏
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {levels.map(item => (
            <button
              key={item}
              onClick={() => changeLevel(item)}
              className={`rounded-xl px-5 py-2.5 text-xs font-medium transition ${
                level === item
                  ? 'bg-[#66836D] text-white'
                  : 'border border-[#ECEDE7] bg-white text-[#858B82] hover:bg-[#F3F5EF]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#ECEDE7] bg-white px-4 py-3">
          <Search size={18} className="shrink-0 text-[#A0A39B]" />
          <input
            value={keyword}
            onChange={event => {
              setKeyword(event.target.value)
              setIndex(0)
              setFlipped(false)
            }}
            placeholder="搜索日语单词、假名或中文释义..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#B0B3AB]"
          />
          {keyword && (
            <button onClick={() => setKeyword('')} className="text-[#A0A39B]">
              <X size={17} />
            </button>
          )}
        </div>
      </section>

      {/* 学习模式 */}
      <section
        ref={cardRef}
        id="vocabulary-card"
        className="rounded-[24px] border border-[#ECEDE7] bg-white p-5 sm:p-8 scroll-mt-24"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] tracking-[2px] text-[#A0A39B]">
              FLASHCARD STUDY
            </p>
            <h2 className="text-lg font-semibold">单词记忆卡片</h2>
          </div>
          <button
            onClick={() => setStudyMode(!studyMode)}
            className="flex items-center gap-2 rounded-xl bg-[#F4F5F0] px-3 py-2 text-xs text-[#71836F]"
          >
            <Shuffle size={15} />
            {studyMode ? '学习模式' : '浏览模式'}
          </button>
        </div>

        {currentWord ? (
          <>
            <div
              onClick={() => setFlipped(!flipped)}
              className="group relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] bg-[#F4F6F1] px-5 py-8 text-center transition hover:bg-[#EEF2EA] sm:min-h-[370px]"
            >
              <div className="absolute right-5 top-5">
                <span className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-medium text-[#81917D]">
                  {currentWord.level}
                </span>
              </div>

              {!flipped ? (
                <>
                  <p className="mb-6 text-[10px] tracking-[3px] text-[#A0A99A]">
                    JAPANESE WORD
                  </p>
                  <h3 className="text-5xl font-semibold tracking-widest text-[#394A3D] sm:text-6xl">
                    {currentWord.japanese}
                  </h3>
                  <p className="mt-5 text-lg tracking-[3px] text-[#81917D]">
                    {currentWord.kana}
                  </p>
                  <button
                    onClick={event => {
                      event.stopPropagation()
                      playAudio(currentWord.kana)
                    }}
                    className="mt-7 flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs text-[#66836D] shadow-sm transition hover:shadow"
                  >
                    <Volume2 size={17} />
                    播放发音
                  </button>
                  <p className="absolute bottom-5 text-[10px] text-[#A0A99B]">
                    点击卡片查看中文释义
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-5 text-[10px] tracking-[3px] text-[#A0A99A]">
                    MEANING & EXAMPLE
                  </p>
                  <h3 className="text-3xl font-semibold text-[#526D57]">
                    {currentWord.meaning}
                  </h3>
                  <p className="mt-3 text-sm text-[#899487]">
                    {currentWord.type}
                  </p>
                  <div className="mt-7 max-w-lg rounded-xl bg-white p-5">
                    <p className="text-base font-medium text-[#46574A]">
                      {currentWord.example}
                    </p>
                    <p className="mt-3 text-xs text-[#92978E]">
                      {currentWord.exampleMeaning}
                    </p>
                  </div>
                  <p className="absolute bottom-5 text-[10px] text-[#A0A99B]">
                    点击卡片返回单词正面
                  </p>
                </>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={previousWord}
                disabled={filteredWords.length <= 1}
                className="flex items-center gap-1 rounded-xl border border-[#ECEDE7] px-3 py-3 text-xs text-[#858B82] hover:bg-[#F5F6F2] disabled:opacity-30"
              >
                <ChevronLeft size={17} />
                <span className="hidden sm:inline">上一个</span>
              </button>

              <span className="text-xs text-[#92978E]">
                {safeIndex + 1} / {filteredWords.length}
              </span>

              <button
                onClick={nextWord}
                disabled={filteredWords.length <= 1}
                className="flex items-center gap-1 rounded-xl border border-[#ECEDE7] px-3 py-3 text-xs text-[#858B82] hover:bg-[#F5F6F2] disabled:opacity-30"
              >
                <span className="hidden sm:inline">下一个</span>
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => toggleMastered(currentWord.id)}
                disabled={!dataLoaded || Boolean(dbError)}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-medium transition ${
                  mastered.includes(currentWord.id)
                    ? 'bg-[#66836D] text-white'
                    : 'border border-[#DCE5D9] bg-[#F0F4EE] text-[#66836D]'
                }`}
              >
                <Check size={16} />
                {mastered.includes(currentWord.id) ? '已掌握 · 点击撤销' : '标记为已掌握'}
              </button>

              <button
                onClick={() => toggleFavorite(currentWord.id)}
                disabled={!dataLoaded || Boolean(dbError)}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-medium transition ${
                  favorites.includes(currentWord.id)
                    ? 'bg-[#F3EDE3] text-[#98794E]'
                    : 'border border-[#ECEDE7] bg-white text-[#858B82]'
                }`}
              >
                <Bookmark size={16} />
                {favorites.includes(currentWord.id) ? '已收藏' : '加入收藏'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <CircleHelp size={36} className="mb-4 text-[#B3B9AE]" />
            <p className="font-medium">没有找到符合条件的单词</p>
            <p className="mt-2 text-xs text-[#A0A39B]">
              请尝试其他等级或关键词
            </p>
            <button
              onClick={() => {
                setLevel('全部')
                setKeyword('')
                setShowFavorites(false)
                setIndex(0)
              }}
              className="mt-5 rounded-xl bg-[#66836D] px-5 py-3 text-xs text-white"
            >
              清除筛选
            </button>
          </div>
        )}
      </section>

      {/* 单词列表 */}
      <section className="rounded-2xl border border-[#ECEDE7] bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">当前单词列表</h2>
            <p className="mt-1 text-xs text-[#A0A39B]">
              共 {filteredWords.length} 个单词
            </p>
          </div>
          <BookOpen size={20} className="text-[#819781]" />
        </div>

        <div className="divide-y divide-[#F0F0EB]">
          {filteredWords.map(word => (
            <button
              key={word.id}
              onClick={() => {
                setIndex(filteredWords.findIndex(item => item.id === word.id))
                setFlipped(false)
                setStudyMode(true)
              
                requestAnimationFrame(() => {
                  cardRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                })
              }}
              className="flex w-full items-center justify-between gap-3 py-4 text-left hover:bg-[#FAFAF7]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{word.japanese}</span>
                  <span className="text-xs text-[#899487]">{word.kana}</span>
                  {favorites.includes(word.id) && (
                    <Star size={13} className="fill-[#B69A65] text-[#B69A65]" />
                  )}
                </div>
                <p className="mt-1 text-xs text-[#92978E]">{word.meaning}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-md bg-[#F1F3ED] px-2 py-1 text-[10px] text-[#789079]">
                  {word.level}
                </span>
                {mastered.includes(word.id) && (
                  <Check size={16} className="text-[#66836D]" />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl bg-[#F3F5EF] p-4">
        <RotateCw size={17} className="mt-0.5 shrink-0 text-[#789079]" />
        <p className="text-xs leading-6 text-[#858B82]">
          词汇来自初始 JSON 与个人 IndexedDB 词库；收藏和掌握记录保存在当前浏览器。
          可前往词库管理中心添加、编辑和导入。语音功能暂缓修复。
        </p>
      </div>
    </div>
  )
}
