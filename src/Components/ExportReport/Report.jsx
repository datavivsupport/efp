import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import apiClient from "../../api/apiclient";
import dayjs from "dayjs";
import { Spin, Empty, message, Tag, Select, Input, Button, DatePicker } from "antd";
import CommonTable from "../Commontable/Commontable";
import { Icon } from "@iconify/react";
import { resolveApprovalRoute } from "../Approval/utils/resolveApprovalRoute";

const { Option } = Select;

const EMPTY_FILTERS = {
  jobType: "",
  exportNumber: "",
  createdAtFrom: null,
  createdAtTo: null,
  createdBy: "",
  carrier: "",
  customerName: "",
  afsysJobNo: "",
  bookingRef: "",
  salesName: "",
  pol: "",
  fpod: "",
  pendingWith: "all",
};

const ExportReport = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [jobType, setJobType] = useState("");
  const [exportNumber, setExportNumber] = useState("");
  const [createdAtFrom, setCreatedAtFrom] = useState(null);
  const [createdAtTo, setCreatedAtTo] = useState(null);
  const [createdBy, setCreatedBy] = useState("");
  const [carrier, setCarrier] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [afsysJobNo, setAfsysJobNo] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [salesName, setSalesName] = useState("");
  const [pol, setPol] = useState("");
  const [fpod, setFpod] = useState("");
  const [pendingWith, setPendingWith] = useState("all");

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [pendingWith, currentPage, pageSize]);

  const buildUrl = (page, size, overrides = {}) => {
    const get = (key, fallback) =>
      overrides[key] !== undefined ? overrides[key] : fallback;

    const jType = get("jobType", jobType);
    const expNo = get("exportNumber", exportNumber);
    const cAtFrom = get("createdAtFrom", createdAtFrom);
    const cAtTo = get("createdAtTo", createdAtTo);
    const cBy = get("createdBy", createdBy);
    const carr = get("carrier", carrier);
    const custName = get("customerName", customerName);
    const afsys = get("afsysJobNo", afsysJobNo);
    const bkRef = get("bookingRef", bookingRef);
    const sales = get("salesName", salesName);
    const polVal = get("pol", pol);
    const fpodVal = get("fpod", fpod);
    const pWith = get("pendingWith", pendingWith);

    let url = `/liner/sales-input/reports/?page=${page}&page_size=${size}`;
    if (pWith && pWith !== "all") url += `&pending_with=${encodeURIComponent(pWith)}`;
    if (jType) url += `&job_type=${encodeURIComponent(jType)}`;
    if (expNo) url += `&export_number=${encodeURIComponent(expNo)}`;
    if (cAtFrom) url += `&created_at_gte=${dayjs(cAtFrom).format("YYYY-MM-DD")}`;
    if (cAtTo) url += `&created_at_lte=${dayjs(cAtTo).format("YYYY-MM-DD")}`;
    if (cBy) url += `&created_by=${encodeURIComponent(cBy)}`;
    if (carr) url += `&carrier=${encodeURIComponent(carr)}`;
    if (custName) url += `&customer_name=${encodeURIComponent(custName)}`;
    if (afsys) url += `&afsys_job_no=${encodeURIComponent(afsys)}`;
    if (bkRef) url += `&booking_ref=${encodeURIComponent(bkRef)}`;
    if (sales) url += `&sales_name=${encodeURIComponent(sales)}`;
    if (polVal) url += `&pol=${encodeURIComponent(polVal)}`;
    if (fpodVal) url += `&fpod=${encodeURIComponent(fpodVal)}`;
    return url;
  };

  const fetchData = async (page = 1, size = 10, overrides = {}) => {
    setLoading(true);
    try {
      const url = buildUrl(page, size, overrides);
      const response = await apiClient.get(url);
      if (response.data.status === "success") {
        const resultData = response.data.data.results || response.data.data || [];
        setData(resultData.map((r) => ({ ...r, key: r.id })));
        setTotal(response.data.data.count || resultData.length);
        setCurrentPage(response.data.data.current_page || 1);
        setPageSize(response.data.data.page_size || size);
      }
    } catch (err) {
      message.error("Failed to fetch export reports");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchData(1, pageSize);
  };

  const handleClear = () => {
    setJobType("");
    setExportNumber("");
    setCreatedAtFrom(null);
    setCreatedAtTo(null);
    setCreatedBy("");
    setCarrier("");
    setCustomerName("");
    setAfsysJobNo("");
    setBookingRef("");
    setSalesName("");
    setPol("");
    setFpod("");
    setPendingWith("all");
    setCurrentPage(1);
    fetchData(1, pageSize, EMPTY_FILTERS);
  };

  const handleTableChange = (pagination) => {
    const { current, pageSize: ps } = pagination;
    setCurrentPage(current);
    setPageSize(ps);
    fetchData(current, ps);
  };

  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
  const colCls = "flex flex-col";

  return (
    <div className="px-4 py-4" style={{ maxWidth: "100%" }}>
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Header */}
        <div style={{ backgroundColor: "#1b9cac" }} className="px-6 py-3 flex gap-4">
          <h3 className="text-xl font-bold text-white">EXPORT REPORT</h3>
          <p className="text-white/70 text-sm mt-1">Export forwarding status overview</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Filters */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-bold text-gray-700 mb-3">Filters</p>

            {/* Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px 16px", marginBottom: 12 }}>
              <div className={colCls}>
                <label className={labelCls}>Job Type</label>
                <Select value={jobType || undefined} onChange={setJobType} placeholder="All" allowClear className="w-full">
                  <Option value="LINER">LINER</Option>
                  <Option value="FORWARDING">FORWARDING</Option>
                  <Option value="OTHERS">OTHERS</Option>
                </Select>
              </div>

              <div className={colCls}>
                <label className={labelCls}>Export No (DMS)</label>
                <Input
                  placeholder="e.g. EXP-FWD-001"
                  value={exportNumber}
                  onChange={(e) => setExportNumber(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </div>

              <div className={colCls}>
                <label className={labelCls}>Created By</label>
                <Input
                  placeholder="Name"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </div>

              <div className={colCls}>
                <label className={labelCls}>Carrier</label>
                <Input
                  placeholder="e.g. Maersk"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </div>

              <div className={colCls}>
                <label className={labelCls}>Customer Name</label>
                <Input
                  placeholder="e.g. ABC Corp"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </div>

              <div className={colCls}>
                <label className={labelCls}>Afsys Job No.</label>
                <Input
                  placeholder="e.g. AF123"
                  value={afsysJobNo}
                  onChange={(e) => setAfsysJobNo(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </div>

              <div className={colCls}>
                <label className={labelCls}>Booking Ref #</label>
                <Input
                  placeholder="e.g. BK001"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </div>

              <div className={colCls}>
                <label className={labelCls}>Sales Name</label>
                <Input
                  placeholder="e.g. Jane"
                  value={salesName}
                  onChange={(e) => setSalesName(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </div>

              <div className={colCls}>
                <label className={labelCls}>POL</label>
                <Input
                  placeholder="e.g. Dubai"
                  value={pol}
                  onChange={(e) => setPol(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </div>

              <div className={colCls}>
                <label className={labelCls}>FPOD</label>
                <Input
                  placeholder="e.g. Singapore"
                  value={fpod}
                  onChange={(e) => setFpod(e.target.value)}
                  onPressEnter={handleSearch}
                />
              </div>

              <div className={colCls}>
                <label className={labelCls}>Pending With</label>
                <Select value={pendingWith} onChange={setPendingWith} className="w-full">
                  <Option value="all">All</Option>
                  <Option value="SALES HOD">Sales HOD</Option>
                  <Option value="CS">CS Team</Option>
                  <Option value="CNF">CNF Team</Option>
                  <Option value="CS HOD">CS HOD</Option>
                  <Option value="ACCOUNTS">Accounts</Option>
                  <Option value="WORKFLOW COMPLETED">Workflow Completed</Option>
                </Select>
              </div>
            </div>

            {/* Row 2 — date range + actions */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className={colCls}>
                <label className={labelCls}>Created Date (From)</label>
                <DatePicker
                  value={createdAtFrom}
                  onChange={setCreatedAtFrom}
                  format="DD-MM-YYYY"
                  placeholder="From date"
                  style={{ width: 160 }}
                />
              </div>

              <div className={colCls}>
                <label className={labelCls}>Created Date (To)</label>
                <DatePicker
                  value={createdAtTo}
                  onChange={setCreatedAtTo}
                  format="DD-MM-YYYY"
                  placeholder="To date"
                  style={{ width: 160 }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <Button
                  icon={<Icon icon="cil:search" />}
                  type="primary"
                  onClick={handleSearch}
                  style={{ backgroundColor: "#1b9cac", borderColor: "#1b9cac" }}
                >
                  Search
                </Button>
                <Button icon={<Icon icon="pajamas:clear" />} onClick={handleClear}>
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <section>
            <div className="flex mb-4 pb-2 border-b-2 border-gray-200 justify-between items-center">
              <h4 className="text-lg font-semibold text-gray-800">EXPORT DETAILS</h4>
              {total > 0 && (
                <span className="text-sm text-gray-500">{total} record{total !== 1 ? "s" : ""} found</span>
              )}
            </div>

            <CommonTable
              columns={[
                { title: "Export No", dataIndex: "export_number", key: "export_number", render: (v) => <span style={{ fontWeight: 600, color: "#0d9488" }}>{v || "N/A (Draft)"}</span> },
                { title: "Created Date", dataIndex: "export_created_date", key: "export_created_date", render: (d) => d ? dayjs(d).format("DD-MM-YYYY") : "-" },
                { title: "Created By", dataIndex: "created_by_name", key: "created_by_name", render: (v) => v || "-" },
                { title: "Carrier", dataIndex: "carrier_name", key: "carrier_name", render: (text) => text || "-" },
                { title: "Customer", dataIndex: "customer_name", key: "customer_name", render: (text) => text || "-" },
                { title: "Job No (AFSYS)", dataIndex: "afsys_job_no", key: "afsys_job_no", render: (v) => <span style={{ fontFamily: "monospace" }}>{v || "-"}</span> },
                { title: "Booking Ref", dataIndex: "booking_ref_no", key: "booking_ref_no", render: (v) => <span style={{ fontFamily: "monospace" }}>{v || "-"}</span> },
                { title: "Pending With", dataIndex: "pending_with", key: "pending_with", render: (v) => <Tag color="blue">{v || "-"}</Tag> },
                {
                  title: "Status", dataIndex: "status", key: "status",
                  render: (v) => (
                    <Tag color={v === "approved" ? "green" : v === "submitted" || v === "pending" ? "orange" : v === "draft" ? "default" : "red"}>
                      {v?.toUpperCase() || "-"}
                    </Tag>
                  ),
                },
              ]}
              data={data}
              yescomp
              page={currentPage}
              total={total}
              pagesize={pageSize}
              onTableChange={handleTableChange}
              onRow={(record) => ({
                onClick: () => {
                  let url = "";
                  if (record.status === "draft") {
                    url = `${window.location.origin}/sales-input?id=${record.id}`;
                  } else {
                    const path = resolveApprovalRoute(record, user);
                    url = path ? `${window.location.origin}${path}` : `${window.location.origin}/approval?id=${record.id}`;
                  }
                  window.open(url, "_blank", "noopener,noreferrer");
                },
                style: { cursor: "pointer" },
              })}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default ExportReport;
