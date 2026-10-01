import { computeUserRoles } from "./roleUtils";
import { isCrossTradeJob } from "./jobContextUtils";


export const resolveApprovalRoute = (jobData, user) => {
  const id           = jobData?.id;
  const currentStage = String(jobData?.current_stage || "1");
  const roles        = computeUserRoles(user);
  const isSalesHod = user?.first_name && user?.last_name && jobData?.sales_hod && (user.first_name + " " + user.last_name === jobData.sales_hod);

  // OTHERS job type — always use the main approval page (no sub-routes)
  if (jobData?.job_type?.toUpperCase() === "OTHERS") {
    return null;
  }
  
  if (currentStage=="1"){
    
      if (roles.isAccountsTeam && !isSalesHod) {
    return `/approval/${id}/accounts`;
  }
     return null 
  }

  // Stage 2 — CS fills the page; Liner stage 3 — same page, opened read-only (other job types keep the old page there)
  const isLinerJob = jobData?.job_type?.toUpperCase() === "LINER";
  if ((currentStage === "2" || (currentStage === "3" && isLinerJob)) && roles.isCS && !isSalesHod) {
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
    !jobData?.is_hod_approved && (roles.isSalesHOD) &&isSalesHod
  ) {
    return `/approval/${id}/hod-review`;
  }

  // Stage 2 or 3 — CNF

  // Stage 4 — CS documents
  if ((currentStage === "4"|| currentStage=="6"|| currentStage === "5"|| currentStage === "7"|| currentStage === "9") && roles.isCS && String(user?.id) !== String(jobData?.cs_hod) && !isSalesHod) {
    return `/approval/${id}/cs-documents`;
  }
  // Stage 5 — Assigned CS HOD (ID match)

  // Stage 6 — Accounts
  if (roles.isAccountsTeam && !isSalesHod) {
    return `/approval/${id}/accounts`;
  }

  // Cross Trade has no CNF stage — a CNF-department user falls through to the Approval page
  if (roles.isCNF && !isSalesHod && !isCrossTradeJob(jobData)) {
    return `/approval/${id}/cnf-update`;
  }

  if (roles.isCS && roles.isAdmin && !isSalesHod){
    return `/approval/${id}/cs-documents`;
  }
  // No matching new route → fall back to old Approval page
  return null;
};
