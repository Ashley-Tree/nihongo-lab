import test from 'node:test'
import assert from 'node:assert/strict'
import { nextReviewState } from '../src/services/unifiedReviewAlgorithm.ts'
const now = 1_800_000_000_000

test('忘记：10 分钟后重试并增加 lapse', () => {
  const x = nextReviewState(undefined, 0, now)
  assert.equal(x.dueAt, now + 600_000)
  assert.equal(x.lapses, 1)
  assert.equal(x.repetitions, 0)
})
test('困难：安排短间隔', () => {
  const x = nextReviewState(undefined, 1, now)
  assert.equal(x.intervalDays, 1)
  assert.equal(x.repetitions, 1)
})
test('记得：第一次间隔一天', () => {
  const x = nextReviewState(undefined, 2, now)
  assert.equal(x.intervalDays, 1)
})
test('简单：第一次间隔三天并提高 ease', () => {
  const x = nextReviewState(undefined, 3, now)
  assert.equal(x.intervalDays, 3)
  assert.equal(x.ease, 2.65)
})
test('后续记得：间隔随 ease 增长', () => {
  const x = nextReviewState({ intervalDays: 3, ease: 2.5, repetitions: 2, lapses: 0 }, 2, now)
  assert.equal(x.intervalDays, 8)
  assert.equal(x.repetitions, 3)
})
test('ease 不会低于 1.3', () => {
  const x = nextReviewState({ intervalDays: 1, ease: 1.3, repetitions: 1, lapses: 4 }, 0, now)
  assert.equal(x.ease, 1.3)
})
