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

  // OTHERS job type — always use the main approval page (no sub-routes)
  if (jobData?.job_type?.toUpperCase() === "OTHERS") {
    return null;
  }

  // Stage 2 — CS (only if not yet updated)
  if (currentStage === "2" && roles.isCS && !jobData?.is_cs_updated) {
    return `/approval/${id}/cs-update`;
  }


  if (
    String(user?.id) === String(jobData?.cs_hod)
  ) {
    return `/approval/${id}/cs-hod-approval`;
  }
  // Stage 2 — Named Sales HOD (only if not yet approved)
  if (
    currentStage === "2" &&
    !jobData?.is_hod_approved &&
    (roles.isSalesHOD)
  ) {
    return `/approval/${id}/hod-review`;
  }

  // Stage 2 or 3 — CNF

  // Stage 4 — CS documents
  if ((currentStage === "4"|| currentStage=="6"|| currentStage === "5"|| currentStage === "7"|| currentStage === "9") && roles.isCS && String(user?.id) !== String(jobData?.cs_hod) ) {
    return `/approval/${id}/cs-documents`;
  }
  // Stage 5 — Assigned CS HOD (ID match)

  // Stage 6 — Accounts
  if ((currentStage === "6"|| currentStage==="7"|| currentStage === "9"||currentStage=="5" )&& roles.isAccountsTeam) {
    return `/approval/${id}/accounts`;
  }

  if (roles.isCNF) {
    return `/approval/${id}/cnf-update`;
  }

  if (roles.isCS && roles.isAdmin){
    return `/approval/${id}/cs-documents`;
  }
  // No matching new route → fall back to old Approval page
  return null;
};
