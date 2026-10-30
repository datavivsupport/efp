/**
 * General remarks are an append-only audit trail: once a remark has been saved
 * with the job it must never be deletable, by anyone, on any page.
 *
 * Remarks added in the current session are tagged with a Symbol. JSON.stringify
 * (and therefore axios) drops symbol-keyed properties, so the tag never reaches
 * the backend — a remark that has round-tripped through the server comes back
 * untagged and is permanently read-only. Do not replace this with a string key
 * unless you also strip it at every general_remarks send site.
 */
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
