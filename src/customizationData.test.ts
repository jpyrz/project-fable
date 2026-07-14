import { describe, expect, it } from 'vitest'
import { appearanceForSpecies, customizationAssetForItem, customizationAssets, customizationSlots } from './customizationData'

describe('customization catalog', () => {
  it('keeps asset ids and slots unique', () => {
    expect(new Set(customizationAssets.map((asset) => asset.id)).size).toBe(customizationAssets.length)
    expect(new Set(customizationSlots.map((slot) => slot.id)).size).toBe(customizationSlots.length)
  })

  it('provides one starter asset for every slot and species', () => {
    for (const speciesId of ['mossling', 'lumipup', 'cloudkip', 'pebblit']) {
      expect(customizationAssets.filter((asset) => asset.speciesId === speciesId).map((asset) => asset.slot).sort()).toEqual(['hair', 'head', 'marking', 'outfit'])
    }
  })

  it('removes incompatible species layers from an appearance', () => {
    expect(appearanceForSpecies({ hair: 'mossling-hair-leafy-mohawk' }, 'cloudkip')).toEqual({})
  })

  it('maps owned items to fitted species layers', () => {
    expect(customizationAssetForItem('item-16', 'mossling')?.id).toBe('mossling-head-sunhat')
    expect(customizationAssetForItem('item-16', 'cloudkip')?.id).toBe('cloudkip-head-sunhat')
    expect(customizationAssetForItem('item-121', 'pebblit')?.id).toBe('pebblit-outfit-sunberry-tunic')
  })
})
