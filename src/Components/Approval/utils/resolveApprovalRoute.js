import { computeUserRoles } from "./roleUtils";

/**
 * Given a job record + logged-in user, returns the correct
 * approval sub-route path to navigate to.
 *
 * Usage in table:
 *   const path = resolveApprovalRoute(jobRow, user);
 *   if (path) navigate(path);
 *   else navigate(`/approval?id=${jobRow.id}`); // fallback to old page
 */
export const resolveApprovalRoute = (jobData, user) => {
  const id           = jobData?.id;
  const currentStage = String(jobData?.current_stage || "1");
  const roles        = computeUserRoles(user);

  // Stage 2 — CS (only if not yet updated)
  if (currentStage === "2" && roles.isCS && !jobData?.is_cs_updated) {
    return `/approval/${id}/cs-update`;
  }

  // Stage 2 — Named Sales HOD (only if not yet approved)
  if (
    currentStage === "2" &&
    !jobData?.is_hod_approved &&
    (roles.isSalesHOD || roles.isAdmin)
  ) {
    return `/approval/${id}/hod-review`;
  }

  // Stage 2 or 3 — CNF
  if ((currentStage === "2" || currentStage === "3") && roles.isCNF) {
    return `/approval/${id}/cnf-update`;
  }

  // Stage 4 — CS documents
  if (currentStage === "4" && roles.isCS) {
    return `/approval/${id}/cs-documents`;
  }
  console.log(user?.id, jobData?.cs_hod);
  // Stage 5 — Assigned CS HOD (ID match)
  if (
    currentStage === "5" && String(user?.id) === String(jobData?.cs_hod)
  ) {
    return `/approval/${id}/cs-hod-approval`;
  }

  // Stage 6 — Accounts
  if (currentStage === "6" && roles.isAccountsTeam) {
    return `/approval/${id}/accounts`;
  }

  // No matching new route → fall back to old Approval page
  return null;
};
