function normalized(value, max = 100) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

export function scoreObservation(observation) {
  const metrics = observation.metrics ?? {};
  const viewScore = normalized(metrics.views ?? 0, 1_500_000);
  const shareScore = normalized(metrics.shares ?? 0, 15_000);
  const growthScore = normalized(metrics.growth ?? metrics.recencyScore ?? 0);
  const commentScore = normalized(metrics.comments ?? 0, 6_000);
  const rankScore = metrics.rank ? Math.max(0, 100 - metrics.rank * 6) : 42;
  const sourceScore = normalized(metrics.sourceWeight ?? 0);
  const coOccurrenceScore = normalized(metrics.coOccurrenceScore ?? 0);
  const categoryMatchScore = normalized(metrics.categoryMatchScore ?? 0);
  const hatenaScore = normalized(metrics.hatenaHotEntryScore ?? 0);

  return Math.round(
    growthScore * 0.26 +
      sourceScore * 0.18 +
      rankScore * 0.16 +
      coOccurrenceScore * 0.14 +
      categoryMatchScore * 0.1 +
      hatenaScore * 0.08 +
      shareScore * 0.04 +
      viewScore * 0.02 +
      commentScore * 0.02,
  );
}

export function scoreCluster(cluster) {
  if (!cluster.observations.length) {
    return {
      momentumScore: 0,
      saturationScore: 0,
      noveltyScore: 0,
      confidenceScore: 0,
    };
  }
  const observationScores = cluster.observations.map(scoreObservation);
  const average =
    observationScores.reduce((total, score) => total + score, 0) /
    Math.max(1, observationScores.length);
  const sourceCount = new Set(cluster.observations.map((item) => item.source)).size;
  const evidenceBonus = Math.min(12, cluster.observations.length * 3 + sourceCount * 2);
  const saturationPenalty = cluster.tags.some((tag) => /ショートドラマ|BeforeAfter/.test(tag)) ? 7 : 2;
  const momentumScore = Math.min(100, Math.round(average + evidenceBonus));
  const saturationScore = Math.min(100, Math.round(48 + saturationPenalty + cluster.observations.length * 5));
  const confidenceScore = Math.min(100, Math.round(54 + sourceCount * 8 + cluster.observations.length * 4));

  return {
    momentumScore,
    saturationScore,
    noveltyScore: Math.max(35, 100 - saturationScore + 18),
    confidenceScore,
  };
}
