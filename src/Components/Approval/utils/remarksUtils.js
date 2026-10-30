
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
