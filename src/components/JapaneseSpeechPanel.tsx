import { useEffect, useState } from 'react'
import { listJapaneseVoices, onJapaneseVoicesChanged, speakJapanese, speechSupported, stopJapaneseSpeech } from '../services/japaneseSpeech'

export default function JapaneseSpeechPanel({ text }: { text: string }) {
  const [voices, setVoices] = useState(listJapaneseVoices)
  const [voiceId, setVoiceId] = useState(() => localStorage.getItem('nihongo-voice') ?? '')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => onJapaneseVoicesChanged(() => setVoices(listJapaneseVoices())), [])
  useEffect(() => () => stopJapaneseSpeech(), [])
  async function play() {
    setBusy(true); setStatus('正在尝试朗读…')
    const result = await speakJapanese(text, voiceId)
    setBusy(false); setStatus(result.message)
  }
  return (
    <div className="space-y-2 rounded-2xl border border-[#DCE6D8] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void play()} disabled={busy || !speechSupported() || !text} className="rounded-xl bg-[#66836D] px-4 py-2 text-sm text-white disabled:opacity-50">🔊 朗读日语</button>
        <button type="button" onClick={() => { stopJapaneseSpeech(); setBusy(false); setStatus('已停止') }} className="rounded-xl border px-3 py-2 text-sm">停止</button>
        <button type="button" onClick={() => setVoices(listJapaneseVoices())} className="rounded-xl border px-3 py-2 text-sm">刷新声线</button>
      </div>
      <label className="block text-xs text-[#687B68]" htmlFor="nihongo-voice-select">日语声线（建议本地声线）</label>
      <select id="nihongo-voice-select" value={voiceId} onChange={e => { setVoiceId(e.target.value); localStorage.setItem('nihongo-voice', e.target.value) }} className="w-full rounded-lg border p-2 text-sm">
        <option value="">自动选择（优先本地）</option>
        {voices.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>
      <p className="text-xs text-[#7B857A]">检测到 {voices.length} 个日语声线。{voices.length === 0 ? '若没有日语声线，请在 Windows 语言与语音设置中安装日语语音。' : '在线声线即使能列出，也可能因浏览器或网络原因播放失败。'}</p>
      {status && <p role="status" className="text-sm text-[#526D57]">{status}</p>}
    </div>
  )
}
