
import fs from 'node:fs'
import path from 'node:path'

const filePath = path.resolve('src/data/vocabulary.json')

const errors = []
const allowedLevels = ['N5', 'N4', 'N3', 'N2', 'N1']

const requiredFields = [
  'id',
  'japanese',
  'kana',
  'meaning',
  'example',
  'exampleMeaning',
  'level',
  'type',
]

if (!fs.existsSync(filePath)) {
  console.error('❌ 找不到词库文件：', filePath)
  process.exit(1)
}

let words

try {
  words = JSON.parse(fs.readFileSync(filePath, 'utf8'))
} catch (error) {
  console.error('❌ JSON 格式错误：', error.message)
  process.exit(1)
}

if (!Array.isArray(words)) {
  console.error('❌ 词库必须是 JSON 数组')
  process.exit(1)
}

const ids = new Set()
const wordKeys = new Set()

const levelCounts = {
  N5: 0,
  N4: 0,
  N3: 0,
  N2: 0,
  N1: 0,
}

words.forEach((word, index) => {
  const position = `第 ${index + 1} 条词汇`

  if (!word || typeof word !== 'object' || Array.isArray(word)) {
    errors.push(`${position}：必须是对象`)
    return
  }

  for (const field of requiredFields) {
    if (!(field in word)) {
      errors.push(`${position}：缺少字段 ${field}`)
    }
  }

  if (!Number.isInteger(word.id) || word.id <= 0) {
    errors.push(`${position}：ID 必须是正整数`)
  } else if (ids.has(word.id)) {
    errors.push(`${position}：重复 ID ${word.id}`)
  } else {
    ids.add(word.id)
  }

  for (const field of requiredFields.filter(field => field !== 'id')) {
    if (typeof word[field] !== 'string' || !word[field].trim()) {
      errors.push(`${position}：${field} 必须是非空字符串`)
    }
  }

  if (typeof word.level === 'string') {
    if (!allowedLevels.includes(word.level)) {
      errors.push(`${position}：无效 JLPT 等级 ${word.level}`)
    } else {
      levelCounts[word.level]++
    }
  }

  if (
    typeof word.japanese === 'string' &&
    typeof word.kana === 'string'
  ) {
    const key = `${word.japanese.trim()}|${word.kana.trim()}`

    if (wordKeys.has(key)) {
      errors.push(`${position}：重复词条 ${key}`)
    }

    wordKeys.add(key)
  }
})

console.log('\n===== Nihongo Lab JSON 词库检查 =====\n')
console.log(`检查到 ${words.length} 条词汇\n`)

for (const [level, count] of Object.entries(levelCounts)) {
  console.log(`${level}: ${count} 条`)
}

if (errors.length > 0) {
  console.error('\n发现以下问题：')

  errors.forEach(error => console.error(`❌ ${error}`))

  process.exit(1)
}

console.log('\n✅ JSON 词库检查通过！')
