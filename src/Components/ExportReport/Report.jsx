import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import apiClient from "../../api/apiclient";
import dayjs from "dayjs";
import { Spin, Empty, message, Tag, Select, Input, Button } from "antd";
import CommonTable from "../Commontable/Commontable";
import { Icon } from "@iconify/react";
import { resolveApprovalRoute } from "../Approval/utils/resolveApprovalRoute";

const { Option } = Select;

const ExportReport = () => {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filterField, setFilterField] = useState('none');
  const [filterValue, setFilterValue] = useState('');
  const [pendingWith, setPendingWith] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [pendingWith, currentPage, pageSize]);

  const fetchData = async (page = 1, size = 10, overrides = {}) => {
    setLoading(true);
    try {
      // Use overrides if provided (useful for clearing state)
      const pWith = overrides.pendingWith !== undefined ? overrides.pendingWith : pendingWith;
      const fField = overrides.filterField !== undefined ? overrides.filterField : filterField;
      const fValue = overrides.filterValue !== undefined ? overrides.filterValue : filterValue;
      const sTerm = overrides.searchTerm !== undefined ? overrides.searchTerm : searchTerm;

      let url = `/liner/sales-input/reports/?page=${page}&page_size=${size}`;

      // Optional query params for filtering
      if (pWith !== 'all') url += `&pending_with=${pWith}`;
      if (fField !== 'none' && fValue) {
        url += `&${fField}=${encodeURIComponent(fValue)}`;
      }
      if (sTerm) url += `&search=${encodeURIComponent(sTerm)}`;

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

  const handleTableChange = (pagination) => {
    const { current, pageSize } = pagination;
    setCurrentPage(current);
    setPageSize(pageSize);
    fetchData(current, pageSize);
  };

  return (
    <div className="px-4 py-4" style={{ maxWidth: "100%" }}>
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Header */}
        <div style={{ backgroundColor: "#1b9cac" }} className="px-6 py-3 flex gap-4">
          <h3 className="text-xl font-bold text-white">EXPORT REPORT</h3>
          <p className="text-white/70 text-sm mt-1">Export forwarding status overview</p>
        </div>

        <div className="p-6 space-y-3">
          {/* Filters */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 24 }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter Field</label>
              <Select
                value={filterField}
                onChange={setFilterField}
                placeholder="Select filter"
                className="w-full"
              >
                <Option value="none">None</Option>
                <Option value="carrier">Carrier</Option>
                <Option value="customer">Customer</Option>
                {/* <Option value="job">Export Number</Option> */}
              </Select>
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter Value</label>
              <Input
                type="text"
                placeholder="Enter Value"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              />
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pending With</label>
              <Select
                value={pendingWith}
                onChange={setPendingWith}
                className="w-full"
                placeholder="Select Filter"
              >
                <Option value="all">All</Option>
                {/* <Option value="Sales">Sales</Option> */}
                <Option value="Sales HOD">Sales HOD</Option>
                <Option value="CS Team">CS Team</Option>
                <Option value="CNF Team">CNF Team</Option>
                <Option value="CS HOD">CS HOD</Option>
                <Option value="Accounts">Accounts</Option>
              </Select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                icon={<Icon icon="cil:search" />}
                type="primary"
                onClick={() => {
                  setCurrentPage(1);
                  fetchData(1, pageSize);
                }}
              >
                Search
              </Button>
              <Button
                icon={<Icon icon="pajamas:clear" />}
                type="primary"
                onClick={() => {
                  setFilterField("none");
                  setFilterValue("");
                  setPendingWith("all");
                  setSearchTerm("");
                  setCurrentPage(1);
                  fetchData(1, pageSize, {
                    filterField: "none",
                    filterValue: "",
                    pendingWith: "all",
                    searchTerm: ""
                  });
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Table */}
          <section>
            <div className="flex mb-4 pb-2 border-b-2 border-gray-200 justify-between">
              <h4 className="text-lg font-semibold text-gray-800">EXPORT DETAILS</h4>
              <Input
                placeholder="Search Export Number, Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "75%" }}
              />
            </div>

            <CommonTable
              columns={[
                { title: "Export No", dataIndex: "export_number", key: "export_number", render: (v) => <span style={{ fontWeight: 600, color: '#0d9488' }}>{v || "N/A (Draft)"}</span> },
                { title: "Created Date", dataIndex: "export_created_date", key: "export_created_date", render: (d) => d ? dayjs(d).format("DD-MM-YYYY") : "-" },
                { title: "Created By", dataIndex: "created_by_name", key: "created_by_name", render: (v) => v || "-" },
                { title: "Carrier", dataIndex: "carrier_name", key: "carrier_name", render: (text) => text || "-" },
                { title: "Customer", dataIndex: "customer_name", key: "customer_name", render: (text) => text || "-" },
                { title: "Job No (AFSYS)", dataIndex: "afsys_job_no", key: "afsys_job_no", render: (v) => <span style={{ fontFamily: 'monospace' }}>{v || "-"}</span> },
                { title: "Booking Ref", dataIndex: "booking_ref_no", key: "booking_ref_no", render: (v) => <span style={{ fontFamily: 'monospace' }}>{v || "-"}</span> },
                { title: "Pending With", dataIndex: "pending_with", key: "pending_with", render: (v) => <Tag color="blue">{v || "-"}</Tag> },
                {
                  title: "Status", dataIndex: "status", key: "status",
                  render: (v) => (
                    <Tag color={v === 'approved' ? 'green' : v === 'submitted' || v === 'pending' ? 'orange' : v === 'draft' ? 'default' : 'red'}>
                      {v?.toUpperCase() || "-"}
                    </Tag>
                  )
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
