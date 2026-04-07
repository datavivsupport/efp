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

  // Hide haulage cost, haulier note, ED, load list, remarks at CS stage 2
  const hideDocumentsAtStage2 = isCS && isStage2;

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
    hideDocumentsAtStage2,
    disableDocumentsAtStage4,
    showROBOCForCS,
    needsLpoInvoice,
  };
};
