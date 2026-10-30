export type SpeechResult = { ok: boolean; message: string; voice?: string }
export type SpeechOption = { id: string; label: string; lang: string; local: boolean }

const synth = () => typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
let active: SpeechSynthesisUtterance | null = null
let sequence = 0

export function speechSupported(): boolean { return synth() !== null }
export function listJapaneseVoices(): SpeechOption[] {
  return (synth()?.getVoices() ?? [])
    .filter(v => v.lang.toLowerCase().startsWith('ja'))
    .sort((a, b) => Number(b.localService) - Number(a.localService))
    .map(v => ({ id: v.voiceURI, label: `${v.name}${v.localService ? '（本地）' : '（在线）'}`, lang: v.lang, local: v.localService }))
}
export function stopJapaneseSpeech() {
  sequence++
  synth()?.cancel()
  active = null
}
export function speakJapanese(text: string, voiceId = ''): Promise<SpeechResult> {
  const engine = synth()
  if (!engine) return Promise.resolve({ ok: false, message: '此浏览器不支持 Web Speech API。' })
  if (!text.trim()) return Promise.resolve({ ok: false, message: '没有可朗读的文本。' })
  stopJapaneseSpeech()
  const requestId = sequence
  const voices = engine.getVoices().filter(v => v.lang.toLowerCase().startsWith('ja'))
  const chosen = voices.find(v => v.voiceURI === voiceId) ?? voices.find(v => v.localService) ?? voices[0]
  // 不强制设定失效的在线 voice；无声线时让系统尝试 ja-JP 默认朗读。
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  if (chosen) utterance.voice = chosen
  utterance.rate = 0.88
  utterance.volume = 1
  active = utterance
  return new Promise(resolve => {
    let completed = false
    const finish = (result: SpeechResult) => {
      if (completed) return
      completed = true
      if (active === utterance) active = null
      resolve(result)
    }
    utterance.onend = () => finish({ ok: true, message: '播放完成', voice: chosen?.name })
    utterance.onerror = event => finish({ ok: false, message: `语音引擎失败：${event.error}。可在语音设置切换声线，优先使用已安装的本地日语声线。`, voice: chosen?.name })
    try {
      engine.speak(utterance)
      // 无法发声的环境可通过「停止」结束；不通过定时器声称播放成功。
      if (requestId !== sequence) finish({ ok: false, message: '播放已取消。' })
    } catch (error) { finish({ ok: false, message: error instanceof Error ? error.message : '语音播放失败' }) }
  })
}
export function onJapaneseVoicesChanged(callback: () => void) {
  const engine = synth()
  if (!engine) return () => undefined
  engine.addEventListener('voiceschanged', callback)
  return () => engine.removeEventListener('voiceschanged', callback)
}
