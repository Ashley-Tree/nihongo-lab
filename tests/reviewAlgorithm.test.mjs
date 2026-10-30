// Node 22.16+ 支持 TypeScript type stripping: node --experimental-strip-types --test tests/reviewAlgorithm.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { scheduleReview, DAY_MS } from '../src/services/reviewAlgorithm.ts'
const now = 1_700_000_000_000
test('首次记得：1 天后', () => {
  const s = scheduleReview(null, 2, now)
  assert.equal(s.dueAt, now + DAY_MS)
  assert.equal(s.repetitions, 1)
})
test('首次简单：4 天后', () => {
  const s = scheduleReview(null, 3, now)
  assert.equal(s.intervalDays, 4)
})
test('忘记：10分钟，遗忘次数增加且重置连续次数', () => {
  const s = scheduleReview({intervalDays: 12, ease: 2.5, repetitions: 3, lapses: 1}, 0, now)
  assert.equal(s.dueAt, now + 600000)
  assert.equal(s.repetitions, 0)
  assert.equal(s.lapses, 2)
})
test('困难：1 天后且降低难度系数', () => {
  const s = scheduleReview(null, 1, now)
  assert.equal(s.intervalDays, 1)
  assert.ok(s.ease < 2.5)
})
test('连续记得：增加间隔', () => {
  const a = scheduleReview(null, 2, now)
  const b = scheduleReview(a, 2, a.dueAt)
  const c = scheduleReview(b, 2, b.dueAt)
  assert.ok(b.intervalDays > a.intervalDays)
  assert.ok(c.intervalDays > b.intervalDays)
})
test('无效评分：拒绝', () => {
  assert.throws(() => scheduleReview(null, 9, now))
})
