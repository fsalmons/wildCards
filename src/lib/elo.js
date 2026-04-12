export function calculateElo(winnerElo, loserElo, kFactor = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400))
  const newWinnerElo = Math.round(winnerElo + kFactor * (1 - expectedWinner))
  const newLoserElo = Math.round(loserElo + kFactor * (0 - (1 - expectedWinner)))
  return { winnerNewElo: newWinnerElo, loserNewElo: newLoserElo, change: newWinnerElo - winnerElo }
}
