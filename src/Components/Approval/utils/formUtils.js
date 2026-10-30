
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
