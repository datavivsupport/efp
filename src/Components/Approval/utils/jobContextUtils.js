/**
 * ─── JOB TYPE CONFIG ─────────────────────────────────────────────────────────
 * Add new job types here. Each key maps to the substring matched against
 * jobData.job_type (case-insensitive). To add a new job type, add an entry
 * and then use the returned flag in Approval.jsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const JOB_TYPE_CONFIG = {
  LINER:       ["LINER"],
  CROSS_TRADE: ["CROSS_TRADE", "CROSS TRADE"],
  FORWARDING:  ["FORWARDING"],
  OTHERS:      ["OTHERS"],
};

const matchJobType = (jobTypeUpper, keywords) =>
  keywords.some((kw) => jobTypeUpper.includes(kw));

/**
 * ─── TERMINAL STATUSES ───────────────────────────────────────────────────────
 * Statuses that mean the job is closed and no further action is possible.
 */
const TERMINAL_STATUSES = ["rejected", "REJECTED-CLOSED", "Completed", "completed"];

/**
 * Derives job-type flags, stage flags, and stage-2 gate logic.
 *
 * @param {object} opts
 * @param {object} opts.jobData          - API job record
 * @param {string|null} opts.id          - URL search param (null = master/view-only mode)
 * @param {object} opts.user             - logged-in user
 * @param {array}  opts.approvalHistory  - sorted approval history
 * @param {object} opts.roles            - role flags from computeUserRoles()
 */
export const computeJobContext = ({ jobData, id, user, approvalHistory, roles }) => {
  const { isCS, isAdmin, userFullName } = roles;

  // ── Stage ──────────────────────────────────────────────────────────────────
  const currentStage = String(jobData?.current_stage || "1");

  // ── Creator detection ──────────────────────────────────────────────────────
  const creatorUserId =
    jobData?.created_by_user ||
    approvalHistory.find((h) => h.stage === "Sales Created")?.updated_by_user;
  const isCreator = !!(creatorUserId && creatorUserId === user?.id);

  // ── Job type flags (extend JOB_TYPE_CONFIG above to add new types) ─────────
  const jobTypeUpper = (jobData?.job_type || "").toUpperCase();
  const isLiner      = matchJobType(jobTypeUpper, JOB_TYPE_CONFIG.LINER);
  const isCrossTrade = matchJobType(jobTypeUpper, JOB_TYPE_CONFIG.CROSS_TRADE);
  const isForwarding = matchJobType(jobTypeUpper, JOB_TYPE_CONFIG.FORWARDING);
  const isOthers     = matchJobType(jobTypeUpper, JOB_TYPE_CONFIG.OTHERS);
  const isMasterMode = !id;

  // Extended workflow = Cross Trade or Forwarding (9-stage flow)
  const isExtended = isCrossTrade || isForwarding;

  // ── Terminal state ─────────────────────────────────────────────────────────
  const isTerminal =
    (jobData?.status === "approved" && !isExtended && !isLiner) ||
    TERMINAL_STATUSES.includes(jobData?.status) ||
    currentStage === "9";

  // ── Stage shortcuts ────────────────────────────────────────────────────────
  const isStage2 = currentStage === "2";
  const isStage3 = currentStage === "3";

  const isAccountsStage = (isLiner || isExtended)
    ? currentStage === "6"
    : isOthers
    ? currentStage === "7"
    : false;

  const isForwardingStage5 = isForwarding && currentStage === "5";

  const isCNFStage = (isLiner || isExtended || isForwarding)
    ? currentStage === "3"
    : false;

  const isCSHODStage = (isLiner || isExtended) ? currentStage === "5" : false;

  // ── CS HOD gate: only the user whose ID matches cs_hod field can approve ─────
  const isThisJobsCSHOD =
    !!jobData?.cs_hod &&
    String(user?.id) === String(jobData?.cs_hod);
  console.log(user?.id, jobData?.cs_hod, isThisJobsCSHOD);
  // ── Stage 2 gate logic ─────────────────────────────────────────────────────
  // Edit this object to change who can act at stage 2.
  const stage2 = {
    // True when the current user is the named Sales HOD for this specific job
    isThisJobsHOD:
      isStage2 &&
      !jobData?.is_hod_approved &&
      jobData?.sales_hod?.toLowerCase().trim() === userFullName?.toLowerCase().trim(),

    // CS can act at stage 2 only if they haven't already updated (is_cs_updated = false)
    csCanAct: isStage2 && isCS && !jobData?.is_cs_updated,

    // Creator becomes read-only after submitting
    creatorLocked: isCreator && jobData?.status !== "draft",
  };

  // CS done + HOD not yet approved → CS form fully locked (no buttons, no edits)
  const isCSDoneWaitingHOD =
    isStage2 && isCS && !isAdmin &&
    !!jobData?.is_cs_updated && !jobData?.is_hod_approved;

  // Approve/Reject buttons are hidden when this user has nothing to do at stage 2
  const isStage2ButtonsHidden =
    isStage2 &&
    !isAdmin &&
    ((isCS && !stage2.csCanAct) || (!isCS && !stage2.isThisJobsHOD));

  return {
    currentStage,
    isCreator,
    isLiner,
    isCrossTrade,
    isForwarding,
    isOthers,
    isMasterMode,
    isExtended,
    isTerminal,
    isStage2,
    isStage3,
    isAccountsStage,
    isForwardingStage5,
    isCNFStage,
    isCSHODStage,
    stage2,
    isStage2ButtonsHidden,
    isCSDoneWaitingHOD,
    isThisJobsCSHOD,
  };
};
