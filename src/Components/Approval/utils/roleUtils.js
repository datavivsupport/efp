/**
 * ─── DEPARTMENT CONFIG ───────────────────────────────────────────────────────
 * Add new department keyword arrays here to extend role detection.
 * Each array lists substrings matched against dept names AND role names.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const DEPT_CONFIG = {
  CS:       ["CUSTOMER SERVICE", "DOCUMENTATION", "SHIPPING", "DOCS"],
  CNF:      ["C&F", "CNF", "CLEARANCE", "FORWARDING", "OPERATIONS", "LOGISTICS"],
  SALES:    ["SALES", "CREATOR"],
  ACCOUNTS: ["ACCOUNTS", "FINANCE", "PAYABLE"],
};

const matchesKeywords = (list, keywords) =>
  keywords.some((kw) => list.some((item) => item.includes(kw)));

/**
 * Derives all role/department flags from the logged-in user object.
 * Returns a flat object of booleans consumed by Approval.jsx.
 */
export const computeUserRoles = (user) => {
  const userRoles = (user?.roles || []).map((r) =>
    (typeof r === "object" ? r.name : r).toUpperCase()
  );

  const userDepts = [
    ...(user?.departments_assigned_names || []),
    ...(user?.department_names || []),
    user?.department || "",
  ]
    .filter(Boolean)
    .map((d) => String(d).toUpperCase());

  const isAdmin = userRoles.some((r) =>
    ["ADMIN", "SUPER ADMIN"].includes(r)
  );

  const isSuperUser =
    userRoles.some((r) => r.includes("SUPER USER")) || isAdmin;

  // Use DEPT_CONFIG — add/rename departments there, no changes needed below
  const isCS       = matchesKeywords(userDepts, DEPT_CONFIG.CS)       || matchesKeywords(userRoles, DEPT_CONFIG.CS);
  const isCNF      = matchesKeywords(userDepts, DEPT_CONFIG.CNF)      || matchesKeywords(userRoles, DEPT_CONFIG.CNF);
  const isSales    = matchesKeywords(userDepts, DEPT_CONFIG.SALES)    || matchesKeywords(userRoles, DEPT_CONFIG.SALES);
  const isAccounts = matchesKeywords(userDepts, DEPT_CONFIG.ACCOUNTS) || matchesKeywords(userRoles, DEPT_CONFIG.ACCOUNTS);

  const isHOD = userRoles.some((r) =>
    ["HOD", "APPROVER", "MANAGER", "PRINCIPAL"].includes(r) || r.includes("HOD")
  );

  const isGM = userRoles.some((r) => r === "GM");

  const isSalesExecutive = (isSales && !isHOD) || isAdmin;
  const isSalesHOD = (isSales && isHOD);
  const isCNFExecutive = (isCNF && !isHOD) || isAdmin;
  const isCSExecutive = (isCS && !isHOD) || isAdmin;
  const isCSHOD = (isCS && isHOD) || isAdmin;
  const isAccountsTeam = isAccounts || isAdmin;
  const isDocsTeam =
    userRoles.some((r) => r.includes("DOCS")) ||
    userDepts.some((d) => d.includes("DOCS"));
  const isCNFHOD = isCNF && isHOD;

  const hasAllowedRole =
    userRoles.some(
      (r) =>
        r.includes("EXECUTIVE") ||
        r.includes("HOD") ||
        r.includes("APPROVER") ||
        r.includes("GM") ||
        r.includes("UPLOADER")
    ) || isAdmin;

  const userFullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();

  return {
    userRoles,
    userDepts,
    isAdmin,
    isSuperUser,
    isCS,
    isCNF,
    isSales,
    isAccounts,
    isHOD,
    isGM,
    isSalesExecutive,
    isSalesHOD,
    isCNFExecutive,
    isCSExecutive,
    isCSHOD,
    isAccountsTeam,
    isDocsTeam,
    isCNFHOD,
    hasAllowedRole,
    userFullName,
  };
};
