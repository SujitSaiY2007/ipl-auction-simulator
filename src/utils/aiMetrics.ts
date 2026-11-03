import { RawPlayer, AuctionPlayer, PitchType, ReportCard, AuctionTeam } from '../types';

export function safeFloat(val: unknown): number {
  if (val === null || val === undefined) return 0.0;
  const f = parseFloat(String(val));
  return isNaN(f) ? 0.0 : f;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00 Cr';
  return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
}

export function calculateAiPlayerMetrics(
  player: RawPlayer | AuctionPlayer,
  pitchType: PitchType = 'Standard'
): { ai_rating: number; true_value: number } {
  const role = String(player.role || '').toLowerCase();
  const highlight = String(player.career_highlight || '').toLowerCase();
  const spec = String(player.specialization || '').toLowerCase();
  const pitch = String(pitchType || 'Standard');

  // Baseline Tier Anchor
  let tierAnchor = 75;
  const tier = player.tier;
  if (tier === 'Marquee' || player.base_price >= 20000000) {
    tierAnchor = 91;
  } else if (tier === 'Elite' || player.base_price >= 10000000) {
    tierAnchor = 84;
  } else if (tier === 'Capped' || player.base_price >= 5000000) {
    tierAnchor = 77;
  } else {
    tierAnchor = 70;
  }

  const batAvg = safeFloat(player.batting_avg);
  const batSr = safeFloat(player.batting_strike_rate);
  const bowlEcon = safeFloat(player.bowling_economy);
  const bowlSr = safeFloat(player.bowling_strike_rate);
  const wickets = safeFloat(player.bowling_wickets);
  const runs = safeFloat(player.batting_runs);

  // 1. Batting Skill Metric (calibrated for modern T20 cricket)
  let batSkill = 72;
  if (batAvg > 0 || batSr > 0) {
    const avgScore = batAvg > 0 ? Math.min(10, Math.max(-6, (batAvg - 28) * 0.8)) : 0;
    const srScore = batSr > 0 ? Math.min(12, Math.max(-6, (batSr - 135) * 0.24)) : 0;
    const runBonus = runs > 4000 ? 5 : runs > 2000 ? 3.5 : runs > 1000 ? 2 : 0;
    const milestoneBonus = Math.min(4, ((player.fifties || 0) + (player.hundreds || 0) * 2) * 0.08);
    batSkill = 74 + avgScore + srScore + runBonus + milestoneBonus;
  }

  // 2. Bowling Skill Metric (calibrated for modern T20 economy 7.5 - 8.6 par)
  let bowlSkill = 72;
  if (bowlEcon > 0 || wickets > 0) {
    // Econ benchmark: <= 7.4 is exceptional (+8), 7.5-8.4 is par (+4 to +6), 8.5-9.2 is (+1 to +3)
    const econScore = bowlEcon > 0 ? Math.min(10, Math.max(-6, (8.5 - bowlEcon) * 4.0)) : 0;
    // Strike rate benchmark: <= 16 is lethal (+10), 17-21 is (+5 to +8)
    const srScore = bowlSr > 0 ? Math.min(10, Math.max(-5, (21.0 - bowlSr) * 1.5)) : 0;
    const wicketBonus = wickets > 150 ? 6 : wickets > 90 ? 4.5 : wickets > 45 ? 3 : wickets > 15 ? 1.5 : 0;
    bowlSkill = 74 + econScore + srScore + wicketBonus;
  }

  // 3. Role-weighted composite
  let compositeSkill = 75;
  if (role.includes('wicketkeeper')) {
    compositeSkill = batSkill + 1.5; // Glovework utility
  } else if (role.includes('batter')) {
    compositeSkill = batSkill;
  } else if (role.includes('bowler')) {
    compositeSkill = bowlSkill;
  } else if (role.includes('all-rounder')) {
    const primary = Math.max(batSkill, bowlSkill);
    const secondary = Math.min(batSkill, bowlSkill);
    compositeSkill = primary * 0.60 + secondary * 0.40 + 5.0; // Balanced all-rounder utility
  } else {
    compositeSkill = (batSkill + bowlSkill) / 2;
  }

  // 4. Blend Anchor (42%) and Dynamic Skill (58%) for fair, grounded ratings
  let baseRating = tierAnchor * 0.42 + compositeSkill * 0.58;

  // 5. Contextual Pitch Synergy (tactical nuance: ±2 to 4 points)
  if (pitch === 'Green Top') {
    if (highlight.includes('fast') || highlight.includes('pace') || spec.includes('pace') || spec.includes('swing')) {
      baseRating += 3.5;
    } else if (role.includes('bowler') && !highlight.includes('spin')) {
      baseRating += 2.0;
    }
  } else if (pitch === 'Dust Bowl') {
    if (highlight.includes('spin') || spec.includes('spin') || highlight.includes('mystery')) {
      baseRating += 4.0;
    } else if (spec.includes('spin hitter') || highlight.includes('spin')) {
      baseRating += 2.0;
    }
  } else if (pitch === 'Flat Track') {
    if (highlight.includes('power') || spec.includes('power') || spec.includes('finisher') || batSr >= 150) {
      baseRating += 3.5;
    } else if (bowlEcon > 0 && bowlEcon <= 7.6) {
      baseRating += 2.0; // Control bowlers on flat tracks are prized
    }
  }

  // Clamp rating between 55 and 98
  const finalRating = Math.max(55, Math.min(98, Math.round(baseRating)));

  // 6. Realistic Market True Valuation curve
  let trueValueCr = 2.0;
  if (finalRating >= 92) {
    trueValueCr = 15.0 + (finalRating - 92) * 1.5; // 15.0 - 24.0 Cr
  } else if (finalRating >= 85) {
    trueValueCr = 9.5 + (finalRating - 85) * 0.75; // 9.5 - 14.7 Cr
  } else if (finalRating >= 78) {
    trueValueCr = 5.0 + (finalRating - 78) * 0.6;  // 5.0 - 9.2 Cr
  } else if (finalRating >= 70) {
    trueValueCr = 2.5 + (finalRating - 70) * 0.3;  // 2.5 - 4.9 Cr
  } else {
    trueValueCr = 0.5 + (finalRating - 55) * 0.12; // 0.5 - 2.3 Cr
  }

  const basePrice = typeof player.base_price === 'number' ? player.base_price : 2000000;
  const trueValue = Math.max(Math.floor(basePrice), Math.floor(trueValueCr * 10000000));

  return { ai_rating: finalRating, true_value: trueValue };
}

export function calculateTournamentReportCards(
  teams: AuctionTeam[],
  rostersByTeam: Record<number, AuctionPlayer[]>,
  xiData: Record<number, number[]>
): ReportCard[] {
  const reportCards: ReportCard[] = [];

  for (const t of teams) {
    const selectedXiIds = xiData[t.id] || [];
    const roster = rostersByTeam[t.id] || [];

    let playingXi = roster.filter((p) => selectedXiIds.includes(p.id));
    const bench = roster.filter((p) => !selectedXiIds.includes(p.id));
    if (playingXi.length === 0) {
      playingXi = roster.slice(0, 11);
    }

    const batters = playingXi
      .filter((p) => p.role.toLowerCase().includes('batter') || p.role.toLowerCase().includes('all-rounder'))
      .map((p) => p.ai_rating)
      .sort((a, b) => b - a);

    const bowlers = playingXi
      .filter((p) => p.role.toLowerCase().includes('bowler') || p.role.toLowerCase().includes('all-rounder'))
      .map((p) => p.ai_rating)
      .sort((a, b) => b - a);

    const coreBatting =
      batters.length >= 5
        ? batters.slice(0, 5).reduce((a, b) => a + b, 0) / 5
        : batters.length > 0
        ? batters.reduce((a, b) => a + b, 0) / batters.length
        : 0;

    const coreBowling =
      bowlers.length >= 5
        ? bowlers.slice(0, 5).reduce((a, b) => a + b, 0) / 5
        : bowlers.length > 0
        ? bowlers.reduce((a, b) => a + b, 0) / bowlers.length
        : 0;

    const xiRating = coreBatting * 0.5 + coreBowling * 0.5;
    const benchRatingAvg =
      bench.length > 0 ? bench.reduce((sum, p) => sum + p.ai_rating, 0) / bench.length : 0;

    let tbiScore = xiRating * 0.85 + benchRatingAvg * 0.15;

    const highs: string[] = [];
    const lows: string[] = [];

    if (coreBatting >= 85) highs.push('Elite Top-Order Batting');
    if (coreBowling >= 85) highs.push('Lethal 5-Man Bowling Attack');
    if (benchRatingAvg >= 75) highs.push('Excellent Bench Depth');

    if (bowlers.length < 5) {
      tbiScore -= 15;
      lows.push('Critical: Lacks 5th Bowling Option');
    }
    if (!playingXi.some((p) => p.role.toLowerCase().includes('wicketkeeper'))) {
      tbiScore -= 10;
      lows.push('No Specialist Wicketkeeper in XI');
    }

    const stars = Math.round((Math.max(1, Math.min(100, tbiScore)) / 100) * 5 * 10) / 10;

    reportCards.push({
      franchise_id: t.franchise_id,
      team_name: t.name,
      tbi_score: Math.round(tbiScore * 10) / 10,
      stars,
      spent: safeFloat(t.spent),
      highlights: highs,
      drawbacks: lows,
    });
  }

  reportCards.sort((a, b) => b.tbi_score - a.tbi_score);
  return reportCards;
}
