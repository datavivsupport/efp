/**
 * Normalizes a value that may come as boolean, string "Yes"/"No", or "true"/"false"
 * into a true boolean. Falls back to `initial` when `val` is undefined/null.
 *
 * Used for form fields that store boolean-like values from the API.
 *
 * @param {*} val      - live form-watch value
 * @param {*} initial  - fallback value from jobData
 */
export const normalizeBoolean = (val, initial) => {
  const parse = (v) => {
    if (v === true  || v === "true"  || v === "Yes" || v === "yes") return true;
    if (v === false || v === "false" || v === "No"  || v === "no")  return false;
    return null;
  };
  const parsed = parse(val);
  if (parsed !== null) return parsed;
  return parse(initial) === true;
};
