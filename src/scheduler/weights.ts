/** Penalty weights for pairing, in descending priority order (PLAN.md section 4a). Tunable constants. */
export const WEIGHTS = {
  oddBeginners: 1000,
  fourBeginners: 500,
  beginnersSameTeam: 300,
  teamImbalancePerPoint: 10,
  repeatPartner: 50,
  repeatOpponent: 20,
  sameCourtAsLastRound: 5,
};

/** Skill-sum difference (levels, lower = better) at or above this is called out as an explanation. */
export const TEAM_IMBALANCE_EXPLAIN_THRESHOLD = 3.0;
