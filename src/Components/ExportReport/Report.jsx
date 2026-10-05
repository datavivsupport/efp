import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import apiClient from "../../api/apiclient";
import dayjs from "../../dayjs-config";
import { message, Tag, Select, Input, Button, DatePicker } from "antd";
import CommonTable from "../Commontable/Commontable";
import useReportExport from "./useReportExport";
import { Icon } from "@iconify/react";
import { resolveApprovalRoute } from "../Approval/utils/resolveApprovalRoute";
import EquipmentTypeSelect from "../SalesInput/EquipmentType";

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
  salesHod: "",
  pol: "",
  fpod: "",
  pendingWith: "all",
  status: "",
  bookingVessel: "",
  bookingVoyage: "",
  loadList: "",
  equipmentType: "",
};

const STATUS_OPTIONS = [
  ["draft", "Draft"],
  ["submitted", "Submitted"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["CS-REJECTED", "CS Rejected"],
  ["CNF-REJECTED", "CNF Rejected"],
  ["CSHOD-REJECTED", "CS HOD Rejected"],
  ["ACCOUNTS-REJECTED", "Accounts Rejected"],
  ["REJECTED-CLOSED", "Rejected Closed"],
  ["STOPPED", "Stopped"],
];


// Text searches match part of the value (backend icontains) once at least this many
// characters are typed; shorter input is not sent, the same as an empty box.
const MIN_SEARCH_LENGTH = 3;

const searchValue = (v) => {
  const trimmed = String(v || "").trim();
  return trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : "";
};

// [filter state key, query param] for every free-text search box
const TEXT_SEARCH_PARAMS = [
  ["exportNumber", "export_number"],
  ["createdBy", "created_by"],
  ["carrier", "carrier"],
  ["customerName", "customer_name"],
  ["afsysJobNo", "afsys_job_no"],
  ["bookingRef", "booking_ref"],
  ["salesHod", "sales_hod"],
  ["pol", "pol"],
  ["fpod", "fpod"],
  ["bookingVessel", "booking_vessel"],
  ["bookingVoyage", "booking_voyage"],
];

const buildFilterParams = (f = {}) => {
  const params = {};
  if (f.pendingWith && f.pendingWith !== "all") params.pending_with = f.pendingWith;
  if (f.jobType) params.job_type = f.jobType;

  if (f.createdAtFrom) params.export_created_date_gte = dayjs(f.createdAtFrom).format("YYYY-MM-DD");
  if (f.createdAtTo) params.export_created_date_lte = dayjs(f.createdAtTo).format("YYYY-MM-DD");
  TEXT_SEARCH_PARAMS.forEach(([key, param]) => {
    const value = searchValue(f[key]);
    if (value) params[param] = value;
  });
  if (f.status) params.status = f.status;
  if (f.loadList) params.load_list = f.loadList;
  if (f.equipmentType) params.equipment_type = f.equipmentType;
  return params;
};

const SearchInput = ({ value, onChange }) => {
  const length = String(value || "").trim().length;
  const tooShort = length > 0 && length < MIN_SEARCH_LENGTH;
  return (
    <>
      <Input
        prefix={<Icon icon="cil:search" width={16} color="#4b5563" />}
        placeholder={`Search (min ${MIN_SEARCH_LENGTH} characters)...`}
        allowClear
        value={value}
        status={tooShort ? "warning" : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {tooShort && (
        <span style={{ fontSize: 11, color: "#d97706", marginTop: 2 }}>
          Enter at least {MIN_SEARCH_LENGTH} characters
        </span>
      )}
    </>
  );
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
  const [salesHod, setSalesHod] = useState("");
  const [pol, setPol] = useState("");
  const [fpod, setFpod] = useState("");
  const [pendingWith, setPendingWith] = useState("all");
  const [status, setStatus] = useState("");
  const [bookingVessel, setBookingVessel] = useState("");
  const [bookingVoyage, setBookingVoyage] = useState("");
  const [loadList, setLoadList] = useState("");
  const [equipmentType, setEquipmentType] = useState("");

  const currentFilters = {
    jobType, exportNumber, createdAtFrom, createdAtTo,
    createdBy, carrier, customerName, afsysJobNo,
    bookingRef, salesHod, pol, fpod, pendingWith,
    status, bookingVessel, bookingVoyage, loadList, equipmentType,
  };

  const debounceRef = useRef(null);
  const { exporting, startExport } = useReportExport();

  const handleExport = () => {
    startExport(buildFilterParams(currentFilters));
  };

  const buildUrl = useCallback((page, size, f = {}) => {
    let url = `/liner/sales-input/reports/?page=${page}&page_size=${size}`;
    Object.entries(buildFilterParams(f)).forEach(([key, value]) => {
      url += `&${key}=${encodeURIComponent(value)}`;
    });
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

  // Auto-fetch with debounce whenever the filters actually sent change - typing the
  // 1st / 2nd character of a search sends nothing new, so it does not refetch.
  const filterKey = JSON.stringify(buildFilterParams(currentFilters));
  useEffect(() => {
    const filters = currentFilters;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(1, pageSize, filters);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [filterKey]);

  // Pagination change — fetch immediately with current filters
  const handleTableChange = (pagination) => {
    const { current, pageSize: ps } = pagination;
    setCurrentPage(current);
    setPageSize(ps);
    fetchData(current, ps, currentFilters);
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
    setSalesHod("");
    setPol("");
    setFpod("");
    setPendingWith("all");
    setStatus("");
    setBookingVessel("");
    setBookingVoyage("");
    setLoadList("");
    setEquipmentType("");
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
              <SearchInput value={customerName} onChange={setCustomerName} />
            </div>

            <div className={colCls}>
              <label className={labelCls}>Carrier</label>
              <SearchInput value={carrier} onChange={setCarrier} />
            </div>


            <div className={colCls}>
              <label className={labelCls}>Export No (DMS)</label>
              <SearchInput value={exportNumber} onChange={setExportNumber} />
            </div>


            <div className={colCls}>
              <label className={labelCls}>Sales HOD</label>
              <SearchInput value={salesHod} onChange={setSalesHod} />
            </div>


            <div className={colCls}>
              <label className={labelCls}>POL</label>
              <SearchInput value={pol} onChange={setPol} />
            </div>


            <div className={colCls}>
              <label className={labelCls}>FPOD</label>
              <SearchInput value={fpod} onChange={setFpod} />
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
                      salesHod, pol, fpod, status, bookingVessel, bookingVoyage,
                      loadList, equipmentType,
                      pendingWith !== "all" ? pendingWith : ""].filter(Boolean).length;
                    return extra > 0 ? (
                      <span style={{
                        marginLeft: 4, background: "#1b9cac", color: "#fff",
                        borderRadius: 10, padding: "0px 6px", fontSize: 11, fontWeight: 700,
                      }}>{extra}</span>
                    ) : null;
                  })()}
                </Button>

                <Button
                  type="primary"
                  onClick={handleExport}
                  loading={exporting}
                  icon={<Icon icon="lucide:download" width="16" height="16" />}
                  style={{ borderRadius: 8, fontWeight: 500 }}
                >
                  Export
                </Button>

                {(jobType || exportNumber || createdAtFrom || createdAtTo || createdBy || carrier ||
                  customerName || afsysJobNo || bookingRef || salesHod || pol || fpod || pendingWith !== "all" ||
                  status || bookingVessel || bookingVoyage || loadList || equipmentType) && (
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
                  <SearchInput value={createdBy} onChange={setCreatedBy} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>AFSYS Job No.</label>
                  <SearchInput value={afsysJobNo} onChange={setAfsysJobNo} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Booking Ref</label>
                  <SearchInput value={bookingRef} onChange={setBookingRef} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Created Date (From)</label>
                  <DatePicker value={createdAtFrom} onChange={setCreatedAtFrom} format="DD-MM-YYYY" placeholder="From date" style={{ width: "100%" }} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Created Date (To)</label>
                  <DatePicker value={createdAtTo} onChange={setCreatedAtTo} format="DD-MM-YYYY" placeholder="To date" style={{ width: "100%" }} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Status</label>
                  <Select value={status || undefined} onChange={(v) => setStatus(v || "")} placeholder="All" allowClear style={{ width: "100%" }}>
                    {STATUS_OPTIONS.map(([value, label]) => (
                      <Option key={value} value={value}>{label}</Option>
                    ))}
                  </Select>
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Booking Vessel</label>
                  <SearchInput value={bookingVessel} onChange={setBookingVessel} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Booking Voyage</label>
                  <SearchInput value={bookingVoyage} onChange={setBookingVoyage} />
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Load List (Y/N)</label>
                  <Select value={loadList || undefined} onChange={(v) => setLoadList(v || "")} placeholder="All" allowClear style={{ width: "100%" }}>
                    <Option value="true">Yes</Option>
                    <Option value="false">No</Option>
                  </Select>
                </div>

                <div className={colCls}>
                  <label className={labelCls}>Equipment Type</label>
                  <EquipmentTypeSelect
                    value={equipmentType || undefined}
                    onChange={(v) => setEquipmentType(v || "")}
                    placeholder="All"
                    allowClear
                    style={{ width: "100%" }}
                  />
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
                { title: "Booking Vessel", dataIndex: "booking_vessel", key: "booking_vessel", render: (v) => v || "-" },
                { title: "Booking Voyage", dataIndex: "booking_voyage", key: "booking_voyage", render: (v) => v || "-" },
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
                {
                  title: "Load List (Y/N)", dataIndex: "is_load_list_uploaded", key: "is_load_list_uploaded",
                  render: (v) => <Tag color={v ? "green" : "default"}>{v ? "Y" : "N"}</Tag>,
                },
                { title: "Equipment Type", dataIndex: "equipment_type", key: "equipment_type", render: (v) => v || "-" },
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
