// Badge Rules – One-sentence actionable insights
// 12 simple if/else rules, no ML, easy to audit

export type BadgeColor = 'green' | 'amber' | 'red';

export interface Badge {
  color: BadgeColor;
  text: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Velocity badge: bets/min threshold detection
 */
export function velocityBadge(currentRate: number, prevRate: number): Badge {
  const delta = ((currentRate - prevRate) / prevRate) * 100;

  if (currentRate > 50 && delta > 50) {
    return { color: 'red', text: `⚡ ${currentRate.toFixed(0)} bets/min (+${delta.toFixed(0)}% spike)`, severity: 'critical' };
  }
  if (currentRate > 30 && delta > 20) {
    return { color: 'amber', text: `⚡ ${currentRate.toFixed(0)} bets/min (+${delta.toFixed(0)}% elevated)`, severity: 'high' };
  }
  return { color: 'green', text: `⚡ ${currentRate.toFixed(0)} bets/min (normal)`, severity: 'low' };
}

/**
 * Sharpness badge: percentile comparison
 */
export function sharpnessBadge(steamPct: number, percentile: number): Badge {
  if (steamPct > 70 && percentile >= 95) {
    return { color: 'red', text: `🎯 ${steamPct.toFixed(0)}% steam bets (top ${(100 - percentile).toFixed(0)}% of agents)`, severity: 'critical' };
  }
  if (steamPct > 50 && percentile >= 85) {
    return { color: 'amber', text: `🎯 ${steamPct.toFixed(0)}% steam bets (above average)`, severity: 'medium' };
  }
  return { color: 'green', text: `🎯 ${steamPct.toFixed(0)}% steam bets (normal)`, severity: 'low' };
}

/**
 * Concentration badge: Gini threshold
 */
export function concentrationBadge(gini: number): Badge {
  if (gini > 0.8) {
    return { color: 'red', text: `📊 Gini ${gini.toFixed(2)} (highly concentrated)`, severity: 'high' };
  }
  if (gini > 0.6) {
    return { color: 'amber', text: `📊 Gini ${gini.toFixed(2)} (moderately concentrated)`, severity: 'medium' };
  }
  return { color: 'green', text: `📊 Gini ${gini.toFixed(2)} (well distributed)`, severity: 'low' };
}

/**
 * Recency badge: decay score interpretation
 */
export function recencyBadge(score: number, hoursAgo: number): Badge {
  if (score > 0.8 && hoursAgo < 4) {
    return { color: 'green', text: `🔥 Active ${hoursAgo.toFixed(0)}h ago (score ${score.toFixed(2)})`, severity: 'low' };
  }
  if (score > 0.5 && hoursAgo < 24) {
    return { color: 'amber', text: `🔥 Last seen ${hoursAgo.toFixed(0)}h ago (score ${score.toFixed(2)})`, severity: 'medium' };
  }
  return { color: 'red', text: `🔥 Dormant ${hoursAgo.toFixed(0)}h ago (score ${score.toFixed(2)})`, severity: 'high' };
}
