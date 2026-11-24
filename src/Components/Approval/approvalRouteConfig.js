import { isCrossTradeJob } from "./utils/jobContextUtils";


export const APPROVAL_ROUTE_CONFIG = {
  "cs-update": {
    label: "CS Update",
    allowedStages: ["2","3"],
    check: ({ roles, jobData }) =>
      roles.isCS,
  },

  "hod-review": {
    label: "HOD Review",
    allowedStages: ["2"],
    check: ({ roles, jobData }) =>
      !jobData?.is_hod_approved &&
      (roles.isSalesHOD || roles.isAdmin),
  },

  "cnf-update": {
    label: "CNF Update",
    allowedStages: ["2", "3","4", "5", "6", "7","9","8"],
    // Cross Trade has no CNF stage
    check: ({ roles, jobData }) => roles.isCNF && !isCrossTradeJob(jobData),
  },

  "cs-documents": {
    label: "CS Documents",
    allowedStages: ["4","5", "6", "7","9", "8","10",'2','3'],
    check: ({ roles }) => roles.isCS,
  },

  "cs-hod-approval": {
    label: "CS HOD Approval",
    allowedStages: ["5", "6", "7","4","9"],
    check: ({ user, jobData }) =>
      !!jobData?.cs_hod &&
      String(user?.id) === String(jobData?.cs_hod),
  },

  "accounts": {
    label: "Accounts",
    allowedStages: ["6", "7","9","5","4","8","10","2","3","1"],
    check: ({ roles, jobData }) =>
      roles.isAccountsTeam
    //  &&
    //   (jobData?.current_stage === "6" || (jobData?.current_stage === "7")||(jobData?.current_stage === "9")||(jobData?.current_stage === "5")),
  },
};
