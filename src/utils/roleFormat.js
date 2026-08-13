
export const toTitleCase = (str) => {
  if (!str) return "";
  return String(str)
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const getRoleNamesWithComma = (roles) => {
  if (!Array.isArray(roles)) return "";
  return roles
    .map((role) => toTitleCase(typeof role === "object" ? role?.name : role))
    .filter(Boolean)
    .join(", ");
};

export const normalizeDepartments = (raw) => {
  const ids = [];
  const names = [];

  if (!Array.isArray(raw)) return { ids, names };

  raw.forEach((dept) => {
    if (dept && typeof dept === "object") {
      if (dept.id != null) ids.push(dept.id);
      if (dept.name) names.push(dept.name);
    } else if (dept != null) {
      ids.push(dept);
    }
  });

  return { ids, names };
};


export const normalizeDivision = (raw) => {
  if (raw && typeof raw === "object") {
    return { id: raw.id ?? null, name: raw.name || "" };
  }
  return { id: raw ?? null, name: "" };
};
