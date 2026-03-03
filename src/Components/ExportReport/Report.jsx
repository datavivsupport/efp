import { useState } from "react";

const ExportReport = () => {
  const [filterField, setFilterField] = useState('none');
  const [filterValue, setFilterValue] = useState('');
  const [pendingWith, setPendingWith] = useState('pending-cnf-updation');
  const [searchTerm, setSearchTerm] = useState('');

  const exportData = [
    {
      id: 5511,
      carrier: 'MSC',
      customer: 'ENCORE INTERNATIONAL',
      jobNo: 'NB_FWDEX P/00539/2025',
      fpod: 'HALDIA',
      vessel: 'MSC FLOSTA III',
      bookingRef: 'EBKG12893766',
      eta: '2025-06-03',
      executive: 'Sudhish Vetteyadan',
      pending: 'CNF Updation',
      status: 'Pending CNFUpdation'
    },
    {
      id: 5878,
      carrier: 'NAIF MARINE',
      customer: 'TOYOTSU LOGISTICS SERVICE CO.LTD',
      jobNo: 'NB_FWDEX P/00887/2025',
      fpod: 'UMM QASAR',
      vessel: 'R/P JABAL ALI 11',
      bookingRef: 'NMS/320332',
      eta: '2025-08-23',
      executive: 'Sudhish Vetteyadan',
      pending: 'CNF Updation',
      status: 'Pending CNFUpdation'
    },
    {
      id: 5886,
      carrier: 'MSC',
      customer: 'ENCORE INTERNATIONAL',
      jobNo: 'NB_FWDEX P/00905/2025',
      fpod: 'MUNDRA',
      vessel: 'MSC FLOSTA III',
      bookingRef: 'EBKG13872278',
      eta: '2025-08-16',
      executive: 'Sudhish Vetteyadan',
      pending: 'CNF Updation',
      status: 'Pending CNFUpdation'
    }]

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
                  <option value="job">Job No</option>
                  <option value="vessel">Vessel</option>
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
                  <option value="pending-cnf-updation">CNF Updation</option>
                  <option value="pending-approval">Approval</option>
                  <option value="pending-documentation">Documentation</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button className="px-6 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition">
                  Add
                </button>
                <button className="px-6 py-2 bg-teal-600 text-white rounded-lg">
                  Search
                </button>
                <button className="px-6 py-2 bg-gray-300 rounded-lg">
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
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="border border-gray-200 rounded-lg overflow-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    {[
                      'ID', 'Carrier', 'Customer', 'Job No', 'FPOD',
                      'Vessel', 'Booking Ref', 'ETA',
                      'Executive', 'Pending', 'Status'
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
                  {exportData.map(row => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{row.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.carrier}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[200px]">
                        {row.customer}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{row.jobNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.fpod}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.vessel}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 truncate">
                        {row.bookingRef}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.eta}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.executive}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.pending}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border transition-colors
        ${row.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                              : row.status === 'Pending CNFUpdation'
                                ? 'bg-amber-100 text-amber-700 border-amber-300'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>

                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}; export default ExportReport;