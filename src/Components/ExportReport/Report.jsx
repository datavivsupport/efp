import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import apiClient from "../../api/apiclient";
import dayjs from "dayjs";
import { Spin, Empty, message, Tag } from "antd";
import CommonTable from "../Commontable/Commontable";

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
    <div className="px-6 py-8" style={{ maxWidth: "100%" }}>
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">

        {/* Header */}
        <div style={{ backgroundColor: "#1b9cac" }} className="px-8 py-5">
          <h3 className="text-xl font-bold text-white">
            EXPORT REPORT
          </h3>
          <p className="text-white/70 text-sm mt-1">
            Export forwarding status overview
          </p>
        </div>

        <div className="p-8 space-y-8">

          {/* Filters */}
          <section>
            <div className="flex items-center mb-4 pb-2 border-b-2 border-gray-200">
              <h4 className="text-lg font-bold text-gray-800">
                FILTERS
              </h4>
            </div>

            <div className="grid grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filter Field
                </label>
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="none">None</option>
                  <option value="carrier">Carrier</option>
                  <option value="customer">Customer</option>
                  <option value="job">Export Number</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filter Value
                </label>
                <input
                  type="text"
                  placeholder="Enter Value"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pending With
                </label>
                <select
                  value={pendingWith}
                  onChange={(e) => setPendingWith(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All</option>
                  <option value="Sales">Sales</option>
                  <option value="Sales HOD">Sales HOD</option>
                  <option value="CS Team">CS Team</option>
                  <option value="CNF Team">CNF Team</option>
                  <option value="Accounts">Accounts</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/liner/sales-input")}
                  style={{ backgroundColor: "#1b9cac" }}
                  className="px-6 py-2 hover:opacity-90 text-white rounded-lg transition"
                >
                  Add
                </button>
                <button
                  onClick={fetchData}
                  style={{ backgroundColor: "#1b9cac" }}
                  className="px-6 py-2 hover:opacity-90 text-white rounded-lg transition"
                >
                  Search
                </button>
                <button
                  onClick={() => { setFilterField('none'); setFilterValue(''); setPendingWith('all'); setSearchTerm(''); }}
                  className="px-6 py-2 bg-gray-300 rounded-lg"
                >
                  Clear
                </button>
              </div>
            </div>
          </section>

          {/* Table */}
          <section>
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-200">
              <h4 className="text-lg font-bold text-gray-800">
                EXPORT DETAILS
              </h4>

              <input
                placeholder="Search Export Number, Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 w-64"
              />
            </div>

            <CommonTable
              columns={[
                { title: "Export No", dataIndex: "export_number", key: "export_number", render: (v) => <span style={{ fontWeight: 600, color: '#0d9488' }}>{v || "N/A (Draft)"}</span> },
                { title: "Created Date", dataIndex: "export_created_date", key: "export_created_date", render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "N/A" },
                { title: "Created By", dataIndex: "created_by_name", key: "created_by_name", render: (v) => v || "N/A" },
                { title: "Carrier", dataIndex: "carrier_name", key: "carrier_name" },
                { title: "Customer", dataIndex: "customer_name", key: "customer_name" },
                { title: "Job No (AFSYS)", dataIndex: "afsys_job_no", key: "afsys_job_no", render: (v) => <span style={{ fontFamily: 'monospace' }}>{v || "N/A"}</span> },
                { title: "Booking Ref", dataIndex: "booking_ref_no", key: "booking_ref_no", render: (v) => <span style={{ fontFamily: 'monospace' }}>{v || "N/A"}</span> },
                { title: "Pending With", dataIndex: "pending_with", key: "pending_with", render: (v) => <Tag color="blue">{v}</Tag> },
                {
                  title: "Status", dataIndex: "status", key: "status",
                  render: (v) => (
                    <Tag color={v === 'approved' ? 'green' : v === 'submitted' || v === 'pending' ? 'orange' : v === 'draft' ? 'default' : 'red'}>
                      {v?.toUpperCase()}
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