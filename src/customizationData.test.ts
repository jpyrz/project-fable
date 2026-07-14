import { describe, expect, it } from 'vitest'
import { appearanceForSpecies, customizationAssetForItem, customizationAssets, customizationSlots } from './customizationData'

describe('customization catalog', () => {
  it('keeps asset ids and slots unique', () => {
    expect(new Set(customizationAssets.map((asset) => asset.id)).size).toBe(customizationAssets.length)
    expect(new Set(customizationSlots.map((slot) => slot.id)).size).toBe(customizationSlots.length)
  })

  it('provides one golden Mossling asset for each pilot slot', () => {
    expect(customizationAssets.filter((asset) => asset.speciesId === 'mossling').map((asset) => asset.slot).sort()).toEqual(['hair', 'head', 'marking', 'outfit'])
  })

  it('removes incompatible species layers from an appearance', () => {
    expect(appearanceForSpecies({ hair: 'mossling-hair-leafy-mohawk' }, 'cloudkip')).toEqual({})
  })

  it('maps owned items to fitted species layers', () => {
    expect(customizationAssetForItem('item-16', 'mossling')?.id).toBe('mossling-head-sunhat')
    expect(customizationAssetForItem('item-16', 'cloudkip')).toBeUndefined()
  })
})
