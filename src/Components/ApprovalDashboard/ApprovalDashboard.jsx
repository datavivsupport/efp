import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import StatusCards from "../StatsCard/StatsCard";
import { Button, message, Tag, Select, Modal, Card as AntCard, Typography, Space } from "antd";
import { Chart } from "chart.js";
import CommonTable from "../Commontable/Commontable";
import "../Commontable/InvoiceTable.scss";
import { Icon } from "@iconify/react";
import apiClient from "../../api/apiclient";
import dayjs from "../../dayjs-config";

import { resolveApprovalRoute } from "../Approval/utils/resolveApprovalRoute";

const ApprovalDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const userRoles = (user?.roles || []).map(r => r.name?.toUpperCase());
  const userDepts = [
    ...(Array.isArray(user?.departments_assigned_names) ? user.departments_assigned_names : []),
    ...(Array.isArray(user?.department_names) ? user.department_names : []),
    user?.department || ""
  ].filter(Boolean).map(d => String(d).toUpperCase());

  const isAdmin = userRoles.some(r => ["ADMIN", "SUPER ADMIN"].includes(r));
  const isCS = userDepts.some(d => d.includes("CUSTOMER SERVICE") || d.includes("CS")) ||
    userRoles.some(r => r.includes("CS") || r.includes("DOCS") || r.includes("APPROVER") || r.includes("CUSTOMER SERVICE"));
  const isSales = userDepts.some(d => d.includes("SALES")) ||
    userRoles.some(r => r.includes("SALES") || r.includes("EXECUTIVE") || r.includes("UPLOADER"));
  const isHOD = userRoles.includes("HOD");
  const isSalesHOD = isSales && isHOD;
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
  const [reportsLoading, setReportsLoading] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [stats, setStats] = useState({ approved: 0, pending: 0, rejected: 0, total: 0 });
  const [topCarriers, setTopCarriers] = useState([]);
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [draftPage, setDraftPage] = useState(1);
  const [draftPageSize, setDraftPageSize] = useState(10);
  const [draftTotal, setDraftTotal] = useState(0);

  const jobTypes = [
    { label: "LINER", icon: "mdi:ship", color: "#17a2b8" },
    { label: "FORWARDING", icon: "mdi:truck-delivery", color: "#6366f1" },
    { label: "CROSS TRADE", icon: "mdi:swap-horizontal", color: "#f59e0b" },
    { label: "OTHERS", icon: "mdi:package-variant", color: "#6b7280" },
  ];

  const fetchReports = async (page = 1, size = 10, jobType = null, status = statusFilter) => {
    setReportsLoading(true);
    try {
      const params = { page, page_size: size };
      if (jobType) params.job_type = jobType;
      if (status) params.status = status;
      const reportsRes = await apiClient.get("/liner/sales-input/reports/", { params });
      if (reportsRes.data?.status === "success") {
        const responseData = reportsRes.data.data;
        const results = responseData.results || responseData;
        const count = responseData.count ?? results.length;
        setTotalRecords(count);
        setData(results.map(item => ({
          ...item,
          key: item.id.toString(),
          commodities_display: item.commodities?.map(c => c.name).join(", ") || "-",
          contact_details: item.phone_no || "-",
        })));
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchReportsOverview = async () => {
    try {
      const res = await apiClient.get("/liner/sales-input/get_reports_overview/");
      if (res.data?.status === "success") {
        const { total = 0, status_counts = {} } = res.data.data || {};
        setStats(prev => ({
          ...prev,
          approved: status_counts.approved ?? 0,
          pending: status_counts.submitted ?? 0,
          rejected: status_counts.rejected ?? 0,
          overdue: status_counts.draft ?? 0,
          total,
        }));
      }
    } catch (error) {
      console.error("Error fetching reports overview:", error);
    }
  };

  const fetchTopCarriers = async () => {
    try {
      const res = await apiClient.get("/liner/sales-input/top-carriers/");
      if (res.data?.status === "success") {
        setTopCarriers(res.data.data?.carriers || []);
      }
    } catch (error) {
      console.error("Error fetching top carriers:", error);
    }
  };

  const fetchDrafts = async (page = 1, size = 10) => {
    setDraftsLoading(true);
    try {
      const draftsRes = await apiClient.get("/liner/sales-input/draft/", { params: { page, page_size: size } });
      if (draftsRes.data?.status === "success") {
        const responseData = draftsRes.data.data;
        const results = responseData.results || responseData;
        const count = responseData.count ?? results.length;
        setDraftTotal(count);
        setDraftsData(results.map(item => ({
          ...item,
          key: item.id.toString(),
        })));
      }
    } catch (error) {
      console.error("Error fetching drafts:", error);
    } finally {
      setDraftsLoading(false);
    }
  };

useEffect(() => {
    fetchReports(1, pageSize, jobTypeFilter);
    fetchDrafts(1, draftPageSize);
    fetchReportsOverview();
    fetchTopCarriers();
  }, []);

  const handleTableChange = (pagination) => {
    const newPage = pagination.current;
    const newSize = pagination.pageSize;
    setCurrentPage(newPage);
    setPageSize(newSize);
    fetchReports(newPage, newSize, jobTypeFilter, statusFilter);
  };

  const handleStatusSelect = (status) => {
    const next = statusFilter === status ? "" : status;
    setStatusFilter(next);
    setCurrentPage(1);
    fetchReports(1, pageSize, jobTypeFilter, next);
  };

  const handleDraftTableChange = (pagination) => {
    const newPage = pagination.current;
    const newSize = pagination.pageSize;
    setDraftPage(newPage);
    setDraftPageSize(newSize);
    fetchDrafts(newPage, newSize);
  };

  const handleApprove = async (id) => {
    try {
      const res = await apiClient.post(`/liner/sales-input/${id}/approve/`);
      if (res.data?.status === "success") {
        message.success(res.data?.message || "Sales Input Approved");
      } else {
        message.error(res.data?.message || "Approval failed");
      }
      fetchReports(currentPage, pageSize, jobTypeFilter);
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to approve";
      message.error(errMsg);
      fetchReports(currentPage, pageSize, jobTypeFilter);
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
      fetchReports(currentPage, pageSize, jobTypeFilter);
    } catch (error) {
      const errMsg = error.response?.data?.message || "Failed to reject";
      message.error(errMsg);
      fetchReports(currentPage, pageSize, jobTypeFilter);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/liner/sales-input/${id}/`);
      message.success("Draft Deleted Successfully");
      fetchDrafts(draftPage, draftPageSize);
    } catch (error) {
      console.error("Delete Error:", error);
      message.error("Failed to delete draft");
    }
  };

  const handleSubmitDraft = async (id) => {
    try {
      await apiClient.post(`/liner/sales-input/${id}/submit/`);
      message.success("Sales Input Submitted Successfully");
      // Refresh both: draft moved to reports
      fetchDrafts(draftPage, draftPageSize);
      fetchReports(currentPage, pageSize, jobTypeFilter);
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
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => items[0]?.label ?? "",
                label: (item) => ` ${item.formattedValue} exports`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: "#f1f5f9" },
              ticks: { color: "#374151", font: { size: 12, weight: 500 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: "#f1f5f9" },
              ticks: { color: "#374151", font: { size: 12 }, precision: 0 },
            },
          },
        },
      });
    }

    // Status Chart
    const statusCtx = document.getElementById("statusChart");
    if (statusCtx) {
      statusChart = new Chart(statusCtx, {
        type: "doughnut",
        data: {
          labels: ["Approved", "AWAITING REVIEW", "Rejected"],
          datasets: [
            {
              data: [stats.approved, stats.pending, stats.rejected],
              backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
              borderWidth: 0,
              hoverOffset: 10,
              hoverBorderWidth: 2,
              hoverBorderColor: "#ffffff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "45%",
          interaction: { mode: "nearest", intersect: false },
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: (item) => {
                  const total = item.dataset.data.reduce((a, b) => a + (b || 0), 0);
                  const pct = total ? Math.round((item.parsed / total) * 100) : 0;
                  return ` ${item.label}: ${item.parsed} (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }

    // Carrier Chart
    const carrierCtx = document.getElementById("carrierChart");
    if (carrierCtx) {
      carrierChart = new Chart(carrierCtx, {
        type: "bar",
        data: {
          labels: topCarriers.map((c) => c.carrier_name || "-"),
          datasets: [
            {
              label: "Bookings",
              data: topCarriers.map((c) => c.job_count ?? 0),
              backgroundColor: "#17a2b8",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => items[0]?.label ?? "",
                label: (item) => ` ${item.formattedValue} bookings`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: "#374151",
                font: { size: 12, weight: 500 },
                autoSkip: false,
                maxRotation: 30,
                minRotation: 0,
                callback: function (value) {
                  const label = this.getLabelForValue(value);
                  return label.length > 14 ? `${label.slice(0, 13)}…` : label;
                },
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: "#f1f5f9" },
              ticks: { color: "#374151", font: { size: 12 }, precision: 0 },
            },
          },
        },
      });
    }

    // Cleanup function to destroy charts when component unmounts
    return () => {
      if (trendChart) trendChart.destroy();
      if (statusChart) statusChart.destroy();
      if (carrierChart) carrierChart.destroy();
    };
  }, [stats, topCarriers]);

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
       render: (text) => text || "-"
    },
    {
      title: "Job Type",
      dataIndex: "job_type",
      key: "job_type",
      render: (t) => (
        <Tag color={t === "OTHERS" ? "orange" : t === "LINER" ? "cyan" : "blue"}>
          {t || "N/A"}
        </Tag>
      ),
    },
    {
      title: "Carrier Name",
      dataIndex: "carrier_name",
      key: "carrier_name",
       render: (text) => text || "-"
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
       render: (text) => text || "-"
    },
    {
      title: "Carrier Name 2",
      dataIndex: "carrier_name_2",
      key: "carrier_name_2",
      render: (text) => text || "-"
    },
    {
      title: "Invoice Date",
      dataIndex: "invoice_date",
      key: "invoice_date",
      render: (d) => d ? dayjs(d).format("DD-MM-YYYY") : "-"
    },

    {
      title: "Created Date",
      dataIndex: "export_created_date",
      key: "export_created_date",
      render: (d) => d ? dayjs(d).format("DD-MM-YYYY") : "N/A"
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
        <Tag color={s === 'approved' ? 'success' : s === 'submitted' ? 'warning' : s === 'draft' ? 'default' : s === 'STOPPED' ? 'error' : 'error'}>
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
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-start", alignItems: "center" }}>
            <Button
              type="primary"
              size="small"
              icon={<Icon icon="mdi:eye" />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                let url = "";
                if (record.status === "draft") {
                  url = `${window.location.origin}/sales-input?id=${record.id}`;
                } else {
                  console.log(record)
                  const path = resolveApprovalRoute(record, user);
                  url = path ? `${window.location.origin}${path}` : `${window.location.origin}/approval?id=${record.id}`;
                }
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              View
            </Button>
            {/* {canAct && (
              <>
                <Button
                  type="primary"
                  size="small"
                  icon={<Icon icon="mdi:check-circle" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApprove(record.id);
                  }}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981', minWidth: 200 }}
                >
                  {record.job_type === 'FORWARDING' && record.current_stage === '2' ? (
                    isCS ? "Apply CS Updates" : (isSalesHOD ? "Approve (Sales HOD)" : "Approve")
                  ) : "Approve"}
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<Icon icon="mdi:close-circle" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    Modal.confirm({
                      title: "Reject Sales Input",
                      content: "Are you sure you want to reject this sales input?",
                      okText: "Reject",
                      okType: "danger",
                      cancelText: "Cancel",
                      onOk: () => handleReject(record.id),
                    });
                  }}
                >
                  Reject
                </Button>
              </>
            )} */}
          </div>
        );
      }
    },
  ];

  return (
    <div className="main-container" style={{ minHeight: "100vh" }}>
      {/* Main Content */}
      <main className="px-4 py-6" style={{ maxWidth: "100%" }}>
        {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>Dashboard Overview</Typography.Title>
        </div> */}

        <StatusCards stats={stats} activeStatus={statusFilter} onSelect={handleStatusSelect} />
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
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
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
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
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Icon icon="mdi:trophy-outline" color="#3b82f6" />
              Top Carriers Performance
            </h2>
          </div>
          <div className="h-72">
            <canvas id="carrierChart" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Icon icon="mdi:file-edit-outline" color="#f59e0b" />
              My Drafts
            </h2>
            <Tag color="orange">{draftTotal} Drafts</Tag>
          </div>
          <CommonTable
            rowClassName={(_, index) => (index % 2 === 1 ? "zebra-row" : "")}
            columns={[
              { title: "Customer", dataIndex: "customer_name", key: "customer", render: (text) => text || "-" },
              { title: "Carrier", dataIndex: "carrier_name", key: "carrier", render: (text) => text || "-" },
              { title: "Job Type", dataIndex: "job_type", key: "job_type", render: (t) => t?.toUpperCase() || "-" },
              { title: "Created", dataIndex: "created_at", key: "created", render: (d) => dayjs(d).format("DD-MM-YYYY") || "-" },
              {
                title: "Actions",
                key: "actions",
                align: "center",
                render: (_, record) => (
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                    <Button
                      type="primary"
                      icon={<Icon icon="mdi:eye" width="16" height="16" />}
                      style={{ minWidth: 92, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      onClick={(e) => {
                        e.preventDefault();
                        const url = `${window.location.origin}/sales-input?id=${record.id}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      View
                    </Button>
                    {/* <Button
                      size="small"
                      type="primary"
                      icon={<Icon icon="mdi:send" />}
                      onClick={() => {
                        Modal.confirm({
                          title: "Submit Draft",
                          content: "Are you sure you want to submit this draft for approval?",
                          okText: "Submit",
                          cancelText: "Cancel",
                          onOk: () => handleSubmitDraft(record.id),
                        });
                      }}
                      style={{ backgroundColor: '#6366f1' }}
                    >
                      Submit
                    </Button> */}
                    <Button
                      type="primary"
                      danger
                      icon={<Icon icon="mdi:delete" width="16" height="16" />}
                      style={{ minWidth: 92, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      onClick={() => {
                        Modal.confirm({
                          title: "Delete Draft",
                          content: "Are you sure you want to delete this draft? This action cannot be undone.",
                          okText: "Delete",
                          okType: "danger",
                          cancelText: "Cancel",
                          onOk: () => handleDelete(record.id),
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                )
              }
            ]}
            data={draftsData}
            loading={draftsLoading}
            yescomp={true}
            page={draftPage}
            total={draftTotal}
            pagesize={draftPageSize}
            onTableChange={handleDraftTableChange}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Icon icon="mdi:ship-wheel" color="#2d7a82" />
              Active Shipments & Approvals
            </h2>
            <Select
              style={{ width: 180 }}
              value={jobTypeFilter || "all"}
              onChange={(value) => {
                const newFilter = value === "all" ? "" : value;
                setJobTypeFilter(newFilter);
                setCurrentPage(1);
                fetchReports(1, pageSize, newFilter);
              }}
              options={[
                { label: "ALL", value: "all" },
                { label: "LINER", value: "LINER" },
                { label: "FORWARDING", value: "FORWARDING" },
                { label: "CROSS TRADE", value: "CROSS TRADE" },
                { label: "OTHERS", value: "OTHERS" },
              ]}
            />
          </div>
          <CommonTable
            columns={columns}
            rowClassName={(_, index) => (index % 2 === 1 ? "zebra-row" : "")}
            data={data}
            loading={reportsLoading}
            yescomp={true}
            page={currentPage}
            total={totalRecords}
            pagesize={pageSize}
            onTableChange={handleTableChange}
          />
        </div>
      </main>

      <Modal
        title={null}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
        centered
        styles={{ body: { padding: '24px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3}>Select Job Type</Typography.Title>
          <Typography.Text type="secondary">Choose the type of shipment you want to create</Typography.Text>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {jobTypes.map((type) => (
            <AntCard
              key={type.label}
              hoverable
              onClick={() => {
                setIsModalVisible(false);
                navigate(`/sales-input?type=${type.label}`);
              }}
              style={{ textAlign: 'center', borderRadius: 12, border: '2px solid #f3f4f6' }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: `${type.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: type.color
              }}>
                <Icon icon={type.icon} fontSize={28} />
              </div>
              <Typography.Text strong style={{ fontSize: 16 }}>{type.label}</Typography.Text>
            </AntCard>
          ))}
        </div>
      </Modal>
    </div>
  );
};
export default ApprovalDashboard;
