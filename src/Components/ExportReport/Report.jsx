import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import apiClient from "../../api/apiclient";
import dayjs from "../../dayjs-config";
import { message, Tag, Select, Input, Button, DatePicker } from "antd";
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
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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

  const debounceRef = useRef(null);

  const buildUrl = useCallback((page, size, f = {}) => {
    let url = `/liner/sales-input/reports/?page=${page}&page_size=${size}`;
    if (f.pendingWith && f.pendingWith !== "all") url += `&pending_with=${encodeURIComponent(f.pendingWith)}`;
    if (f.jobType)       url += `&job_type=${encodeURIComponent(f.jobType)}`;
    if (f.exportNumber)  url += `&export_number=${encodeURIComponent(f.exportNumber)}`;
    // export_created_date, not created_at: the "Created Date" column in the table below
    // renders export_created_date, and the two diverge on back-dated and migrated jobs -
    // so a range on created_at hid rows whose visible date was inside it.
    if (f.createdAtFrom) url += `&export_created_date_gte=${dayjs(f.createdAtFrom).format("YYYY-MM-DD")}`;
    if (f.createdAtTo)   url += `&export_created_date_lte=${dayjs(f.createdAtTo).format("YYYY-MM-DD")}`;
    if (f.createdBy)     url += `&created_by=${encodeURIComponent(f.createdBy)}`;
    if (f.carrier)       url += `&carrier=${encodeURIComponent(f.carrier)}`;
    if (f.customerName)  url += `&customer_name=${encodeURIComponent(f.customerName)}`;
    if (f.afsysJobNo)    url += `&afsys_job_no=${encodeURIComponent(f.afsysJobNo)}`;
    if (f.bookingRef)    url += `&booking_ref=${encodeURIComponent(f.bookingRef)}`;
    if (f.salesName)     url += `&sales_name=${encodeURIComponent(f.salesName)}`;
    if (f.pol)           url += `&pol=${encodeURIComponent(f.pol)}`;
    if (f.fpod)          url += `&fpod=${encodeURIComponent(f.fpod)}`;
    return url;
  }, []);

  const fetchData = useCallback(async (page, size, filters) => {
    setLoading(true);
    try {
      const url = buildUrl(page, size, filters);
      const response = await apiClient.get(url);
      if (response.data.status === "success") {
        const resultData = response.data.data.results || response.data.data || [];
        setData(resultData.map((r) => ({ ...r, key: r.id })));
        setTotal(response.data.data.count || resultData.length);
        setCurrentPage(response.data.data.current_page || page);
        setPageSize(response.data.data.page_size || size);
      }
    } catch {
      message.error("Failed to fetch export reports");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  // Auto-fetch with debounce whenever any filter changes
  useEffect(() => {
    const filters = {
      jobType, exportNumber, createdAtFrom, createdAtTo,
      createdBy, carrier, customerName, afsysJobNo,
      bookingRef, salesName, pol, fpod, pendingWith,
    };

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(1, pageSize, filters);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [
    jobType, exportNumber, createdAtFrom, createdAtTo,
    createdBy, carrier, customerName, afsysJobNo,
    bookingRef, salesName, pol, fpod, pendingWith,
  ]);

  // Pagination change — fetch immediately with current filters
  const handleTableChange = (pagination) => {
    const { current, pageSize: ps } = pagination;
    setCurrentPage(current);
    setPageSize(ps);
    fetchData(current, ps, {
      jobType, exportNumber, createdAtFrom, createdAtTo,
      createdBy, carrier, customerName, afsysJobNo,
      bookingRef, salesName, pol, fpod, pendingWith,
    });
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
  };

  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
  const colCls = "flex flex-col";

  return (
    <div className="px-4 py-4" style={{ maxWidth: "100%" }}>
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-4">

          {/* Always-visible default filters + toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

            {/* Default filter 1 — Pending With */}
            <div className={colCls}>
              <label className={labelCls}>Pending With</label>
              <Select value={pendingWith} onChange={setPendingWith} style={{ width: "100%" }}>
                <Option value="all">All</Option>
                <Option value="SALES HOD">Sales HOD</Option>
                <Option value="CS">CS Team</Option>
                <Option value="CNF">CNF Team</Option>
                <Option value="CS HOD">CS HOD</Option>
                <Option value="ACCOUNTS">Accounts</Option>
                <Option value="WORKFLOW COMPLETED">Workflow Completed</Option>
              </Select>
            </div>

            {/* Default filter 2 — Customer Name */}
            <div className={colCls}>
              <label className={labelCls}>Customer Name</label>
              <Input prefix={<Icon icon="cil:search" width={16} color="#4b5563" />} placeholder="Search..." allowClear value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
 
            <div className={colCls}>
              <label className={labelCls}>Carrier</label>
              <Input prefix={<Icon icon="cil:search" width={16} color="#4b5563" />} placeholder="Search..." allowClear value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            </div>

            
            <div className={colCls}>
              <label className={labelCls}>Export No (DMS)</label>
              <Input prefix={<Icon icon="cil:search" width={16} color="#4b5563" />} placeholder="Search..." allowClear value={exportNumber} onChange={(e) => setExportNumber(e.target.value)} />
            </div>

       
            <div className={colCls}>
              <label className={labelCls}>Sales Name</label>
              <Input prefix={<Icon icon="cil:search" width={16} color="#4b5563" />} placeholder="Search..." allowClear value={salesName} onChange={(e) => setSalesName(e.target.value)} />
            </div>

        
            <div className={colCls}>
              <label className={labelCls}>POL</label>
              <Input prefix={<Icon icon="cil:search" width={16} color="#4b5563" />} placeholder="Search..." allowClear value={pol} onChange={(e) => setPol(e.target.value)} />
            </div>

       
            <div className={colCls}>
              <label className={labelCls}>FPOD</label>
              <Input prefix={<Icon icon="cil:search" width={16} color="#4b5563" />} placeholder="Search..." allowClear value={fpod} onChange={(e) => setFpod(e.target.value)} />
            </div>

            {/* More filters toggle */}
            <div className={colCls} style={{ flexShrink: 0 }}>
              <label className={labelCls} style={{ visibility: "hidden" }}>.</label>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  type={filtersExpanded ? "primary" : "default"}
                  onClick={() => setFiltersExpanded((p) => !p)}
                  icon={<Icon icon={filtersExpanded ? "mdi:tune-vertical" : "mdi:tune"} width="16" height="16" />}
                >
                  {(() => {
                
                    const extra = [jobType, exportNumber, createdAtFrom, createdAtTo,
                      createdBy, carrier, customerName, afsysJobNo, bookingRef,
                      salesName, pol, fpod,
                      pendingWith !== "all" ? pendingWith : ""].filter(Boolean).length;
                    return extra > 0 ? (
                      <span style={{
                        marginLeft: 4, background: "#1b9cac", color: "#fff",
                        borderRadius: 10, padding: "0px 6px", fontSize: 11, fontWeight: 700,
                      }}>{extra}</span>
                    ) : null;
                  })()}
                </Button>

                {(jobType || exportNumber || createdAtFrom || createdAtTo || createdBy || carrier ||
                  customerName || afsysJobNo || bookingRef || salesName || pol || fpod || pendingWith !== "all") && (
                  <Button onClick={handleClear} icon={<Icon icon="pajamas:clear" width={14} />}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

          </div>

          {/* Collapsible extra filters */}
          {filtersExpanded && (
            <div style={{
              padding: "10px", background: "#fafafa", borderRadius: "8px",
              border: "1px solid #f0f0f0", width: "100%",
            }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

                <div className={colCls}>
                  <label className={labelCls}>Job Type</label>
                  <Select value={jobType || undefined} onChange={setJobType} placeholder="All" allowClear style={{ width: "100%" }}>
                    <Option value="LINER">LINER</Option>
                     
                    <Option value="FORWARDING">FORWARDING</Option>
                    <Option value="CROSS TRADE">CROSS-TRADE</Option>
                    <Option value="OTHERS">OTHERS</Option>
                  </Select>
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Created By</label>
                  <Input prefix={<Icon icon="cil:search" width={16} color="#4b5563" />} placeholder="Search..." allowClear value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>AFSYS Job No.</label>
                  <Input prefix={<Icon icon="cil:search" width={16} color="#4b5563" />} placeholder="Search..." allowClear value={afsysJobNo} onChange={(e) => setAfsysJobNo(e.target.value)} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Booking Ref</label>
                  <Input prefix={<Icon icon="cil:search" width={16} color="#4b5563" />} placeholder="Search..." allowClear value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Created Date (From)</label>
                  <DatePicker value={createdAtFrom} onChange={setCreatedAtFrom} format="DD-MM-YYYY" placeholder="From date" style={{ width: "100%" }} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Created Date (To)</label>
                  <DatePicker value={createdAtTo} onChange={setCreatedAtTo} format="DD-MM-YYYY" placeholder="To date" style={{ width: "100%" }} />
                </div>

              </div>
            </div>
          )}

          {/* Table */}
          <section>
            <CommonTable
              columns={[
                { title: "Export No", dataIndex: "export_number", key: "export_number", render: (v) => <span style={{ fontWeight: 600, color: "#0d9488" }}>{v || "N/A (Draft)"}</span> },
                { title: "Job Type", dataIndex: "job_type", key: "job_type", render: (v) => v ? <Tag color="geekblue">{v}</Tag> : "-" },
                { title: "Created Date", dataIndex: "export_created_date", key: "export_created_date", render: (d) => d ? dayjs(d).format("DD-MM-YYYY") : "-" },
                { title: "Created By", dataIndex: "created_by_name", key: "created_by_name", render: (v) => v || "-" },
                { title: "Carrier", dataIndex: "carrier_name", key: "carrier_name", render: (v) => v || "-" },
                { title: "Customer", dataIndex: "customer_name", key: "customer_name", render: (v) => v || "-" },
                { title: "POL", dataIndex: "port_of_loading", key: "port_of_loading", render: (v) => v || "-" },
                { title: "FPOD", dataIndex: "final_pod", key: "final_pod", render: (v) => v || "-" },
                { title: "Vessel / Voyage", dataIndex: "vessel_voyage", key: "vessel_voyage", render: (v) => v || "-" },
                { title: "Job No (AFSYS)", dataIndex: "afsys_job_no", key: "afsys_job_no", render: (v) => <span style={{ fontFamily: "monospace" }}>{v || "-"}</span> },
                { title: "Booking Ref", dataIndex: "booking_ref_no", key: "booking_ref_no", render: (v) => <span style={{ fontFamily: "monospace" }}>{v || "-"}</span> },
                { title: "Sales HOD", dataIndex: "sales_hod", key: "sales_hod", render: (v) => v || "-" },
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
              loading={loading}
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
