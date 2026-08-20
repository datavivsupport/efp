import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import StatusCards from "../StatsCard/StatsCard";
import { Button, message, Tag, Select, Modal, Card as AntCard, Typography, Space, DatePicker } from "antd";
import { Chart } from "chart.js";
import CommonTable from "../Commontable/Commontable";
import "../Commontable/InvoiceTable.scss";
import { Icon } from "@iconify/react";
import apiClient from "../../api/apiclient";
import dayjs from "../../dayjs-config";

import { resolveApprovalRoute } from "../Approval/utils/resolveApprovalRoute";

const { RangePicker } = DatePicker;

const DATE_PRESETS = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 1 Month", value: "1m" },
  { label: "Last 3 Months", value: "3m" },
];

const DEFAULT_PRESET = "1m";

const resolvePresetRange = (preset) => {
  const today = dayjs();
  switch (preset) {
    case "7d": return [today.subtract(6, "day"), today];
    case "1m": return [today.subtract(1, "month").add(1, "day"), today];
   
    case "3m": return [today.subtract(2, "month").startOf("month"), today];
    default: return null;
  }
};

const GRANULARITY_LABEL = { day: "Daily", week: "Weekly", month: "Monthly" };
 
const formatBucketRange = (bucketStart, bucketEnd, period) => {
  if (!bucketStart || !bucketEnd) return "";
  let from = dayjs(bucketStart);
  let to = dayjs(bucketEnd);
  if (period?.start && from.isBefore(period.start, "day")) from = period.start;
  if (period?.end && to.isAfter(period.end, "day")) to = period.end;
  return `${from.format("DD MMM")} – ${to.format("DD MMM YYYY")}`;
};

 
const REJECTED_STATUSES = [
  "rejected",
  "CS-REJECTED",
  "CNF-REJECTED",
  "CSHOD-REJECTED",
  "ACCOUNTS-REJECTED",
  "REJECTED-CLOSED",
];
const COMPLETED_STATUSES = ["approved"];

const sumStatuses = (counts, keys) =>
  keys.reduce((total, key) => total + (counts?.[key] || 0), 0);

const TREND_LINES = [
  { key: "created", label: "Created", color: "#6366f1" },
  { key: "completed", label: "Completed", color: "#10b981" },
  { key: "rejected", label: "Rejected", color: "#ef4444" },
];


const TREND_POINT_WIDTH = 90;

 
const CARRIER_MODAL_LIMIT = 50;
 
const CARRIER_ROW_HEIGHT = 34;


const buildTrendConfig = ({ labels, data, showFullLabels = false }) => ({
  type: "line",
  data: {
    labels,
    datasets: TREND_LINES.map(({ key, label, color }) => ({
      label,
      data: data[key],
      borderColor: color,
      backgroundColor: color,
      pointBackgroundColor: color,
      pointRadius: showFullLabels ? 4 : 3,
      pointHoverRadius: showFullLabels ? 6 : 5,
      borderWidth: 2,
      tension: 0.4,
      fill: false,
    })),
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    layout: showFullLabels ? { padding: { left: 12, right: 24, bottom: 12 } } : {},
    plugins: {
      legend: showFullLabels
        ? { display: false }
        : {
            display: true,
            position: "bottom",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 8,
              padding: 16,
              color: "#374151",
              font: { size: 12, weight: 500 },
            },
          },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label ?? "",
          label: (item) => ` ${item.dataset.label}: ${item.formattedValue}`,
          footer: (items) => {
            const created = items.find((i) => i.dataset.label === "Created");
            return created ? `Total created: ${created.formattedValue}` : "";
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#374151",
          font: { size: showFullLabels ? 12 : 12, weight: 500 },
          maxRotation: showFullLabels ? 45 : 0,
          minRotation: showFullLabels ? 45 : 0,
          autoSkip: !showFullLabels,
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
 
const useDateFilter = () => {
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [range, setRange] = useState(null);

 
  const resolved = useMemo(
    () => (preset === "custom" ? range : resolvePresetRange(preset)),
    [preset, range],
  );


  const params = useMemo(() => {
    if (!resolved?.[0] || !resolved?.[1]) return {};
    return {
      created_at_gte: dayjs(resolved[0]).format("YYYY-MM-DD"),
      created_at_lte: dayjs(resolved[1]).format("YYYY-MM-DD"),
    };
  }, [resolved]);

  const onPresetChange = (value) => {
    setPreset(value);
    if (value !== "custom") setRange(null);
  };

  return { preset, range, resolved, params, onPresetChange, onRangeChange: setRange };
};

const ChartDateFilter = ({ filter }) => (
  <div className="flex flex-wrap items-center gap-2">
    <Select
      size="small"
      style={{ width: 150 }}
      value={filter.preset}
      onChange={filter.onPresetChange}
      options={DATE_PRESETS}
    />
    {filter.preset === "custom" && (
      <RangePicker
        size="small"
        value={filter.range}
        onChange={filter.onRangeChange}
        format="DD-MM-YYYY"
        placeholder={["From date", "To date"]}
        disabledDate={(d) => d && d > dayjs().endOf("day")}
      />
    )}
  </div>
);

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

 
  const trendReqRef = useRef(0);
  const statusDistReqRef = useRef(0);
  const carrierReqRef = useRef(0);
  const allCarrierReqRef = useRef(0);

  const [data, setData] = useState([]);
  const [draftsData, setDraftsData] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [stats, setStats] = useState({ approved: 0, pending: 0, rejected: 0, total: 0 });
 
  const [statusDist, setStatusDist] = useState({ approved: 0, pending: 0, rejected: 0 });
  const [topCarriers, setTopCarriers] = useState([]);
  const [exportTrends, setExportTrends] = useState({
    labels: [], exports: [], series: [], granularity: null, start_date: null, end_date: null, total: 0,
  });
  const trendDate = useDateFilter();
  const statusDate = useDateFilter();
  const carrierDate = useDateFilter();
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [trendModalOpen, setTrendModalOpen] = useState(false);
  const [trendModalHeight, setTrendModalHeight] = useState(500);
  // Held in state, not a ref, so mounting the canvas re-triggers the chart effect.
  const [trendModalCanvas, setTrendModalCanvas] = useState(null);
  const [carrierModalOpen, setCarrierModalOpen] = useState(false);
  const [carrierModalHeight, setCarrierModalHeight] = useState(500);
  const [allCarriersLoading, setAllCarriersLoading] = useState(false);
  // Kept apart from `topCarriers` so opening the modal never disturbs the card.
  const [allCarriers, setAllCarriers] = useState({
    carriers: [], total_carriers: 0, total_jobs: 0, others: null, unspecified: 0,
  });
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

 
  const statusDateApplied = Boolean(statusDate.params.created_at_gte);
  const distribution = statusDateApplied ? statusDist : stats;

 
  const trendData = useMemo(() => {
    const rows = exportTrends.series || [];
    if (!rows.length) {
      return { created: exportTrends.exports || [], completed: [], rejected: [] };
    }
    return {
      created: rows.map((r) => r.exports ?? 0),
      completed: rows.map((r) => sumStatuses(r.status_counts, COMPLETED_STATUSES)),
      rejected: rows.map((r) => sumStatuses(r.status_counts, REJECTED_STATUSES)),
    };
  }, [exportTrends.series, exportTrends.exports]);

 
  const openTrendModal = () => {
    setTrendModalHeight(Math.floor(window.innerHeight * 0.9) - 220);
    setTrendModalOpen(true);
  };

  useEffect(() => {
    if (!trendModalOpen) return;
    const recalc = () => setTrendModalHeight(Math.floor(window.innerHeight * 0.9) - 220);
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [trendModalOpen]);

 
  const openCarrierModal = () => {
    setCarrierModalHeight(Math.floor(window.innerHeight * 0.9) - 220);
    setCarrierModalOpen(true);
  };

  useEffect(() => {
    if (!carrierModalOpen) return;
    fetchAllCarriers(carrierDate.params);
  }, [carrierModalOpen, carrierDate.params]);

  useEffect(() => {
    if (!carrierModalOpen) return;
    const recalc = () => setCarrierModalHeight(Math.floor(window.innerHeight * 0.9) - 220);
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [carrierModalOpen]);

  const trendTotals = useMemo(
    () => ({
      created: trendData.created.reduce((a, b) => a + b, 0),
      completed: trendData.completed.reduce((a, b) => a + b, 0),
      rejected: trendData.rejected.reduce((a, b) => a + b, 0),
    }),
    [trendData],
  );

  
  const trendChartHeight = Math.max(280, Math.round(trendModalHeight * 0.62));
  const trendTableHeight = Math.max(160, trendModalHeight - trendChartHeight - 48);

   
  const carrierPlotHeight = Math.max(320, allCarriers.carriers.length * CARRIER_ROW_HEIGHT);
  const carrierViewportHeight = Math.max(280, Math.round(carrierModalHeight * 0.6));
  const carrierTableHeight = Math.max(160, carrierModalHeight - carrierViewportHeight - 48);

  // What the filter asked for wins over the API echo, which snaps to bucket edges.
  const trendPeriod = useMemo(() => {
    const [from, to] = trendDate.resolved || [];
    return {
      start: from ? dayjs(from) : exportTrends.start_date ? dayjs(exportTrends.start_date) : null,
      end: to ? dayjs(to) : exportTrends.end_date ? dayjs(exportTrends.end_date) : null,
    };
  }, [trendDate.resolved, exportTrends.start_date, exportTrends.end_date]);

  // Every bucket the API returned, flattened for the detail table.
  const trendRows = useMemo(
    () =>
      (exportTrends.series || []).map((row, index) => ({
        key: index,
        label: row.label,
        range: formatBucketRange(row.bucket_start, row.bucket_end, trendPeriod),
        created: row.exports ?? 0,
        completed: sumStatuses(row.status_counts, COMPLETED_STATUSES),
        rejected: sumStatuses(row.status_counts, REJECTED_STATUSES),
      })),
    [exportTrends.series, trendPeriod],
  );

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

  const fetchStatusCounts = async (params = {}) => {
    const res = await apiClient.get("/liner/sales-input/get_reports_overview/", { params });
    if (res.data?.status !== "success") return null;
    const { total = 0, status_counts = {} } = res.data.data || {};
    return {
      approved: status_counts.approved ?? 0,
      pending: status_counts.submitted ?? 0,
      rejected: status_counts.rejected ?? 0,
      overdue: status_counts.draft ?? 0,
      total,
    };
  };

  const fetchReportsOverview = async () => {
    try {
      const counts = await fetchStatusCounts();
      if (counts) setStats(prev => ({ ...prev, ...counts }));
    } catch (error) {
      console.error("Error fetching reports overview:", error);
    }
  };

  const fetchStatusDistribution = async (params = {}) => {
    const reqId = ++statusDistReqRef.current;
    try {
      const counts = await fetchStatusCounts(params);
      if (reqId !== statusDistReqRef.current) return; // superseded
      if (counts) setStatusDist(counts);
    } catch (error) {
      if (reqId === statusDistReqRef.current) console.error("Error fetching status distribution:", error);
    }
  };

  const fetchTopCarriers = async (params = {}) => {
    const reqId = ++carrierReqRef.current;
    try {
      const res = await apiClient.get("/liner/sales-input/top-carriers/", { params });
      if (reqId !== carrierReqRef.current) return; // superseded
      if (res.data?.status === "success") {
        setTopCarriers(res.data.data?.carriers || []);
      }
    } catch (error) {
      if (reqId === carrierReqRef.current) console.error("Error fetching top carriers:", error);
    }
  };

  // Full carrier list for the modal only — the card keeps its top 6 untouched.
  const fetchAllCarriers = async (params = {}) => {
    const reqId = ++allCarrierReqRef.current;
    setAllCarriersLoading(true);
    try {
      const res = await apiClient.get("/liner/sales-input/top-carriers/", {
        params: { ...params, limit: CARRIER_MODAL_LIMIT },
      });
      if (reqId !== allCarrierReqRef.current) return; // superseded
      if (res.data?.status === "success") {
        const payload = res.data.data || {};
        setAllCarriers({
          carriers: payload.carriers || [],
          total_carriers: payload.total_carriers ?? 0,
          total_jobs: payload.total_jobs ?? 0,
          others: payload.others || null,
          unspecified: payload.unspecified ?? 0,
        });
      }
    } catch (error) {
      if (reqId === allCarrierReqRef.current) console.error("Error fetching all carriers:", error);
    } finally {
      if (reqId === allCarrierReqRef.current) setAllCarriersLoading(false);
    }
  };

  const fetchExportTrends = async (params = {}) => {
    const reqId = ++trendReqRef.current;
    try {
      const res = await apiClient.get("/liner/sales-input/export-trends/", { params });
      if (reqId !== trendReqRef.current) return; // superseded by a newer period
      if (res.data?.status === "success") {
        const {
          labels = [], exports = [], series = [], granularity = null,
          start_date = null, end_date = null, total = 0,
        } = res.data.data || {};
        setExportTrends({ labels, exports, series, granularity, start_date, end_date, total });
      }
    } catch (error) {
      if (reqId === trendReqRef.current) console.error("Error fetching export trends:", error);
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
  }, []);

  useEffect(() => {
    fetchExportTrends(trendDate.params);
  }, [trendDate.params]);

  useEffect(() => {
    if (statusDateApplied) fetchStatusDistribution(statusDate.params);
  }, [statusDate.params, statusDateApplied]);

  useEffect(() => {
    fetchTopCarriers(carrierDate.params);
  }, [carrierDate.params]);

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
    const trendCtx = document.getElementById("trendChart");
    if (!trendCtx) return;
    const trendChart = new Chart(
      trendCtx,
      buildTrendConfig({ labels: exportTrends.labels, data: trendData }),
    );
    return () => trendChart.destroy();
  }, [exportTrends.labels, trendData]);

  useEffect(() => {
    const statusCtx = document.getElementById("statusChart");
    if (statusCtx) {
      const statusChart = new Chart(statusCtx, {
        type: "doughnut",
        data: {
          labels: ["Approved", "AWAITING REVIEW", "Rejected"],
          datasets: [
            {
              data: [distribution.approved, distribution.pending, distribution.rejected],
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
      return () => statusChart.destroy();
    }
  }, [distribution]);

  useEffect(() => {
    const carrierCtx = document.getElementById("carrierChart");
    if (carrierCtx) {
      const carrierChart = new Chart(carrierCtx, {
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
      return () => carrierChart.destroy();
    }
  }, [topCarriers]);

  // antd keeps the dialog body out of the DOM until its open animation starts, so the
  // canvas does not exist yet on the render that flips `trendModalOpen`. Looking it up
  // by id here found nothing and never ran again — hence the blank expanded chart.
  // Tracking the node itself re-runs this the moment the canvas actually mounts.
  useEffect(() => {
    if (!trendModalOpen || !trendModalCanvas) return;

    const chart = new Chart(
      trendModalCanvas,
      buildTrendConfig({
        labels: exportTrends.labels,
        data: trendData,
        showFullLabels: true,
      }),
    );
    return () => chart.destroy();
  }, [trendModalOpen, trendModalCanvas, exportTrends.labels, trendData, trendModalHeight]);

 
  useEffect(() => {
    if (!carrierModalOpen) return;
    const ctx = document.getElementById("carrierChartModal");
    if (!ctx) return;

    const rows = allCarriers.carriers;
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: rows.map((c) => c.carrier_name || "-"),
        datasets: [
          {
            label: "Jobs",
            data: rows.map((c) => c.job_count ?? 0),
            backgroundColor: "#17a2b8",
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => items[0]?.label ?? "",
              label: (item) =>
                ` ${item.formattedValue} jobs · ${rows[item.dataIndex]?.share_percent ?? 0}% of total`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: "Jobs", color: "#475569", font: { size: 12, weight: 600 } },
            grid: { color: "#f1f5f9" },
            ticks: { color: "#374151", font: { size: 12 }, precision: 0 },
          },
          y: {
            title: { display: true, text: "Carrier", color: "#475569", font: { size: 12, weight: 600 } },
            grid: { display: false },
            ticks: { color: "#374151", font: { size: 12 }, autoSkip: false },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [carrierModalOpen, allCarriers, carrierModalHeight]);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Icon icon="mdi:chart-line" color="#6366f1" />
                  Export Trends ({GRANULARITY_LABEL[exportTrends.granularity] || "Monthly"})
                </h2>
                {trendPeriod.start && trendPeriod.end && (
                  <span className="text-xs text-gray-500">
                    {trendPeriod.start.format("DD MMM YYYY")} – {trendPeriod.end.format("DD MMM YYYY")}
                    {" · "}
                    <span style={{ color: "#6366f1", fontWeight: 600 }}>{trendTotals.created} created</span>
                    {" · "}
                    <span style={{ color: "#10b981", fontWeight: 600 }}>{trendTotals.completed} completed</span>
                    {" · "}
                    <span style={{ color: "#ef4444", fontWeight: 600 }}>{trendTotals.rejected} rejected</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ChartDateFilter filter={trendDate} />
                <Button
                  size="small"
                  onClick={openTrendModal}
                  title="View detailed data"
                  icon={<Icon icon="mdi:arrow-expand-all" width="16" height="16" />}
                />
              </div>
            </div>
            <div className="h-80">
              <canvas id="trendChart" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Icon icon="mdi:chart-pie" color="#10b981" />
                Status Distribution
              </h2>
              <ChartDateFilter filter={statusDate} />
            </div>
            <div className="h-56">
              <canvas id="statusChart" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 mb-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Icon icon="mdi:trophy-outline" color="#3b82f6" />
              Top Carriers Performance
              <span className="text-xs font-normal text-gray-500">(Top 6)</span>
            </h2>
            <div className="flex items-center gap-2">
              <ChartDateFilter filter={carrierDate} />
              <Button
                size="small"
                onClick={openCarrierModal}
                title="View all carriers"
                icon={<Icon icon="mdi:arrow-expand-all" width="16" height="16" />}
              >
                View All
              </Button>
            </div>
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

      {/* All carriers — the card is capped at the API's default top 6 */}
      <Modal
        open={carrierModalOpen}
        onCancel={() => setCarrierModalOpen(false)}
        footer={null}
        width="98vw"
        style={{ top: 20 }}
        title={
          <span className="flex items-center gap-2">
            <Icon icon="mdi:trophy-outline" color="#3b82f6" />
            Carrier Performance — All Carriers
          </span>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">
                Showing {allCarriers.carriers.length}
                {allCarriers.total_carriers > allCarriers.carriers.length
                  ? ` of ${allCarriers.total_carriers}`
                  : ""}{" "}
                carriers
              </div>
              <span className="text-xs text-gray-500">
                {allCarriers.total_jobs} jobs in the selected period
                {allCarriers.total_carriers > CARRIER_MODAL_LIMIT && (
                  <> · capped at the server maximum of {CARRIER_MODAL_LIMIT}</>
                )}
              </span>
            </div>
            <ChartDateFilter filter={carrierDate} />
          </div>

          {/* Scrolls vertically as carriers grow, horizontally on narrow screens */}
          <div
            style={{
              height: carrierViewportHeight,
              overflow: "auto",
              border: "1px solid #f1f5f9",
              borderRadius: 8,
              padding: 8,
            }}
          >
            <div style={{ height: carrierPlotHeight, minWidth: 720 }}>
              <canvas id="carrierChartModal" />
            </div>
          </div>

          {/* Exact figures, including what fell outside the ranked list */}
          <div
            style={{
              maxHeight: carrierTableHeight,
              overflow: "auto",
              border: "1px solid #f1f5f9",
              borderRadius: 8,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, zIndex: 1, background: "#f8fafc" }}>
                  {["#", "Carrier", "Jobs", "Share"].map((heading, i) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: i >= 2 ? "right" : "left",
                        padding: "8px 14px", color: "#475569", fontWeight: 600,
                        whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allCarriers.carriers.map((row, index) => (
                  <tr key={`${row.carrier_name}-${index}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 14px", color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{index + 1}</td>
                    <td style={{ padding: "7px 14px", fontWeight: 600, color: "#1f2937" }}>{row.carrier_name || "-"}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#17a2b8", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{row.job_count}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#64748b", fontVariantNumeric: "tabular-nums" }}>{row.share_percent}%</td>
                  </tr>
                ))}
                {allCarriers.others?.carrier_count > 0 && (
                  <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#fafafa" }}>
                    <td style={{ padding: "7px 14px", color: "#94a3b8" }}>—</td>
                    <td style={{ padding: "7px 14px", color: "#64748b", fontStyle: "italic" }}>
                      Other carriers ({allCarriers.others.carrier_count})
                    </td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#64748b", fontVariantNumeric: "tabular-nums" }}>{allCarriers.others.job_count}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#94a3b8" }}>—</td>
                  </tr>
                )}
                {allCarriers.unspecified > 0 && (
                  <tr style={{ background: "#fafafa" }}>
                    <td style={{ padding: "7px 14px", color: "#94a3b8" }}>—</td>
                    <td style={{ padding: "7px 14px", color: "#64748b", fontStyle: "italic" }}>No carrier recorded</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#64748b", fontVariantNumeric: "tabular-nums" }}>{allCarriers.unspecified}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#94a3b8" }}>—</td>
                  </tr>
                )}
                {!allCarriersLoading && allCarriers.carriers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                      No carrier data for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Expanded Export Trends — enlarged chart + the full bucket dataset */}
      <Modal
        open={trendModalOpen}
        onCancel={() => setTrendModalOpen(false)}
        footer={null}
        width="98vw"
        style={{ top: 20 }}
        // Drop the body on close so each open remounts the canvas into a laid-out,
        // visible container — otherwise a reopen rebuilds the chart at zero size.
        destroyOnHidden
        title={
          <span className="flex items-center gap-2">
            <Icon icon="mdi:chart-line" color="#6366f1" />
            Export Trends — Detailed Data
          </span>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Active period + the same filter instance, so the selection carries in */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800">
                {GRANULARITY_LABEL[exportTrends.granularity] || "Monthly"} view
                {exportTrends.labels.length > 0 && (
                  <span className="text-gray-500 font-normal">
                    {" · "}{exportTrends.labels.length} data points
                  </span>
                )}
              </div>
              {trendPeriod.start && trendPeriod.end && (
                <span className="text-xs text-gray-500">
                  {trendPeriod.start.format("DD MMM YYYY")} – {trendPeriod.end.format("DD MMM YYYY")}
                </span>
              )}
            </div>
            <ChartDateFilter filter={trendDate} />
          </div>

          {/* Legend lives outside the scroll area so it stays visible */}
          <div className="flex flex-wrap items-center gap-6 border-y border-gray-100 py-2">
            {TREND_LINES.map(({ key, label, color }) => (
              <span key={key} className="flex items-center gap-2 text-sm">
                <span
                  style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: color, display: "inline-block", flex: "none",
                  }}
                />
                <span style={{ color: "#374151", fontWeight: 500 }}>{label}</span>
                <span style={{ color, fontWeight: 700 }}>{trendTotals[key]}</span>
              </span>
            ))}
          </div>

          {/* Scrolls horizontally once the buckets outgrow the width */}
          <div
            style={{
              overflowX: "auto", overflowY: "hidden",
              border: "1px solid #f1f5f9", borderRadius: 8, padding: 8,
            }}
          >
            <div
              style={{
                height: trendChartHeight,
                minWidth: Math.max(640, exportTrends.labels.length * TREND_POINT_WIDTH),
              }}
            >
              <canvas id="trendChartModal" ref={setTrendModalCanvas} />
            </div>
          </div>

          {/* Complete dataset, scrolls vertically with a sticky header */}
          <div
            style={{
              maxHeight: trendTableHeight, overflow: "auto",
              border: "1px solid #f1f5f9", borderRadius: 8,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, zIndex: 1, background: "#f8fafc" }}>
                  {["Period", "Date range", "Created", "Completed", "Rejected"].map((heading, i) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: i > 1 ? "right" : "left",
                        padding: "8px 14px", color: "#475569", fontWeight: 600,
                        whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trendRows.map((row) => (
                  <tr key={row.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 14px", fontWeight: 600, color: "#1f2937", whiteSpace: "nowrap" }}>{row.label}</td>
                    <td style={{ padding: "7px 14px", color: "#64748b", whiteSpace: "nowrap" }}>{row.range}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#6366f1", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{row.created}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#10b981", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{row.completed}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right", color: "#ef4444", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{row.rejected}</td>
                  </tr>
                ))}
                {trendRows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                      No export data for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

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
