import type { FoodTrait } from '../types'

export const foodTraits: Record<FoodTrait, { label: string; icon: string; description: string }> = {
  cozy: { label: 'Cozy', icon: '💗', description: 'A warmer return and a little extra reputation.' },
  keen: { label: 'Keen', icon: '🌿', description: 'Brings home one additional gathered material.' },
  lucky: { label: 'Lucky', icon: '✨', description: 'Adds 10% to the rare discovery chance.' },
}

export function foodTraitFor(itemId: string): FoodTrait {
  const itemNumber = Number(itemId.replace(/\D/g, ''))
  if (itemNumber % 3 === 1) return 'cozy'
  if (itemNumber % 3 === 2) return 'keen'
  return 'lucky'
}
