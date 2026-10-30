import { useState } from 'react'
import { Volume2 } from 'lucide-react'
import { levels, listenings, type Level } from '../services/studyContent'
import { updateStudyProgress } from '../services/studyProgressService'

export default function ListeningPage() {
  const [level, setLevel] = useState<Level>('N5')
  const [index, setIndex] = useState(0)
  const [showOriginal, setShowOriginal] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const items = listenings.filter(item => item.level === level)
  const item = items[index]

  function reset() { setIndex(0); setShowOriginal(false); setSelected(null); setMessage('') }
  function speak() {
    if (!item) return
    if (!('speechSynthesis' in window)) { setMessage('当前浏览器不支持朗读，请使用原文阅读。'); return }
    const utterance = new SpeechSynthesisUtterance(item.script_ja)
    utterance.lang = 'ja-JP'
    utterance.onerror = () => setMessage('浏览器语音引擎播放失败。你仍然可以查看原文并完成理解练习。')
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }
  async function answer(n: number) {
    if (!item || selected !== null) return
    setSelected(n)
    try { await updateStudyProgress('listening', item.id, {}, n === item.answer_index) }
    catch { setMessage('答题记录未能保存') }
  }
  function changeItem(direction: -1 | 1) { setIndex(value => value + direction); setSelected(null); setShowOriginal(false); setMessage('') }

  return (
    <main className="mx-auto max-w-4xl space-y-5 pb-12">
      <div><h1 className="text-3xl font-bold">听力训练</h1><p className="mt-2 text-sm text-[#858B82]">先听内容，再回答问题；需要时展开原文核对。</p></div>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">目前提供听力脚本与理解题，尚无授权录音文件。喇叭按钮调用浏览器朗读，若系统语音不可用，可直接查看原文。</p>
      <select aria-label="听力等级" value={level} onChange={event => { setLevel(event.target.value as Level); reset() }} className="rounded border p-2">{levels.map(value => <option key={value}>{value}</option>)}</select>
      {item ? (
        <section className="space-y-4 rounded-xl border bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#858B82]">{index + 1} / {items.length} · {item.title}</p><div className="flex items-center gap-2"><button onClick={speak} title="浏览器朗读" aria-label="朗读原文" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DDE5D9] bg-[#EEF3EC] text-[#66836D] hover:bg-[#E2EBDD]"><Volume2 size={19}/></button><button onClick={() => setShowOriginal(value => !value)} className="rounded-lg border px-3 py-2 text-sm">{showOriginal ? '隐藏原文' : '显示原文'}</button></div></div>
          {showOriginal && <div className="rounded-xl bg-[#F4F6F1] p-4 sm:p-5"><p className="mb-2 text-[10px] font-semibold tracking-[2px] text-[#8B9888]">原文</p><p className="whitespace-pre-wrap text-base leading-8 text-[#394A3D]">{item.script_ja}</p></div>}
          <h2 className="font-semibold">{item.prompt_zh}</h2>
          <div className="grid gap-2">{item.options.map((option, i) => <button disabled={selected !== null} key={i} onClick={() => void answer(i)} className={`rounded border p-3 text-left disabled:opacity-80 ${selected !== null && i === item.answer_index ? 'border-green-500 bg-green-100' : selected === i ? 'bg-red-100' : ''}`}>{String.fromCharCode(65 + i)}. {option}</button>)}</div>
          {selected !== null && <p role="status" className="text-sm">{selected === item.answer_index ? '回答正确' : '回答错误'} · {item.explanation_zh}</p>}
          {message && <p role="alert" className="text-sm text-amber-700">{message}</p>}
          <div className="flex justify-between gap-3"><button disabled={index === 0} className="rounded border px-4 py-3 text-sm disabled:opacity-40" onClick={() => changeItem(-1)}>上一题</button><button disabled={index === items.length - 1} className="rounded border px-4 py-3 text-sm disabled:opacity-40" onClick={() => changeItem(1)}>下一题</button></div>
        </section>
      ) : <p>暂无听力原文。</p>}
    </main>
  )
}
