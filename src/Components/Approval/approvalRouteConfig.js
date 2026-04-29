/**
 * ─── APPROVAL ROUTE CONFIG ───────────────────────────────────────────────────
 *
 * Each key = the URL segment after /approval/:id/
 *
 * allowedStages : job must be at one of these stages
 * check         : fn({ user, jobData, roles }) → boolean
 *                 if false → user is redirected away
 * label         : human-readable name (used in page titles / breadcrumbs)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const APPROVAL_ROUTE_CONFIG = {
  "cs-update": {
    label: "CS Update",
    allowedStages: ["2"],
    check: ({ roles, jobData }) =>
      roles.isCS && !jobData?.is_cs_updated,
  },

  "hod-review": {
    label: "HOD Review",
    allowedStages: ["2"],
    check: ({ roles, jobData }) =>
      !jobData?.is_hod_approved &&
      (roles.isSalesHOD || roles.isAdmin),
  },

  "cnf-update": {
    label: "CNF Update",
    allowedStages: ["2", "3"],
    check: ({ roles }) => roles.isCNF,
  },

  "cs-documents": {
    label: "CS Documents",
    allowedStages: ["4","7"],
    check: ({ roles }) => roles.isCS,
  },

  "cs-hod-approval": {
    label: "CS HOD Approval",
    allowedStages: ["5", "7"],
    check: ({ user, jobData }) =>
      !!jobData?.cs_hod &&
      String(user?.id) === String(jobData?.cs_hod),
  },

  "accounts": {
    label: "Accounts",
    allowedStages: ["6", "7"],
    check: ({ roles, jobData }) =>
      roles.isAccountsTeam &&
      (jobData?.current_stage === "6" || (jobData?.current_stage === "7")),
  },
};
