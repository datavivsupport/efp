import { getRejectionReason } from "../../utils/jobContextUtils";

/** The "Rejection Reason" notice the CS HOD page shows, for any page that has the job record. */
const RejectionReasonBox = ({ jobData, style }) => (
  <div style={{ padding: 12, backgroundColor: "#fff2e8", border: "1px solid #ffbb96", borderRadius: 4, ...style }}>
    <div style={{ fontWeight: 600, color: "#d4380d", marginBottom: 4 }}>⚠️ Rejection Reason:</div>
    <div style={{ color: "#595959", whiteSpace: "pre-line", wordBreak: "break-word" }}>
      {getRejectionReason(jobData) || "Rejected by previous approver"}
    </div>
  </div>
);

export default RejectionReasonBox;
