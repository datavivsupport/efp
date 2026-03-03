import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import StatusCards from "../StatsCard/StatsCard";
import { Button, message } from "antd";
import { Chart } from "chart.js";
import CommonTable from "../Commontable/Commontable";
import "../Commontable/InvoiceTable.scss";
import { Icon } from "@iconify/react";
// import { FileX } from "lucide-react";

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

  useEffect(() => {
    if (!hasShownMessage.current && location.state?.message) {
      hasShownMessage.current = true;

      message.success(location.state.message);

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

  const dummyData = [
    {
      key: "1",
      invoice_id: "BK001",
      document_type_name: "ABC Logistics",
      vendor_name: "Maersk",
      invoice_number: "NYC - LON",
      invoice_claim_amount: "2 x 40FT",
    },
    {
      key: "2",
      invoice_id: "BK002",
      document_type_name: "Global Trade Ltd",
      vendor_name: "MSC",
      invoice_number: "DXB - SIN",
      invoice_claim_amount: "1 x 20FT",
    },
    {
      key: "3",
      invoice_id: "BK003",
      document_type_name: "Ocean Freight Co",
      vendor_name: "CMA CGM",
      invoice_number: "LAX - SHA",
      invoice_claim_amount: "3 x 40FT",
    },
  ];

  const columns = [
    {
      title: "Booking Note",
      dataIndex: "invoice_id",
      key: "invoice_id",
      render: (text) => (
        <span style={{ fontWeight: 600, color: "#1f2937" }}>{text || "-"}</span>
      ),
    },
    {
      title: "Customer",
      dataIndex: "document_type_name",
      key: "document_type_name",
    },
    {
      title: "Carrier",
      dataIndex: "vendor_name",
      key: "vendor_name",
    },
    {
      title: "Route",
      dataIndex: "invoice_number",
      key: "invoice_number",
    },
    {
      title: "Equipment",
      dataIndex: "invoice_claim_amount",
      key: "invoice_claim_amount",
    },
    {
      title: "Documents",
      render: () => <span>-</span>,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            type="primary"
            size="small"
            icon={<Icon icon="mdi:tick-circle" size={10} />}
          >
            Approve
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<Icon icon="mdi:cross-circle" size={10} />}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="main-container">
      {/* Main Content */}
      <main className="mx-auto px-4 py-4">
        <StatusCards />
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Export Trends (Monthly)
              </h2>
            </div>
            <div className="h-64">
              <canvas id="trendChart" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Status Distribution
              </h2>
            </div>
            <div className="h-64">
              <canvas id="statusChart" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Carriers Performance
            </h2>
          </div>
          <div className="h-64">
            <canvas id="carrierChart" />
          </div>
        </div>

        <CommonTable
          columns={columns}
          data={dummyData}
          // loading={loading}
          yescomp={true}
          page={1}
          total={dummyData.length}
          pagesize={10}
        />
      </main>
    </div>
  );
};
export default ApprovalDashboard;
