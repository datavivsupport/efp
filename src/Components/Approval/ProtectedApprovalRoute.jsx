import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { Spin, Result, Button } from "antd";
import apiClient from "../../api/apiclient";
import { computeUserRoles } from "./utils/roleUtils";
import { APPROVAL_ROUTE_CONFIG } from "./approvalRouteConfig";

/**
 * ProtectedApprovalRoute
 *
 * Wraps every approval sub-page. On mount it:
 *  1. Fetches the job by :id
 *  2. Resolves the route config by :routeKey
 *  3. Checks allowedStages + check() against the logged-in user
 *  4. Renders the child page or redirects to "/"
 *
 * Usage in main.jsx:
 *   <ProtectedApprovalRoute routeKey="cs-update">
 *     <CsUpdate />
 *   </ProtectedApprovalRoute>
 */
const ProtectedApprovalRoute = ({ routeKey, children }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const [status, setStatus] = useState("loading"); // "loading" | "allowed" | "denied"
  const [jobData, setJobData] = useState(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await apiClient.get(`/liner/sales-input/${id}/`);
        if (res.data.status !== "success") {
          setStatus("denied");
          return;
        }

        const job = res.data.data;
        setJobData(job);

        const config = APPROVAL_ROUTE_CONFIG[routeKey];
        if (!config) {
          setStatus("denied");
          return;
        }

        const roles = computeUserRoles(user);
        const currentStage = String(job?.current_stage || "1");

        const stageOk = config.allowedStages.includes(currentStage);
        const roleOk  = roles.isAdmin || config.check({ user, jobData: job, roles });

        setStatus(stageOk && roleOk ? "allowed" : "denied");
      } catch {
        setStatus("denied");
      }
    };

    if (id && user) verify();
  }, [id, user, routeKey]);

  if (status === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <Result
        status="403"
        title="Not Authorized"
        subTitle="You don't have access to this step, or it is not active for this job."
        extra={
          <Button type="primary" onClick={() => navigate("/")}>
            Back to Dashboard
          </Button>
        }
      />
    );
  }

  // Pass jobData down so pages don't need to re-fetch
  return children({ jobData, user });
};

export default ProtectedApprovalRoute;
