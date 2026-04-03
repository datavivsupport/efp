import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import apiClient from "../../api/apiclient";
import dayjs from "dayjs";
import { Spin, Empty, message, Tag, Select, Input, Button } from "antd";
import CommonTable from "../Commontable/Commontable";
import { Icon } from "@iconify/react";

const { Option } = Select;
const ExportReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filterField, setFilterField] = useState('none');
  const [filterValue, setFilterValue] = useState('');
  const [pendingWith, setPendingWith] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [pendingWith]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "/liner/sales-input/reports/";
      if (pendingWith !== 'all') {
        // Handle pendingWith filtering if supported by backend or do client-side
      }
      const response = await apiClient.get(url);
      if (response.data.status === "success") {
        setData(response.data.data.results || response.data.data || []);
      }
    } catch (err) {
      message.error("Failed to fetch export reports");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(row => {
    const matchesSearch = searchTerm === '' ||
      (row.export_number && row.export_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.customer_name && row.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.afsys_job_no && row.afsys_job_no.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPending = pendingWith === 'all' || row.pending_with === pendingWith;

    let matchesFilterField = true;
    if (filterField !== 'none' && filterValue !== '') {
      if (filterField === 'carrier') matchesFilterField = row.carrier_name?.toLowerCase().includes(filterValue.toLowerCase());
      if (filterField === 'customer') matchesFilterField = row.customer_name?.toLowerCase().includes(filterValue.toLowerCase());
      if (filterField === 'job') matchesFilterField = row.export_number?.toLowerCase().includes(filterValue.toLowerCase());
    }

    return matchesSearch && matchesPending && matchesFilterField;
  });

  return (
    <div className="px-4 py-4" style={{ maxWidth: "100%" }}>
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Header */}
        <div
          style={{ backgroundColor: "#1b9cac" }}
          className="px-6 py-3 flex gap-4"
        >
          <h3 className="text-xl font-bold text-white">EXPORT REPORT</h3>
          <p className="text-white/70 text-sm mt-1">
            Export forwarding status overview
          </p>
        </div>

        <div className="p-6 space-y-3">
          {/* Filters */}
          {/* <section> */}
            {/* <div className="flex items-center mb-2 pb-2 border-b-2 border-gray-200">
              <h5 className="text-lg font-semibold text-gray-800">FILTERS</h5>
            </div> */}

            <div className="grid grid-cols-4 gap-6 items-end mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filter Field
                </label>
                {/* <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="none">None</option>
                  <option value="carrier">Carrier</option>
                  <option value="customer">Customer</option>
                  <option value="job">Export Number</option>
                </select> */}
                <Select
                  value={filterField}
                  onChange={(value) => setFilterField(value)}
                  placeholder="Select filter"
                  className="w-full"
                  // disabled={isReadOnly}
                >
                  <Option value="none">None</Option>
                  <Option value="carrier">Carrier</Option>
                  <Option value="customer">Customer</Option>
                  <Option value="job">Export Number</Option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filter Value
                </label>
                <Input
                  type="text"
                  placeholder="Enter Value"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  // className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pending With
                </label>
                <Select
                  value={pendingWith}
                  onChange={(value) => setPendingWith(value)}
                  className="w-full"
                  placeholder="Select Filter"
                  // className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <Option value="all">All</Option>
                  <Option value="Sales">Sales</Option>
                  <Option value="Sales HOD">Sales HOD</Option>
                  <Option value="CS Team">CS Team</Option>
                  <Option value="CNF Team">CNF Team</Option>
                  <Option value="Accounts">Accounts</Option>
                </Select>
              </div>

              <div className="flex gap-2 justify-between">
                <Button
                  icon={<Icon icon="zondicons:add-solid"/>}
                  type="primary"
                  onClick={() => navigate("/liner/sales-input")}
                  // style={{ backgroundColor: "#1b9cac" }}
                  // className="px-6 py-2 hover:opacity-90 text-white rounded-lg transition"
                >
                  Add
                </Button>
                <Button
                  icon={<Icon icon="cil:search"/>}
                  type="primary"
                  onClick={fetchData}
                  // style={{ backgroundColor: "#1b9cac" }}
                  // className="px-6 py-2 hover:opacity-90 text-white rounded-lg transition"
                >
                  Search
                </Button>
                <Button
                  icon={<Icon icon="pajamas:clear"/>}
                  type="primary"
                  onClick={() => {
                    setFilterField("none");
                    setFilterValue("");
                    setPendingWith("all");
                    setSearchTerm("");
                  }}
                  // className="px-6 py-2 bg-gray-300 rounded-lg"
                >
                  Clear
                </Button>
              </div>
            </div>
          {/* </section> */}

          {/* Table */}
          <section>
            <div className="flex mb-4 pb-2 border-b-2 border-gray-200 justify-between">
              <h4 className="text-lg font-semibold text-gray-800">
                EXPORT DETAILS
              </h4>

              <Input
                placeholder="Search Export Number, Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "75%" }}
                // className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 w-full"
              />
            </div>

            <CommonTable
              columns={[
                { title: "Export No", dataIndex: "export_number", key: "export_number", render: (v) => <span style={{ fontWeight: 600, color: '#0d9488' }}>{v || "N/A (Draft)"}</span> },
                { title: "Created Date", dataIndex: "export_created_date", key: "export_created_date", render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-" },
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
              data={filteredData.map((r) => ({ ...r, key: r.id }))}
              yescomp
              onRow={(record) => ({
                onClick: () => {
                  const url = `${window.location.origin}/approval?id=${record.id}`;
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
}; export default ExportReport;