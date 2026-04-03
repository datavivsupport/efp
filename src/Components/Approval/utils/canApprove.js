/**
 * ─── WORKFLOW APPROVAL MATRIX ────────────────────────────────────────────────
 * Defines who can click "Approve" at each stage for each job type.
 *
 * To grant or restrict approval at any stage, edit the entries below.
 * Each entry: { stage, jobTypes, roles }
 *   - stage:    string stage number to match
 *   - jobTypes: array of booleans (pass the flag, e.g. isLiner) — ANY true = match
 *   - roles:    array of booleans — ANY true = can approve
 * ─────────────────────────────────────────────────────────────────────────────
 */
const buildApprovalRules = (ctx) => {
  const {
    isLiner, isCrossTrade, isForwarding, isExtended,
    isCS, isCNF, isCNFHOD, isCSHOD, isAccountsTeam,
    isSalesHOD, isCNFDone, isCNFStage, isCSHODStage,
    isThisJobsCSHOD,
    stage2,
  } = ctx;

  return [
    // Stage 2 — Sales HOD or CS or CNF
    {
      stage: "2",
      roles: [isSalesHOD, stage2.isThisJobsHOD, isCS, isCNF],
    },
    // Stage 3 — Forwarding: CNF (until load list uploaded)
    {
      stage: "3",
      guard: isForwarding && isCNF && !isCNFDone,
      roles: [true],
    },
    // Stage 3 — Liner / Cross-Trade: CNF HOD
    {
      stage: "3",
      guard: !isForwarding && (isLiner || isCrossTrade),
      roles: [isCNFHOD],
    },
    // Stage 3 — Extended (non-forwarding): CNF HOD
    {
      stage: "3",
      guard: isExtended && !isForwarding,
      roles: [isCNFHOD],
    },
    // Stage 4 — Forwarding: CS
    {
      stage: "4",
      guard: isForwarding,
      roles: [isCS],
    },
    // Stage 4 — Extended (non-forwarding): CS
    {
      stage: "4",
      guard: isExtended && !isForwarding,
      roles: [isCS],
    },
    // Stage 4 — Liner: CS
    {
      stage: "4",
      guard: isLiner,
      roles: [isCS],
    },
    // Stage 5 — Forwarding: only the assigned CS HOD (matched by user ID)
    {
      stage: "5",
      guard: isForwarding,
      roles: [isThisJobsCSHOD],
    },
    // Stage 5 — Extended (non-forwarding): Accounts
    {
      stage: "5",
      guard: isExtended && !isForwarding,
      roles: [isAccountsTeam],
    },
    // Stage 5 — Liner: CS HOD
    {
      stage: "5",
      guard: isLiner && isCSHODStage,
      roles: [isCSHOD],
    },
    // Stage 3 — Liner CNF stage: CNF or Sales HOD
    {
      stage: "3",
      guard: isLiner && isCNFStage,
      roles: [isCNF, isSalesHOD],
    },
    // Stage 6 — Liner: Accounts
    {
      stage: "6",
      guard: isLiner,
      roles: [isAccountsTeam],
    },
    // Stage 7 — Liner: CS or CNF (close job)
    {
      stage: "7",
      guard: isLiner,
      roles: [isCS, isCNF],
    },
  ];
};

/**
 * Returns true if the current user can click Approve/Reject.
 *
 * @param {object} ctx  — merged role + job context flags
 */
export const computeCanApprove = (ctx) => {
  const { hasAllowedRole, isAdmin, currentStage } = ctx;
  if (!hasAllowedRole) return false;
  if (isAdmin) return true;

  const rules = buildApprovalRules(ctx);
  return rules.some((rule) => {
    if (rule.stage !== currentStage) return false;
    if ("guard" in rule && !rule.guard) return false;
    return rule.roles.some(Boolean);
  });
};
