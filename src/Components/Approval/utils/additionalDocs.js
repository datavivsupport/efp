/**
 * Additional LPO/Invoice uploads (CS Team — 2nd phase).
 *
 * CS may upload further LPO/Invoice files *after* CS HOD has already approved the
 * job once. The backend does not mark these with a distinct doc_type — a 2nd-phase
 * upload is just another document with doc_type "LPO"/"Invoice", gated by its own
 * per-document `is_cs_hod_approved` flag (see liner/views.py `upload_document`,
 * which sets it False whenever the doc needs a fresh CS HOD sign-off).
 *
 * So "additional" is positional, not a stored flag: within a set of same-type
 * files (e.g. all LPO files for a job), the earliest-uploaded one is the original;
 * anything uploaded afterward is a 2nd-phase/additional file.
 */

const createdAtMs = (file) => {
  const t = new Date(file?.created_at || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** Additional (non-original) files within one doc-type bucket, e.g. all LPO files. */
export const getAdditionalDocs = (files) => {
  if (!Array.isArray(files) || files.length <= 1) return [];
  const sorted = [...files].sort((a, b) => createdAtMs(a) - createdAtMs(b) || (a.id ?? 0) - (b.id ?? 0));
  return sorted.slice(1);
};

/**
 * CS HOD approval state of a single document.
 *
 * `is_cs_hod_approved` is only ever explicitly false while approval is
 * outstanding; documents predating the flag come back undefined/true and count
 * as approved.
 */
export const isDocPendingApproval = (file) => file?.is_cs_hod_approved === false;
