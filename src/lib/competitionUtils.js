export function getAvailableCards(allUserCards, usedCardIds) {
  const usedSet = new Set(usedCardIds)
  return allUserCards.filter(c => !usedSet.has(c.id))
}

export function fillRandomSlots(lockedCards, availableCards, totalSlots = 5) {
  const lockedIds = new Set(lockedCards.map(c => c.id))
  const remaining = availableCards.filter(c => !lockedIds.has(c.id)).sort(() => Math.random() - 0.5)
  return [...lockedCards, ...remaining.slice(0, totalSlots - lockedCards.length)]
}

export function totalRating(cards) {
  return cards.reduce((s, c) => s + (c.rating ?? 0), 0)
}

export function getCompetitionState(competition, currentRound, userId) {
  if (!competition) return 'no_competition'
  const isChallenger = competition.challenger_id === userId
  if (competition.status === 'pending') {
    return isChallenger ? 'pending_sent' : 'pending_received'
  }
  if (
    competition.status === 'complete' ||
    competition.status === 'rejected' ||
    competition.status === 'forfeited'
  ) {
    return 'series_complete'
  }
  if (!currentRound) return 'waiting'
  const mySubmitted = isChallenger
    ? currentRound.challenger_submitted
    : currentRound.opponent_submitted
  const theirSubmitted = isChallenger
    ? currentRound.opponent_submitted
    : currentRound.challenger_submitted
  const myContinued = isChallenger
    ? currentRound.challenger_continued
    : currentRound.opponent_continued
  if (currentRound.winner_id) {
    return myContinued ? 'waiting' : 'round_result'
  }
  if (mySubmitted) return 'waiting'
  return 'pick_cards'
}
