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
