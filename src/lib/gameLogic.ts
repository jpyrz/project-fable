export function calculateGameReward(score: number) {
  return Math.min(90, Math.max(10, Math.floor(score / 3)))
}

export function calculateMarketFee(total: number) {
  return Math.ceil(total * 0.05)
}

export function validateRun(score: number, elapsedSeconds: number) {
  return score >= 0 && score <= 2_000 && elapsedSeconds >= 20 && elapsedSeconds <= 180
}

export function reputationLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 100) + 1)
}

const bloomSymbols = ['🌸', '🌼', '🌺', '🌻', '🌷', '🌹']

export interface BloomCard {
  id: number
  value: string
  open: boolean
  matched: boolean
}

export function createBloomDeck(random = Math.random): BloomCard[] {
  const deck = [...bloomSymbols, ...bloomSymbols].map((value, id) => ({ id, value, open: false, matched: false }))
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]]
  }
  return deck
}
