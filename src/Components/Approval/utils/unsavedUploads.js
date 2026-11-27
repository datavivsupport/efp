// Ids of files a user uploaded to a job that still keep their Delete icon. Two lists:
//  - unsaved: uploaded since the user's last Save / Submit / Approve / Reject.
//  - kept:    saved while the job was with CNF (CS had already done Verify & Confirm) - such a
//             Save does not lock them; they stay deletable until Submit / Approve / Reject.
//
// Kept in localStorage, per user and per job: every tab of the browser shares it, so a job
// reopened from the dashboard (a new tab) or after a browser restart still shows the icon.
// One browser has one login at a time (the session cookie is shared by all tabs); the
// user id in the key keeps people who log in one after another on the same machine apart.
// Another browser / computer has its own storage - there the files count as saved.

const storageKey = (jobId, userId) => `liner_unsaved_uploads_${userId}_${jobId}`;
const keptKey = (jobId, userId) => `liner_kept_uploads_${userId}_${jobId}`;

const readList = (key) => {
  try {
    const ids = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
};

const readIds = (jobId, userId) => (!jobId || userId == null ? [] : readList(storageKey(jobId, userId)));
const readKeptIds = (jobId, userId) => (!jobId || userId == null ? [] : readList(keptKey(jobId, userId)));

/** Set of this user's still-deletable upload ids (as strings) for this job: unsaved + kept. */
export const getUnsavedUploadIds = (jobId, userId) =>
  new Set([...readIds(jobId, userId), ...readKeptIds(jobId, userId)]);

/** Remember a file this user uploaded that has not been saved yet. */
export const addUnsavedUpload = (jobId, docId, userId) => {
  if (!jobId || docId == null || userId == null) return;
  try {
    const ids = readIds(jobId, userId);
    if (!ids.includes(String(docId))) {
      localStorage.setItem(storageKey(jobId, userId), JSON.stringify([...ids, String(docId)]));
    }
  } catch { /* storage unavailable: the file simply locks on the next page load */ }
};

/**
 * Save succeeded. keepOpen (CS saved after Verify & Confirm, job is with CNF): this user's uploads
 * move to the kept list - they stay deletable until Submit / Approve / Reject.
 * Otherwise they lock now; files already on the kept list stay open.
 */
export const saveUnsavedUploads = (jobId, userId, keepOpen) => {
  if (!jobId || userId == null) return;
  try {
    if (keepOpen) {
      const kept = new Set([...readKeptIds(jobId, userId), ...readIds(jobId, userId)]);
      if (kept.size) localStorage.setItem(keptKey(jobId, userId), JSON.stringify([...kept]));
    }
    localStorage.removeItem(storageKey(jobId, userId));
  } catch { /* ignore */ }
};

/** Submit / Approve / Reject succeeded: every file this user put on the job now counts as saved. */
export const clearUnsavedUploads = (jobId, userId) => {
  if (!jobId || userId == null) return;
  try {
    localStorage.removeItem(storageKey(jobId, userId));
    localStorage.removeItem(keptKey(jobId, userId));
  } catch { /* ignore */ }
};
