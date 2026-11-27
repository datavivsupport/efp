const UNSAVED = Symbol("unsavedRemark");

export const createRemark = (text, user) => ({
  text: String(text).trim(),
  user_id: user?.id,
  user_name: user?.first_name || user?.name || "User",
  date: new Date().toISOString(),
  [UNSAVED]: true,
});

/** Only an unsaved, current-session remark may be deleted. */
export const canDeleteRemark = (remark) => !!remark?.[UNSAVED];

// Remarks a user added to a job but has not sent yet (Save / Submit / Approve / Reject).
// Kept in localStorage, per user and per job (same idea as unsavedUploads.js), so a refresh
// or a trip to the overview page does not lose them. Another browser / computer has its own
// storage and does not see them.
const storageKey = (jobId, userId) => `unsaved_remarks_${userId}_${jobId}`;

const readUnsaved = (jobId, userId) => {
  if (!jobId || userId == null) return [];
  try {
    const list = JSON.parse(localStorage.getItem(storageKey(jobId, userId)) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const sameRemark = (a, b) =>
  typeof a === "object" && a !== null && a.text === b.text && a.date === b.date && String(a.user_id) === String(b.user_id);

/** Saved remarks from the server, followed by this user's unsaved ones (still deletable). */
export const withUnsavedRemarks = (savedRemarks, jobId, userId) => {
  const saved = savedRemarks || [];
  // A remark already on the server (sent before the list was cleared) is not shown twice.
  const unsaved = readUnsaved(jobId, userId)
    .filter((r) => !saved.some((s) => sameRemark(s, r)))
    .map((r) => ({ ...r, [UNSAVED]: true }));
  return [...saved, ...unsaved];
};

/** Remember the unsaved remarks in this list (call after every add / delete). */
export const storeUnsavedRemarks = (jobId, userId, remarks) => {
  if (!jobId || userId == null) return;
  try {
    // JSON.stringify drops the UNSAVED symbol key; it is put back by withUnsavedRemarks.
    const unsaved = (remarks || []).filter(canDeleteRemark);
    if (unsaved.length) localStorage.setItem(storageKey(jobId, userId), JSON.stringify(unsaved));
    else localStorage.removeItem(storageKey(jobId, userId));
  } catch { /* storage unavailable: the remark is lost on refresh, as before */ }
};

/** Save / Submit / Approve / Reject succeeded: nothing is pending any more. */
export const clearUnsavedRemarks = (jobId, userId) => {
  if (!jobId || userId == null) return;
  try { localStorage.removeItem(storageKey(jobId, userId)); } catch { /* ignore */ }
};
