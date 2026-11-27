// Ids of files a user uploaded to a job since their last Save / Submit / Approve / Reject.
// Those files keep their Delete icon until then.
//
// Kept in localStorage, per user and per job: every tab of the browser shares it, so a job
// reopened from the dashboard (a new tab) or after a browser restart still shows the icon.
// One browser has one login at a time (the session cookie is shared by all tabs); the
// user id in the key keeps people who log in one after another on the same machine apart.
// Another browser / computer has its own storage - there the files count as saved.

const storageKey = (jobId, userId) => `liner_unsaved_uploads_${userId}_${jobId}`;

const readIds = (jobId, userId) => {
  if (!jobId || userId == null) return [];
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey(jobId, userId)) || "[]");
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
};

/** Set of this user's unsaved upload ids (as strings) for this job. */
export const getUnsavedUploadIds = (jobId, userId) => new Set(readIds(jobId, userId).map(String));

/** Remember a file this user uploaded that has not been saved yet. */
export const addUnsavedUpload = (jobId, docId, userId) => {
  if (!jobId || docId == null || userId == null) return;
  try {
    const ids = readIds(jobId, userId).map(String);
    if (!ids.includes(String(docId))) {
      localStorage.setItem(storageKey(jobId, userId), JSON.stringify([...ids, String(docId)]));
    }
  } catch { /* storage unavailable: the file simply locks on the next page load */ }
};

/** Save / Submit / Approve / Reject succeeded: this user's files on the job now count as saved. */
export const clearUnsavedUploads = (jobId, userId) => {
  if (!jobId || userId == null) return;
  try { localStorage.removeItem(storageKey(jobId, userId)); } catch { /* ignore */ }
};
