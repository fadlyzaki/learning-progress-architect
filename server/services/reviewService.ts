export function getReviewSchedule(confidence: number | null) {
  if (confidence === null || confidence <= 2) {
    return { daysUntilReview: 2, priority: 'high' as const };
  }

  if (confidence === 3) {
    return { daysUntilReview: 4, priority: 'medium' as const };
  }

  return { daysUntilReview: 7, priority: 'low' as const };
}
