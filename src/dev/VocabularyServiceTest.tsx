
import { useEffect, useState } from 'react'
import {
  getAllVocabulary,
  addVocabulary,
  updateVocabulary,
  deleteVocabulary,
  type VocabularyItem,
} from '../services/vocabularyService'

export default function VocabularyServiceTest() {
  const [words, setWords] = useState<VocabularyItem[]>([])
  const [message, setMessage] = useState('正在读取词库...')
  const [loading, setLoading] = useState(false)

  async function refreshWords() {
    try {
      const result = await getAllVocabulary()
      setWords(result)
      setMessage(`成功读取 ${result.length} 条词汇`)
    } catch (error) {
      console.error(error)
      setMessage('读取失败，请查看控制台')
    }
  }

  useEffect(() => {
    refreshWords()
  }, [])

  async function testAdd() {
    setLoading(true)

    try {
      const id = await addVocabulary({
        japanese: '図書館',
        kana: 'としょかん',
        meaning: '图书馆',
        example: '図書館で本を読みます。',
        exampleMeaning: '在图书馆读书。',
        level: 'N5',
        type: '名词',
      })

      setMessage(`新增成功，ID：${id}`)
      await refreshWords()
    } catch (error) {
      console.error(error)
      setMessage('新增失败')
    } finally {
      setLoading(false)
    }
  }

  async function testUpdate() {
    const testWord = words.find(
      word => word.japanese === '図書館'
    )

    if (!testWord) {
      setMessage('请先新增测试词汇')
      return
    }

    setLoading(true)

    try {
      await updateVocabulary(testWord.id, {
        japanese: '図書館',
        kana: 'としょかん',
        meaning: '图书馆（已修改）',
        example: '図書館で本を読みます。',
        exampleMeaning: '在图书馆读书。',
        level: 'N5',
        type: '名词',
      })

      setMessage('修改成功')
      await refreshWords()
    } catch (error) {
      console.error(error)
      setMessage('修改失败')
    } finally {
      setLoading(false)
    }
  }

  async function testDelete() {
    const testWord = words.find(
      word => word.japanese === '図書館'
    )

    if (!testWord) {
      setMessage('没有找到测试词汇')
      return
    }

    if (!window.confirm('确定删除测试词汇「図書館」吗？')) {
      return
    }

    setLoading(true)

    try {
      await deleteVocabulary(testWord.id)
      setMessage('删除成功')
      await refreshWords()
    } catch (error) {
      console.error(error)
      setMessage('删除失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5">
      <div>
        <p className="text-xs tracking-widest text-[#819781]">
          DEVELOPMENT TEST
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          词库服务测试
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          测试初始词库与个人词库的读取、新增、修改和删除。
        </p>
      </div>

      <div className="rounded-xl bg-[#F0F4EE] p-4 text-sm text-[#66836D]">
        {message}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={loading}
          onClick={refreshWords}
          className="rounded-xl border px-4 py-2 text-sm"
        >
          刷新词库
        </button>

        <button
          disabled={loading}
          onClick={testAdd}
          className="rounded-xl bg-[#66836D] px-4 py-2 text-sm text-white"
        >
          新增测试词汇
        </button>

        <button
          disabled={loading}
          onClick={testUpdate}
          className="rounded-xl bg-[#EAEFE6] px-4 py-2 text-sm text-[#66836D]"
        >
          修改测试词汇
        </button>

        <button
          disabled={loading}
          onClick={testDelete}
          className="rounded-xl bg-[#F5ECE9] px-4 py-2 text-sm text-[#A5685E]"
        >
          删除测试词汇
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#ECEDE7]">
        <div className="border-b bg-[#F7F8F4] p-4 text-sm font-medium">
          当前词库 · {words.length} 条
        </div>

        {words.slice(0, 30).map(word => (
          <div
            key={word.id}
            className="flex items-center justify-between gap-3 border-b p-4 last:border-0"
          >
            <div>
              <p className="font-medium">{word.japanese}</p>
              <p className="mt-1 text-xs text-gray-500">
                {word.kana} · {word.meaning}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="rounded bg-[#F0F4EE] px-2 py-1 text-xs">
                {word.level}
              </span>
              <span className="text-[10px] text-gray-400">
                {word.source === 'initial' ? '初始词库' : '个人词库'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
