import { TERMINAL_STATUSES } from "./jobContextUtils";

/** doc_type spellings that count as the Load List (mirrors DOC_TYPE_CONFIG). */
const LOAD_LIST_DOC_TYPES = ["LOAD LIST", "LOAD LIST UPLOADING"];

/**
 * CS sees CNF's section only once CNF has handed over: the second stage has started and
 * the Load List is in. Keyed on delivery, not on the stage alone - the job leaves stage 2
 * the moment CS confirms the booking, which is before CNF has done anything.
 */
export const isCnfDataVisibleToCS = (jobData) => {
  const stage = String(jobData?.current_stage || "1");
  if (stage === "1" || stage === "2") return false;
  // Nothing to wait for when the job was configured without a Load List.
  if (jobData?.is_load_list_required === false) return true;
  return (jobData?.documents || []).some((d) =>
    LOAD_LIST_DOC_TYPES.includes(d?.doc_type?.toUpperCase())
  );
};

/**
 * Placement Details is the one section CS and CNF keep editing after Sales has
 * handed the job over: the truck slots move around right up to the moment the
 * desk signs off. Each desk may edit while the job is sitting with it, and the
 * edits go out on the existing PATCH /liner/sales-input/:id/ call — so a plain
 * Save persists them, and Submit/Approve carries the final rows.
 *
 * Once the desk submits/approves, the section goes read-only for that desk again.
 */
export const canCSEditPlacement = ({
  isAdmin, isCS, currentStage, isMasterMode, isTerminal, jobData,
}) => {
  if (isAdmin) return true;
  if (!isCS || isMasterMode || isTerminal) return false;
  // Callers that don't compute isTerminal still must not edit a closed job.
  if (TERMINAL_STATUSES.includes(jobData?.status)) return false;

  switch (String(currentStage || "")) {
    // CS Update desk — open until CS marks the job updated.
    case "2":
      return !jobData?.is_cs_updated;
    // CS Documents desk — open until CS hands the job to the CS HOD.
    case "4":
    case "4B":
      return true;
    // Any later stage belongs to CS HOD / Accounts.
    default:
      return false;
  }
};

/**
 * Computes all section-level read/write lock flags for Approval.jsx.
 *
 * Every "disabled" prop on a form field traces back to one of these flags.
 * To change who can edit a section, edit only this file.
 *
 * @param {object} ctx  — job context + role flags
 */
export const computeSectionLocks = (ctx) => {
  const {
    // role flags
    isAdmin, isCS, isCNF, isSalesExecutive, isCreator,
    isCSHOD, isAccountsTeam, isHOD, isSalesHOD,
    // job/stage context
    currentStage, isMasterMode, isTerminal, isForwarding,
    isLiner, isExtended, isOthers,
    isStage2, isCNFStage, isCSHODStage, isAccountsStage,
    // stage-2 gate
    stage2, isCSDoneWaitingHOD,
    // job data
    jobData,
  } = ctx;

  // ── Base lock: applies to every section ───────────────────────────────────
  // stage 5 Forwarding = CS HOD approval only → all fields read-only
  const baseLocked =
    isMasterMode ||
    stage2.creatorLocked ||
    isCSDoneWaitingHOD ||
    isTerminal ||
    (!isAdmin && isForwarding && currentStage === "5");

  // ── CNF done once load list uploaded ──────────────────────────────────────
  const isCNFDone = !isAdmin && isCNF && !!jobData?.is_cnf_loadlist_uploaded;

  // ── HOD is always read-only unless they are the creator or admin ──────────
  const isGlobalHODReadOnly = isHOD && !isAdmin && !isCreator;

  // ── Sales HOD on a Liner job: attachments & comments only ─────────────────
  const isSalesHODLinerRestricted = isLiner && isSalesHOD && !isAdmin;

  // ── CS booking edit window ─────────────────────────────────────────────────
  // Forwarding stage 4: booking is read-only for CS
  const csBookingEditStage = isStage2 || (isLiner && currentStage === "4");

  // ── Section locks ──────────────────────────────────────────────────────────
  const isSalesSectionLocked =
    baseLocked ||
    (!isSalesExecutive && !isCreator && !isAdmin) ||
    (currentStage !== "1" && currentStage !== "2" && currentStage !== "3" && !isAdmin) ||
    isGlobalHODReadOnly;

  const isBookingSectionLocked =
    baseLocked || (!isAdmin && (!isCS || !csBookingEditStage));

  const isCNFSectionLocked =
    baseLocked ||
    isCNFDone ||
    (!isCNF && !isAdmin) ||
    (!isCNFStage && !(isLiner && isStage2) && !isAdmin);

  const isAccountsOnlyFieldLocked =
    baseLocked ||
    (!isAccountsTeam && !isAdmin) ||
    (!isAccountsStage && !isAdmin);

  const isAccountsEditableFieldLocked =
    isExtended && isAccountsStage
      ? !isAccountsTeam && !isAdmin
      : isAccountsOnlyFieldLocked;

  // ── Upload locks ───────────────────────────────────────────────────────────
  const isCSUploadLocked = baseLocked || (!isCS && !isAdmin);
  // const isCNFUploadLocked =
  //   baseLocked ||
  //   isCNFDone ||
  //   (!isCNF && !isAdmin) ||
  //   (!isCNFStage && !(isLiner && isStage2) && !isAdmin);

  const isCNFUploadLocked =
  isCNF
    ? false
    : (
        baseLocked ||
        isCNFDone ||
        (!isCNF && !isAdmin) ||
        (!isCNFStage && !(isLiner && isStage2) && !isAdmin)
      );

  // ED is CNF-owned normally, but CS can upload at Forwarding stage 4
  const isEDUploadLocked =
    (isForwarding && currentStage === "4")
      ? baseLocked || (!isCS && !isCNF && !isAdmin)
      : isCNFUploadLocked;

  const isAccountsUploadLocked =
    isMasterMode ||
    isTerminal ||
    (!isAccountsTeam && !isAdmin) ||
    (currentStage < "5" && !isAdmin);

  const isRequirementSelectorLocked =
    (!isCS && !isAdmin && !isMasterMode) ||
    isSalesHODLinerRestricted ||
    (!isMasterMode && parseInt(currentStage) > 2 && !isAdmin);

  // ── Visibility helpers ─────────────────────────────────────────────────────
  const showDocumentUploads =
    ((!(isStage2 || currentStage === "3") || isMasterMode || (isForwarding && currentStage === "5")) && !isCNF) ||
    (isMasterMode && isCNF) ||
     isCNF || isCS ||
    (isCNF && isForwarding && currentStage === "3") ||
    (isForwarding && currentStage === "5");  // always visible at Forwarding stage 5

  // Hide haulage cost, haulier note, ED, load list, remarks from CS until CNF hands over
  const hideCnfFromCS = isCS && !isCnfDataVisibleToCS(jobData);

  // Disable these fields at CS stage 4
  const disableDocumentsAtStage4 = isCS && currentStage === "4";

  const showROBOCForCS = isStage2 && isCS && !isAdmin;

  const needsLpoInvoice =
    currentStage === "4" || currentStage === "4B" || currentStage === "5";

  return {
    baseLocked,
    isCNFDone,
    isGlobalHODReadOnly,
    isSalesHODLinerRestricted,
    csBookingEditStage,
    isSalesSectionLocked,
    isBookingSectionLocked,
    isCNFSectionLocked,
    isAccountsOnlyFieldLocked,
    isAccountsEditableFieldLocked,
    isCSUploadLocked,
    isEDUploadLocked,
    isCNFUploadLocked,
    isAccountsUploadLocked,
    isRequirementSelectorLocked,
    showDocumentUploads,
    hideCnfFromCS,
    disableDocumentsAtStage4,
    showROBOCForCS,
    needsLpoInvoice,
  };
};
