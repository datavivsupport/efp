// Liner: ids of files uploaded since the user's last Save / Submit / Approve, kept per job in
// sessionStorage so a page refresh does not treat them as saved (and hide their Delete icon).

const storageKey = (jobId) => `liner_unsaved_uploads_${jobId}`;

const readIds = (jobId) => {
  try {
    const ids = JSON.parse(sessionStorage.getItem(storageKey(jobId)) || "[]");
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
};

/** Set of unsaved upload ids (as strings) for this job. */
export const getUnsavedUploadIds = (jobId) => new Set(readIds(jobId).map(String));

/** Remember a file uploaded in this tab that has not been saved yet. */
export const addUnsavedUpload = (jobId, docId) => {
  if (!jobId || docId == null) return;
  try {
    const ids = readIds(jobId).map(String);
    if (!ids.includes(String(docId))) sessionStorage.setItem(storageKey(jobId), JSON.stringify([...ids, String(docId)]));
  } catch { /* storage unavailable: the file simply locks on the next page load */ }
};

/** Save / Submit / Approve succeeded: every file on the job now counts as saved. */
export const clearUnsavedUploads = (jobId) => {
  if (!jobId) return;
  try { sessionStorage.removeItem(storageKey(jobId)); } catch { /* ignore */ }
};
