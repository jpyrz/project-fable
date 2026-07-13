import { describe, expect, it } from 'vitest'
import { foodTraitFor, foodTraits } from './foodEffects'

describe('expedition food traits', () => {
  it('assigns each food a stable rotating trait', () => {
    expect(foodTraitFor('item-1')).toBe('cozy')
    expect(foodTraitFor('item-2')).toBe('keen')
    expect(foodTraitFor('item-3')).toBe('lucky')
    expect(foodTraitFor('item-31')).toBe('cozy')
  })

  it('keeps every trait player-readable', () => {
    expect(Object.values(foodTraits).every((trait) => trait.label && trait.description && trait.icon)).toBe(true)
  })
})
