import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import StatusCards from "../StatsCard/StatsCard";
import { Button, message, Tag } from "antd";
import { Chart } from "chart.js";
import CommonTable from "../Commontable/Commontable";
import "../Commontable/InvoiceTable.scss";
import { Icon } from "@iconify/react";
import apiClient from "../../api/apiclient";
import { useState } from "react";
import dayjs from "dayjs";

const ApprovalDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // useEffect(() => {
  //   // Only show message if it exists
  //   if (location.state?.message) {
  //     message.success(location.state.message);
  //     // Replace the state while preserving pathname
  //     window.history.replaceState(
  //       { ...location.state, message: null },
  //       "",
  //       location.pathname,
  //     );
  //   }
  // }, [location]);

  const hasShownMessage = useRef(false);

  const [data, setData] = useState([]);
  const [draftsData, setDraftsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ approved: 0, pending: 0, rejected: 0, total: 0 });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch both draft and non-draft separately for clear dashboard separation
      const [reportsRes, draftsRes] = await Promise.all([
        apiClient.get("/liner/sales-input/reports/"),
        apiClient.get("/liner/sales-input/draft/"),
      ]);

      if (reportsRes.data?.status === "success") {
        const results = reportsRes.data.data.results || reportsRes.data.data;
        setData(results.map(item => ({
          ...item,
          key: item.id.toString(),
          commodities_display: item.commodities?.map(c => c.name).join(", ") || "-",
          contact_details: item.phone_no || "-",
        })));

        setStats(prev => ({
          ...prev,
          approved: results.filter(i => i.status === 'approved').length,
          pending: results.filter(i => i.status === 'submitted').length,
          rejected: results.filter(i => i.status === 'rejected').length,
          total: results.length
        }));
      }

      if (draftsRes.data?.status === "success") {
        const results = draftsRes.data.data.results || draftsRes.data.data;
        setDraftsData(results.map(item => ({
          ...item,
          key: item.id.toString(),
        })));
        setStats(prev => ({
          ...prev,
          overdue: results.length, // Using overdue slot for drafts count in UI
        }));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await apiClient.post(`/liner/sales-input/${id}/approve/`);
      if (res.data?.status === "success") {
        message.success(res.data?.message || "Sales Input Approved");
      } else {
        message.error(res.data?.message || "Approval failed");
      }
      fetchDashboardData();
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to approve";
      message.error(errMsg);
      fetchDashboardData(); // Also refresh so button visibility updates
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await apiClient.post(`/liner/sales-input/${id}/reject/`, { reason: "Rejected from Dashboard" });
      if (res.data?.status === "success") {
        message.success(res.data?.message || "Sales Input Rejected");
      } else {
        message.error(res.data?.message || "Rejection failed");
      }
      fetchDashboardData();
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to reject";
      message.error(errMsg);
      fetchDashboardData(); // Refresh so button visibility updates
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/liner/sales-input/${id}/`);
      message.success("Draft Deleted Successfully");
      fetchDashboardData();
    } catch (error) {
      console.error("Delete Error:", error);
      message.error("Failed to delete draft");
    }
  };

  const handleSubmitDraft = async (id) => {
    try {
      await apiClient.post(`/liner/sales-input/${id}/submit/`);
      message.success("Sales Input Submitted Successfully");
      fetchDashboardData();
    } catch (error) {
      console.error("Submit Error:", error);
      message.error("Failed to submit draft");
    }
  };

  useEffect(() => {
    if (!hasShownMessage.current && location.state?.message) {
      hasShownMessage.current = true;

      message.success(location.state.message || "Login successful!");

      // Clear state after showing message
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    let trendChart, statusChart, carrierChart;

    // Trend Chart
    const trendCtx = document.getElementById("trendChart");
    if (trendCtx) {
      trendChart = new Chart(trendCtx, {
        type: "line",
        data: {
          labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
          datasets: [
            {
              label: "Exports",
              data: [85, 92, 78, 98, 105, 112, 115],
              borderColor: "#17a2b8",
              backgroundColor: "rgba(23, 162, 184, 0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
      });
    }

    // Status Chart
    const statusCtx = document.getElementById("statusChart");
    if (statusCtx) {
      statusChart = new Chart(statusCtx, {
        type: "doughnut",
        data: {
          labels: ["Approved", "Pending", "Rejected", "In Progress"],
          datasets: [
            {
              data: [156, 3, 2, 12],
              backgroundColor: ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
        },
      });
    }

    // Carrier Chart
    const carrierCtx = document.getElementById("carrierChart");
    if (carrierCtx) {
      carrierChart = new Chart(carrierCtx, {
        type: "bar",
        data: {
          labels: [
            "Maersk",
            "MSC",
            "CMA CGM",
            "Hapag-Lloyd",
            "COSCO",
            "Evergreen",
          ],
          datasets: [
            {
              label: "Bookings",
              data: [45, 38, 32, 28, 25, 22],
              backgroundColor: "#17a2b8",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
      });
    }

    // Cleanup function to destroy charts when component unmounts
    return () => {
      if (trendChart) trendChart.destroy();
      if (statusChart) statusChart.destroy();
      if (carrierChart) carrierChart.destroy();
    };
  }, []);

  // const dummyData = [
  //   ...
  // ];

  const columns = [
    {
      title: "Export Number",
      dataIndex: "export_number",
      key: "export_number",
      render: (text) => (
        <span style={{ fontWeight: 600, color: "#1f2937" }}>{text || "N/A (Draft)"}</span>
      ),
    },
    {
      title: "Customer Name",
      dataIndex: "customer_name",
      key: "customer_name",
    },
    {
      title: "Carrier Name",
      dataIndex: "carrier_name",
      key: "carrier_name",
    },
    {
      title: "Job No (AFSYS)",
      dataIndex: "afsys_job_no",
      key: "afsys_job_no",
      render: (text) => <span style={{ fontStyle: 'italic' }}>{text || "-"}</span>
    },
    {
      title: "Booking Ref",
      dataIndex: "booking_ref_no",
      key: "booking_ref_no",
    },
    {
      title: "Created Date",
      dataIndex: "export_created_date",
      key: "export_created_date",
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "N/A"
    },
    {
      title: "Pending With",
      dataIndex: "pending_with",
      key: "pending_with",
      render: (pw) => <Tag color="blue">{pw || "N/A"}</Tag>
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Tag color={s === 'approved' ? 'success' : s === 'submitted' ? 'processing' : s === 'draft' ? 'default' : 'error'}>
          {s === 'submitted' ? 'PENDING' : s?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      align: "center",
      render: (_, record) => {
        const isTerminal = record.status === 'approved' || record.status === 'rejected';
        const canAct = !isTerminal && record.status === 'submitted' && !record.user_has_acted;
        return (
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
            <Button
              type="default"
              size="small"
              icon={<Icon icon="mdi:eye" />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const page = record.status === "draft" ? "sales-input" : "approval";
                const url = `${window.location.origin}/${page}?id=${record.id}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              View
            </Button>
            {canAct && (
              <>
                <Button
                  type="primary"
                  size="small"
                  icon={<Icon icon="mdi:check-circle" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprove(record.id);
                  }}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                >
                  Approve
                </Button>
                <Button
                  danger
                  size="small"
                  icon={<Icon icon="mdi:close-circle" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Reject this sales input?")) handleReject(record.id);
                  }}
                >
                  Reject
                </Button>
              </>
            )}
            {record.user_has_acted && !isTerminal && (
              <Tag color="blue" style={{ margin: 0 }}>Already Reviewed</Tag>
            )}
          </div>
        );
      }
    },
  ];

  return (
    <div className="main-container" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Main Content */}
      <main className="mx-auto px-4 py-6" style={{ maxWidth: "1600px" }}>
        <StatusCards stats={stats} />
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Icon icon="mdi:chart-line" color="#6366f1" />
                Export Trends (Monthly)
              </h2>
            </div>
            <div className="h-64">
              <canvas id="trendChart" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Icon icon="mdi:chart-pie" color="#10b981" />
                Status Distribution
              </h2>
            </div>
            <div className="h-64">
              <canvas id="statusChart" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Icon icon="mdi:trophy-outline" color="#3b82f6" />
              Top Carriers Performance
            </h2>
          </div>
          <div className="h-72">
            <canvas id="carrierChart" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Icon icon="mdi:file-edit-outline" color="#f59e0b" />
              My Drafts
            </h2>
            <Tag color="orange">{draftsData.length} Drafts</Tag>
          </div>
          <CommonTable
            columns={[
              { title: "Customer", dataIndex: "customer_name", key: "customer" },
              { title: "Carrier", dataIndex: "carrier_name", key: "carrier" },
              { title: "Job Type", dataIndex: "job_type", key: "job_type", render: (t) => t?.toUpperCase() },
              { title: "Created", dataIndex: "created_at", key: "created", render: (d) => dayjs(d).format("YYYY-MM-DD") },
              {
                title: "Actions",
                key: "actions",
                align: "center",
                render: (_, record) => (
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    <Button
                      size="small"
                      icon={<Icon icon="mdi:eye" />}
                      onClick={(e) => {
                        e.preventDefault();
                        const url = `${window.location.origin}/sales-input?id=${record.id}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<Icon icon="mdi:send" />}
                      onClick={() => handleSubmitDraft(record.id)}
                      style={{ backgroundColor: '#6366f1' }}
                    >
                      Submit
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<Icon icon="mdi:delete" />}
                      onClick={() => {
                        if (window.confirm("Delete this draft?")) handleDelete(record.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                )
              }
            ]}
            data={draftsData}
            loading={loading}
            yescomp={false}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Icon icon="mdi:ship-wheel" color="#2d7a82" />
              Active Shipments & Approvals
            </h2>
          </div>
          <CommonTable
            columns={columns}
            data={data}
            loading={loading}
            yescomp={true}
            page={1}
            total={data.length}
            pagesize={10}
          />
        </div>
      </main>
    </div>
  );
};
export default ApprovalDashboard;
