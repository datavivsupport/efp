/**
 * Additional LPO/Invoice uploads (CS Team — 2nd phase).
 *
 * CS may upload further LPO/Invoice files *after* CS HOD has already approved the
 * job once. Those files have to stay distinguishable from the originals forever —
 * including downstream at Accounts, which only ever sees them once they are
 * approved and so cannot rely on the pending flag.
 *
 * The marker therefore lives in `doc_type`: a second-phase file is uploaded as
 * "LPO ADDITIONAL" / "INVOICE ADDITIONAL". DOC_TYPE_CONFIG in formMapper.js lists
 * those spellings alongside the originals, so they still land in lpoFiles /
 * invoiceFiles and every existing requirement check keeps counting them.
 *
 * Approval state stays on the server's per-document `is_cs_hod_approved` flag.
 */

/** Base doc_type → the doc_type used when the same document is a 2nd-phase upload. */
export const ADDITIONAL_DOC_TYPE_BY_BASE = {
  LPO: "LPO ADDITIONAL",
  INVOICE: "INVOICE ADDITIONAL",
};

/** Every doc_type spelling that marks a 2nd-phase upload, uppercased. */
export const ADDITIONAL_DOC_TYPES = Object.values(ADDITIONAL_DOC_TYPE_BY_BASE);

const ADDITIONAL_DOC_TYPE_SET = new Set(ADDITIONAL_DOC_TYPES);

const normalize = (docType) => String(docType || "").trim().toUpperCase();

/** True when this document was uploaded by CS after the first CS HOD approval. */
export const isAdditionalDoc = (file) =>
  ADDITIONAL_DOC_TYPE_SET.has(normalize(file?.doc_type));

/**
 * True once the job has cleared CS HOD at least once — i.e. any LPO/Invoice CS
 * uploads from here on are additional. Mirrors the job-level flag the pages
 * already use to show the "CS HOD Approved" banner.
 */
export const isSecondPhase = (jobData) => !!jobData?.is_cs_hod_approved;

/**
 * doc_type to stamp on a file being uploaded right now.
 * Only LPO and Invoice have a second phase; everything else is untouched.
 */
export const resolveUploadDocType = (baseDocType, jobData) => {
  if (!isSecondPhase(jobData)) return baseDocType;
  return ADDITIONAL_DOC_TYPE_BY_BASE[normalize(baseDocType)] || baseDocType;
};

/**
 * doc_type to send when saving an already-stored file back to the server.
 *
 * The save payloads rewrite doc_type from the bucket the file sits in ("LPO",
 * "Invoice"), which would erase the marker on the next save. Keep the additional
 * spelling; fall back to the bucket's type for everything else so legacy files
 * matched by filename keyword still get a canonical doc_type.
 */
export const preserveDocType = (file, baseDocType) =>
  isAdditionalDoc(file) ? file.doc_type : baseDocType;

/**
 * CS HOD approval state of a single document.
 *
 * `is_cs_hod_approved` is only ever explicitly false while approval is
 * outstanding; documents predating the flag come back undefined and count as
 * approved — the same reading AccountsUpdate uses to decide what it may show.
 */
export const isDocPendingApproval = (file) => file?.is_cs_hod_approved === false;
