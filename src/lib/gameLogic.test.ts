import { describe, expect, it } from 'vitest'
import { calculateBondReward, calculateGameReward, calculateMarketFee, createBloomDeck, petBondLevel, reputationLevel, validateRun } from './gameLogic'

describe('economy rules', () => {
  it('caps arcade rewards and preserves a participation minimum', () => {
    expect(calculateGameReward(0)).toBe(10)
    expect(calculateGameReward(150)).toBe(50)
    expect(calculateGameReward(9_999)).toBe(90)
  })
  it('rounds the five-percent market fee up', () => {
    expect(calculateMarketFee(101)).toBe(6)
  })
  it('rejects impossible client runs', () => {
    expect(validateRun(400, 30)).toBe(true)
    expect(validateRun(2_001, 30)).toBe(false)
    expect(validateRun(400, 4)).toBe(false)
  })
  it('advances reputation every 100 XP', () => {
    expect(reputationLevel(0)).toBe(1)
    expect(reputationLevel(205)).toBe(3)
  })
  it('creates a Bloom Match deck with exactly six complete pairs', () => {
    const deck = createBloomDeck(() => .42)
    const counts = deck.reduce<Record<string, number>>((result, card) => ({ ...result, [card.value]: (result[card.value] ?? 0) + 1 }), {})
    expect(deck).toHaveLength(12)
    expect(Object.keys(counts)).toHaveLength(6)
    expect(Object.values(counts)).toEqual([2, 2, 2, 2, 2, 2])
  })
  it('rewards stronger game scores with capped Bond XP', () => {
    expect(calculateBondReward(0)).toBe(8)
    expect(calculateBondReward(300)).toBe(14)
    expect(calculateBondReward(2_000)).toBe(16)
  })
  it('advances companion Bond every 100 XP', () => {
    expect(petBondLevel(0)).toBe(1)
    expect(petBondLevel(99)).toBe(1)
    expect(petBondLevel(100)).toBe(2)
  })
})
