import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import apiClient from "../../api/apiclient";
import dayjs from "dayjs";
import { Spin, Empty, message } from "antd";

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
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="bg-teal-600 px-8 py-5">
          <h3 className="text-xl font-bold text-white">
            EXPORT REPORT
          </h3>
          <p className="text-teal-100 text-sm mt-1">
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
                  className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition"
                >
                  Add
                </button>
                <button
                  onClick={fetchData}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg"
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

            <div className="border border-gray-200 rounded-lg overflow-auto">
              {loading ? (
                <div className="p-20 text-center"><Spin tip="Loading reports..." /></div>
              ) : filteredData.length === 0 ? (
                <div className="p-20"><Empty description="No export records found" /></div>
              ) : (
                <table className="w-full min-w-[1200px]">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      {[
                        'Export No', 'Created Date', 'Created By', 'Carrier', 'Customer',
                        'Job No (AFSYS)', 'Booking Ref', 'Pending With', 'Status'
                      ].map(h => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {filteredData.map(row => (
                      <tr
                        key={row.id}
                        onClick={() => {
                          const url = `${window.location.origin}/approval?id=${row.id}`;
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-teal-700">{row.export_number || "N/A (Draft)"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {row.export_created_date ? dayjs(row.export_created_date).format("YYYY-MM-DD") : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.created_by_name || "N/A"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.carrier_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[200px]">
                          {row.customer_name}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{row.afsys_job_no || "N/A"}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600 truncate">
                          {row.booking_ref_no || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-semibold">{row.pending_with}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border transition-colors
          ${row.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                : row.status === 'submitted' || row.status === 'pending'
                                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                                  : row.status === 'draft'
                                    ? 'bg-gray-100 text-gray-600 border-gray-300'
                                    : 'bg-red-100 text-red-700 border-red-300'
                              }`}
                          >
                            {row.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}; export default ExportReport;