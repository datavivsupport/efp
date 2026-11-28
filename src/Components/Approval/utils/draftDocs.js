// Draft uploads (Forwarding / Liner / Cross Trade).
//
// The backend marks a file `is_saved: false` from upload until its uploader presses Save or
// Submit / Approve. Only the uploader ever receives their own drafts - nobody else sees them -
// so a file with `is_saved === false` here is always this user's draft: it keeps its Delete
// icon. Every saved file is locked. Works the same in any browser or tab.

const DRAFT_JOB_TYPES = ["FORWARDING", "LINER", "CROSS TRADE"];

/** Job types whose uploads start as drafts. */
export const usesDraftUploads = (job) =>
  DRAFT_JOB_TYPES.includes(String(job?.job_type || "").replace(/[_-]/g, " ").trim().toUpperCase());

/** Ids of the job's saved files (everything except this user's own drafts). */
export const savedDocIdSet = (documents) =>
  new Set((documents || []).filter((d) => d?.id != null && d.is_saved !== false).map((d) => d.id));
