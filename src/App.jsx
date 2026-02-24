import React, { useState } from 'react';
import { Bell, Search, User, ChevronDown, FileText, Trash2, Plus, Package, MapPin, Truck, DollarSign, Ship, Users, X, MoveUpRight, UploadCloud, Paperclip, } from 'lucide-react';
import ApprovalDashboard from './Components/ApprovalDashboard/ApprovalDashboard';
import Navigation from './Components/Navigation/Navbar';


// ENHANCED Sales Input Component with Form State
const SalesInput = () => {
  // Form state
  const [formData, setFormData] = useState({
    exportNumber: '',
    exportCreatedBy: 'Sales',
    exportCreatedDate: new Date().toISOString().split('T')[0],
    agent: '',
    carrierName: '',
    date: '',
    customerName: '',
    contactPIC: '',
    commodities: [], // Changed to array for multiple commodities
    contactDetailsNumber: '',
    contactDetailsEmail: '',
    otherCharges: '',
    pol: '',
    pod: '',
    fpod: '',
    termsOfShipment: '',
    haulierCode: '',
    shipmentDate: '',
    remarks: '',
    hbl: false,
    fac: false,
    documentation: false,
    transportation: false,
    specialInstructions: '',
    executiveName: '',
    salesHOD: '',
    jobStatus: ''
  });

  const [commodityInput, setCommodityInput] = useState('');
  const [equipmentRows, setEquipmentRows] = useState([
    { id: 1, equipmentType: '', volume: '', category: '', date: '', quote: '', cost: '' }
  ]);
  const [transportationRows, setTransportationRows] = useState([
    { id: 1, equipmentType: '', container: '', category: '', date: '', location: '', remarks: '' }
  ]);

  // Predefined commodity suggestions
  // const commoditySuggestions = [
  //   'Electronics', 'Textiles', 'Machinery', 'Automotive Parts',
  //   'Food Products', 'Chemicals', 'Pharmaceuticals', 'Furniture',
  //   'Building Materials', 'Paper Products', 'Plastics', 'Metal Products'
  // ];

  // Handle form field changes
  const handleInputChange = (field, value) => {
    if (field == 'jobType') {
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const fieldMap = {
        'liner': `LN/000123/${currentYear}`,
        'forwarding': `FW/000123/${currentYear}`,
        'cross-trade': `CR/000123/${currentYear}`,
        'others': `OT/00123/${currentYear}`
      }
      setFormData(prev => ({
        ...prev,
        [field]: value,
        exportNumber: (value ? fieldMap[value] : '')
      }))
    } else {

      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle commodity input
  const handleCommodityKeyDown = (e) => {
    if (e.key === 'Enter' && commodityInput.trim()) {
      e.preventDefault();
      if (!formData.commodities.includes(commodityInput.trim())) {
        setFormData(prev => ({
          ...prev,
          commodities: [...prev.commodities, commodityInput.trim()]
        }));
      }
      setCommodityInput('');
    }
  };

  // Add commodity from suggestions
  // const addCommodity = (commodity) => {
  //   if (!formData.commodities.includes(commodity)) {
  //     setFormData(prev => ({
  //       ...prev,
  //       commodities: [...prev.commodities, commodity]
  //     }));
  //   }
  // };

  // Remove commodity
  const removeCommodity = (commodityToRemove) => {
    setFormData(prev => ({
      ...prev,
      commodities: prev.commodities.filter(c => c !== commodityToRemove)
    }));
  };

  // Equipment row functions
  const updateRow = (id, field, value) => {
    setEquipmentRows(prev =>
      prev.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const addEquipmentRow = () => {
    setEquipmentRows(prev => [
      ...prev,
      {
        id: Date.now(),
        equipmentType: '',
        volume: '',
        date: '',
        category: '',
        quote: '',
        cost: ''
      }
    ]);
  };

  const removeEquipmentRow = (id) => {
    if (equipmentRows.length > 1) {
      setEquipmentRows(prev => prev.filter(row => row.id !== id));
    }
  };
  const addNewTransportationRow = () => {
    setTransportationRows(prev => [
      ...prev,
      {
        id: Date.now(),
        equipmentType: '',
        container: '',
        category: '',
        date: '',
        location: '',
        remarks: ''
      }
    ])
  }
  const updateTransportationRow = (id, field, value) => {
    setTransportationRows(prev =>
      prev.map(row =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  }
  const removeTransportationRow = (id) => {
    if (transportationRows.length > 1) {
      setTransportationRows(prev => prev.filter(row => row.id !== id));
    }
  }
  const totals = equipmentRows.reduce(
    (acc, row) => {

      const quote = (Number(row.quote)) || 0;
      const cost = (Number(row.cost)) || 0;
      acc.quote += quote;
      acc.cost += cost;
      acc.margin += row.volume * (quote - cost);

      return acc;
    },
    { quote: 0, cost: 0, margin: 0 }
  );

  // Save form
  const handleSave = () => {
    const transportRows = formData?.transportation ? transportationRows : null
    const dataToSave = {
      ...formData,
      equipmentRows,
      totals,
      transportRows,
      createdAt: new Date().toISOString()
    };
    console.log('Saving form data:', dataToSave);
    // alert('Form saved successfully!');
    // Here you would typically send this to your backend
  };

  // Cancel/Reset form
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      setFormData({
        agent: '',
        carrierName: '',
        date: '',
        customerName: '',
        contactPIC: '',
        commodities: [],
        contactDetails: '',
        otherCharges: '',
        pol: '',
        pod: '',
        fpod: '',
        termsOfShipment: '',
        haulierCode: '',
        shipmentDate: '',
        remarks: '',
        hbl: false,
        fac: false,
        documentation: false,
        transportation: false,
        specialInstructions: '',
        executiveName: '',
        salesHOD: '',
        jobStatus: ''
      });
      setCommodityInput('');
      setEquipmentRows([
        { id: 1, equipmentType: '', volume: '', category: '', date: '', quote: '', cost: '' }
      ]);
      setTransportationRows([
        { id: 1, equipmentType: '', container: '', category: '', date: '', location: '', remarks: '' }
      ])
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Create New Booking</h2>
        <p className="text-gray-600">Export Forwarding Process - Complete all required fields</p>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Form Header */}
        <div className="bg-teal-600 px-8 py-5">
          <div className="flex items-center space-x-3 justify-between">
            <div className='flex items-center space-x-3'>
              <Ship className="w-6 h-6 text-white" />
              <div>
                <h3 className="text-xl font-bold text-white">BOOKING NOTE – F30-03-01/JAN, 2018</h3>
                <p className="text-teal-100 text-sm mt-1">Fields marked with * are required</p>
              </div>
            </div>
            {/* <div><select className="bg-white align-end text-gray-900 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500">
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select></div> */}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 space-y-8">


          {/* Section 1: Basic Information */}
          <div>
            <div className="flex items-center space-x-2 mb-5 pb-2 border-b border-gray-200">
              <FileText className="w-5 h-5 text-teal-600" />
              <h4 className="text-lg font-bold text-gray-800">
                EXPORT DETAILS
              </h4>
            </div>



            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Export Number
                </label>
                <input
                  type="text"
                  placeholder="Please Select the Job Type"
                  value={formData.exportNumber}
                  disabled
                  // onChange={(e) => handleInputChange('exportNumber', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Export Created Date
                </label>
                <input
                  type="text"
                  placeholder="Created Date"
                  value={formData.exportCreatedDate}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Export Created By
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="export created by"
                    value={formData.exportCreatedBy}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Section 1: Basic Information */}
          <div>
            <div className="flex items-center space-x-2 mb-5 pb-2 border-b border-gray-200">
              <FileText className="w-5 h-5 text-teal-600" />
              <h4 className="text-lg font-bold text-gray-800">
                BASIC INFORMATION
              </h4>
            </div>



            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact PIC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Person in charge"
                  value={formData.contactPIC}
                  onChange={(e) => handleInputChange('contactPIC', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Commodity <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type and press Enter to add"
                    value={commodityInput}
                    onChange={(e) => setCommodityInput(e.target.value)}
                    onKeyDown={handleCommodityKeyDown}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                  />

                  {/* Commodity Chips */}
                  {formData.commodities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.commodities.map((commodity, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium"
                        >
                          {commodity}
                          <button
                            type="button"
                            onClick={() => removeCommodity(commodity)}
                            className="hover:bg-teal-200 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Commodity Suggestions */}
                  {/* {commodityInput && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {commoditySuggestions
                        .filter(s => s.toLowerCase().includes(commodityInput.toLowerCase()))
                        .map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              addCommodity(suggestion);
                              setCommodityInput('');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                          >
                            {suggestion}
                          </button>
                        ))}
                    </div>
                  )} */}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* Contact Details - 2/3 */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Details
                </label>
                <div className="grid grid-cols-2 gap-6">
                  <input
                    type="number"
                    placeholder="Phone Number"
                    value={formData.contactDetailsNumber}
                    onChange={(e) =>
                      handleInputChange('contactDetailsNumber', e.target.value)
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.contactDetailsEmail}
                    onChange={(e) =>
                      handleInputChange('contactDetailsEmail', e.target.value)
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Job Type - 1/3 */}
              <div className="col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job Type
                </label>
                <div>
                  <select
                    value={formData.jobType}
                    onChange={(e) => handleInputChange('jobType', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">None</option>
                    <option value="forwarding">Forwarding</option>
                    <option value="liner">Liner</option>
                    <option value="cross-trade">Cross-Trade</option>
                    <option value="others">Others (Voyage Level)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Agent
                </label>
                <input
                  type="text"
                  placeholder="Enter agent name"
                  value={formData.agent}
                  onChange={(e) => handleInputChange('agent', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Carrier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter carrier name"
                  value={formData.carrierName}
                  onChange={(e) => handleInputChange('carrierName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div> */}
            </div>
          </div>

          {/* Section 2: Container Details */}
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-200">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-teal-600" />
                <h4 className="text-lg font-bold text-gray-800">CONTAINER DETAILS</h4>
              </div>
              <button
                onClick={addEquipmentRow}
                type="button"
                className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Row</span>
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-auto">
              <table className="w-full min-w-[1000px] overflow-auto">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Equipment Type *</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Volume</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Category</th>
                    {/* <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th> */}
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Quote</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Cost</th>
                    {/* <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Margin</th> */}
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {equipmentRows.map((row) => {
                    // const quote = Number(row.quote);
                    // const cost = Number(row.cost);
                    // const volume = Number(row.volume);
                    // const margin = !isNaN(quote) && !isNaN(cost) ? volume * (quote - cost) : '';

                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <select
                            value={row.equipmentType}
                            onChange={(e) => updateRow(row.id, 'equipmentType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">None</option>
                            <option>40 HC RF</option>
                            <option>40 HQ</option>
                            <option>SOC</option>
                            <option>Tank (generic – “Tank”)</option>
                            <option>Truck</option>
                            <option>ISO Tanks</option>

                            <option>20GP</option>
                            <option>40GP</option>
                            <option>45HC</option>
                            <option>Reefer 20</option>
                            <option>Reefer 40</option>
                            <option>LCL</option>
                            <option>B/Bulk</option>
                            <option>Air Shipment</option>
                            <option>Roro</option>
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[1-9][0-9]*"
                            placeholder="Qty"
                            value={row.volume}
                            onChange={(e) => {
                              const value = e.target.value;

                              if (value === '' || /^[1-9]\d*$/.test(value)) {
                                updateRow(row.id, 'volume', e.target.value)
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={row.category}
                            onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">None</option>
                            <option>SOC</option>
                            <option>Laden</option>
                            <option>Road</option>
                            <option>Heavy Duty (HD)</option>
                            <option>GP</option>
                            <option>Reefer</option>
                            <option>DG</option>
                            <option>SPL</option>
                            <option>Empty</option>
                            <option>CBM</option>
                            <option>Weight</option>
                            <option>Full Truck Load</option>
                            <option>Flat rack</option>
                            <option>Open Top</option>
                          </select>
                        </td>
                        {/* <td className="px-4 py-3">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td> */}

                        <td className="px-4 py-3">
                          <textarea
                            type="text"
                            placeholder="Quote"
                            value={row.quote}
                            onChange={(e) => {
                              updateRow(row.id, 'quote', e.target.value)

                              e.target.style.height = '2.4rem'
                              e.target.style.height = `${e.target.scrollHeight}px`
                            }}
                            className="w-full h-[2.4rem] flex self-center px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <textarea
                            type="text"
                            placeholder="Cost"
                            value={row.cost}
                            onChange={(e) => {
                              updateRow(row.id, 'cost', e.target.value)
                              e.target.style.height = '2.5rem'
                              e.target.style.height = `${e.target.scrollHeight}px`
                            }}
                            className="w-full h-[2.5rem] flex self-center px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td>

                        {/* <td className="px-4 py-3">
                          <input
                            type="text"
                            value={margin}
                            readOnly
                            className={`w-full px-3 py-2 rounded-lg text-sm bg-gray-100 border ${margin < 0 ? 'border-red-400 text-red-600' : 'border-gray-300'
                              }`}
                          />
                        </td> */}

                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeEquipmentRow(row.id)}
                            disabled={equipmentRows.length === 1}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {/* <tr className="bg-gray-100 font-bold">
                    <td colSpan={4} className="px-4 py-3 text-left text-sm text-gray-700">
                      Total
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {totals.quote.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {totals.cost.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-sm ${totals.margin < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {totals.margin.toFixed(2)}
                    </td>
                    <td />
                  </tr> */}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Other Charges */}
          <div>
            <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-gray-200">
              <DollarSign className="w-5 h-5 text-teal-600" />
              <h4 className="text-lg font-bold text-gray-800">OTHER CHARGES</h4>
            </div>
            <textarea
              rows="3"
              placeholder="Enter any additional charges or fees..."
              value={formData.otherCharges}
              onChange={(e) => handleInputChange('otherCharges', e.target.value)}
              className="w-full min-h-[3rem] px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            ></textarea>
          </div>

          {/* Section 4: Shipment Details */}
          <div>
            <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-gray-200">
              <MapPin className="w-5 h-5 text-teal-600" />
              <h4 className="text-lg font-bold text-gray-800">SHIPMENT DETAILS</h4>
            </div>
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  POL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Port of Loading"
                  value={formData.pol}
                  onChange={(e) => handleInputChange('pol', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  POD <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Port of Discharge"
                  value={formData.pod}
                  onChange={(e) => handleInputChange('pod', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  FPOD <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Final POD"
                  value={formData.fpod}
                  onChange={(e) => handleInputChange('fpod', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Terms of Shipment <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.termsOfShipment}
                  onChange={(e) => handleInputChange('termsOfShipment', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Select Terms</option>
                  <option>Prepaid</option>
                  <option>Collect</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Haulier Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter code"
                  value={formData.haulierCode}
                  onChange={(e) => handleInputChange('haulierCode', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              {/* <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.shipmentDate}
                  onChange={(e) => handleInputChange('shipmentDate', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div> */}
              <div className='col-span-2'>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  type="text"
                  placeholder="Enter Remarks"
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Additional Services */}
          <div>
            <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-gray-200">
              <Truck className="w-5 h-5 text-teal-600" />
              <h4 className="text-lg font-bold text-gray-800">ADDITIONAL SERVICES</h4>
            </div>
            <div className="grid grid-cols-4 gap-6">
              <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.hbl}
                  onChange={(e) => handleInputChange('hbl', e.target.checked)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">HBL</span>
              </label>
              <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.fac}
                  onChange={(e) => handleInputChange('fac', e.target.checked)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">FAC</span>
              </label>
              <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.documentation}
                  onChange={(e) => handleInputChange('documentation', e.target.checked)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">Documentation</span>
              </label>
              <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.transportation}
                  onChange={(e) => handleInputChange('transportation', e.target.checked)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">Transportation</span>
              </label>
            </div>
          </div>
          {
            formData.transportation && (
              <div className="border border-gray-200 rounded-lg overflow-auto">
                <div className="flex justify-between align-center text-align-center px-4 py-2">
                  <typography className="text-lg font-bold text-gray-800 flex items-center text-center">Transportation</typography>
                  <button
                    type="button"
                    onClick={addNewTransportationRow}
                    className="flex items-center space-x-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Row</span>
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-auto">
                  <table className="w-full min-w-[1000px] overflow-auto">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Equipment Type *</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">No. of Containers</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Placement Date & Time</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Pickup/Delivery Location</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Special Remarks</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transportationRows.map((row) => {

                        return (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <select
                                value={row.equipmentType}
                                onChange={(e) => updateTransportationRow(row.id, 'equipmentType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">None</option>
                                <option>40 HC RF</option>
                                <option>40 HQ</option>
                                <option>SOC</option>
                                <option>Tank (generic – “Tank”)</option>
                                <option>Truck</option>
                                <option>ISO Tanks</option>

                                <option>20GP</option>
                                <option>40GP</option>
                                <option>45HC</option>
                                <option>Reefer 20</option>
                                <option>Reefer 40</option>
                                <option>LCL</option>
                                <option>B/Bulk</option>
                                <option>Air Shipment</option>
                                <option>Roro</option>
                              </select>
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[1-9][0-9]*"
                                placeholder="Qty"
                                value={row.container ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^[1-9]\d*$/.test(value)) {
                                    updateTransportationRow(row.id, 'container', value);
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />

                            </td>

                            <td className="px-4 py-3">
                              <select
                                value={row.category}
                                onChange={(e) => updateTransportationRow(row.id, 'category', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">None</option>
                                <option>SOC</option>
                                <option>Laden</option>
                                <option>Road</option>
                                <option>Heavy Duty (HD)</option>
                                <option>GP</option>
                                <option>Reefer</option>
                                <option>DG</option>
                                <option>SPL</option>
                                <option>Empty</option>
                                <option>CBM</option>
                                <option>Weight</option>
                                <option>Full Truck Load</option>
                                <option>Flat rack</option>
                                <option>Open Top</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="datetime-local"
                                value={row.date}
                                onChange={(e) => updateTransportationRow(row.id, 'date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="Enter Location"
                                value={row.location}
                                onChange={(e) => updateTransportationRow(row.id, 'location', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </td>

                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="CFS stuffing, Warehouse stuffing, etc."
                                value={row.remarks}
                                onChange={(e) => updateTransportationRow(row.id, 'remarks', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </td>

                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeTransportationRow(row.id)}
                                disabled={transportationRows.length === 1}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>

                            {/* <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeTransportationRow(row.id)}
                            disabled={equipmentRows.length === 1}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td> */}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            )
          }

          {/* Section 6: Special Instructions */}
          <div>
            <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-gray-200">
              <FileText className="w-5 h-5 text-teal-600" />
              <h4 className="text-lg font-bold text-gray-800">SPECIAL INSTRUCTIONS</h4>
            </div>
            <textarea
              rows="4"
              placeholder="Enter any special instructions or requirements..."
              value={formData.specialInstructions}
              onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            ></textarea>
          </div>

          {/* Section 7: Approvers */}
          <div>
            <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-gray-200">
              <Users className="w-5 h-5 text-teal-600" />
              <h4 className="text-lg font-bold text-gray-800">APPROVERS</h4>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name of Executive</label>
                <input
                  type="text"
                  placeholder="Sales executive"
                  value={formData.executiveName}
                  onChange={(e) => handleInputChange('executiveName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name of Sales HOD <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Sales HOD"
                  value={formData.salesHOD}
                  onChange={(e) => handleInputChange('salesHOD', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              {/* <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Job Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.jobStatus}
                  onChange={(e) => handleInputChange('jobStatus', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option>Submitted</option>
                  <option>HOD Approved</option>
                  <option>Rejected</option>
                  <option>In Execution</option>
                  <option>Completed</option>
                </select>
              </div> */}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-4 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              // onClick={handleSave}
              className="px-10 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-md"
            >
              SUBMIT
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-md"
            >
              SAVE
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-10 py-3 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-lg transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
};

const Approval = () => {
  const [bankSlip, setBankSlip] = useState(null);

  const [formData, setFormData] = useState({
    exportNo: '',
    exportCreatedDate: '',
    destination: '',
    commodity: '',
    portOfLoad: '',
    portOfDischarge: '',
    placeOfReceipt: '',
    placeOfDelivery: '',
    modeOfShipment: '',
    typeOfShipment: '',
    dgr: '',
    incoterm: '',
    salesQuotationNo: '',
    customerRefNo: '',
    jobNo: '',
    bookingVessel: '',
    bookingVoyage: '',
    vesselETA: '',
    bookingRefNo: '',
    cutOffDate: '',
    cutOffTime: '',
    bookingRemarks: '',
    cnfRemarks: '',
    accountsRemarks: '',
    executiveName: '',
    totalCharges: '',
    otherCharges: [],
  });

  const [containerRows, setContainerRows] = useState([
    {
      id: 1,
      equipmentType: '',
      volume: '',
      category: '',
      quote: '',
      cost: '',
    }
  ]);
  const [placementRows, setPlacementRows] = useState([
    {
      id: 1,
      equipmentType: '',
      volume: '',
      category: '',
      date: '',
      time: '',
      remarks: '',
    }
  ]);
  const [otherChargeInput, setOtherChargeInput] = useState('');
  const [remarksAttach, setRemarksAttach] = useState([]);
  const [newRemark, setNewRemark] = useState("");
  const [attachmentsR, setAttachmentsR] = useState([]);
  const approvalRows = [
    {
      id: 1,
      stage: 'Pending SalesHOD and CSV Updation Team Approval',
      pendingWith: 'CSVUpdation',
      updatedBy: 'Gouthaman T (CSV)',
      status: 'Approved ',
      updatedDate: '2025-11-03'
    }
  ]

  const addRemark = () => {
    if (!newRemark.trim()) return;
    setRemarksAttach([...remarksAttach, newRemark]);
    setNewRemark("");
  };
  const removeRemark = (index) => {
    setRemarksAttach(remarksAttach.filter((_, i) => i !== index));
  }
  const addAttachments = (files) => {
    setAttachmentsR([...attachmentsR, ...Array.from(files)]);
  };

  const removeAttachment = (index) => {
    setAttachmentsR(attachmentsR.filter((_, i) => i !== index));
  };

  /* ---------------- Handlers ---------------- */
  const addOtherCharge = () => {
    const value = otherChargeInput.trim();
    if (!value) return;

    setFormData(prev => {
      const exists = prev.otherCharges.some(
        charge => charge.toLowerCase() === value.toLowerCase()
      );

      if (exists) return prev;

      return {
        ...prev,
        otherCharges: [...prev.otherCharges, value]
      };
    });

    setOtherChargeInput('');
  };

  const removeOtherCharge = index => {
    setFormData(prev => ({
      ...prev,
      otherCharges: prev.otherCharges.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (field, value) => {
    if (field === 'otherCharges') {
      setFormData(prev => ({ ...prev, [field]: [...prev[field], value] }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const updateContainerRow = (id, field, value) => {
    setContainerRows(prev =>
      prev.map(row => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addContainerRow = () => {
    setContainerRows(prev => [
      ...prev,
      {
        id: Date.now(),
        equipmentType: '',
        volume: '',
        category: '',
        quote: '',
        cost: ''
      }
    ]);
  };

  const removePlacementRow = id => {
    if (placementRows.length > 1) {
      setPlacementRows(prev => prev.filter(row => row.id !== id));
    }
  };
  const updatePlacementRow = (id, field, value) => {
    setPlacementRows(prev =>
      prev.map(row => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addPlacementRow = () => {
    setPlacementRows(prev => [
      ...prev,
      {
        id: Date.now(),
        equipmentType: '',
        volume: '',
        category: '',
        date:'',
        time:'',
        remarks:''
      }
    ]);
  };

  const removeContainerRow = id => {
    if (containerRows.length > 1) {
      setContainerRows(prev => prev.filter(row => row.id !== id));
    }
  };

  const handleSave = () => {
    const payload = {
      ...formData,
      containerRows,
      bankSlip,
      attachmentsR,
      updatedAt: new Date().toISOString()
    };

    console.log('Approval Save Payload:', payload);
    alert('Form saved successfully');
  };

  const handleCancel = () => {
    if (window.confirm('Discard all changes?')) {
      window.location.reload();
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Page Header */}
      {/* <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Create New Booking</h2>
        <p className="text-gray-600">Export Forwarding Process - Complete all required fields</p>
      </div> */}

      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Form Header */}
        <div className="bg-teal-600 px-8 py-5">
          <div className="flex items-center space-x-3 justify-between">
            <div className='flex items-center space-x-3'>
              <Ship className="w-6 h-6 text-white" />
              <div>
                <h3 className="text-xl font-bold text-white">EXPORT DETAILS (BOOKING NOTE – F30-03-01/JAN, 2018)</h3>
                <p className="text-teal-100 text-sm mt-1">Fields marked with * are required</p>
              </div>
            </div>
            {/* <div><select className="bg-white align-end text-gray-900 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500">
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select></div> */}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8 space-y-8">

          {/* Shipment Details */}
          <section className="mb-8">
            <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-gray-200">

              <h4 className="text-lg font-bold text-gray-800">EXPORT DETAILS</h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                ['Export Number', 'exportNo', 'Please Select the Job Type'],
                ['Export Created Date', 'exportCreatedDate', 'Created Date'],
                ['Export Created By', 'destination', 'Created By'],
                ['Carrier Name', 'commodity', 'Carrier Name'],
                ['Customer Name', 'portOfLoad', 'Customer Name'],
                ['Contact PIC', 'portOfDischarge', 'Contact PIC'],
                ['Contact Details', 'placeOfReceipt', 'Contact Details'],
                ['Commodity', 'placeOfDelivery', 'Commodity'],
              ].map(([label, field, placeholder]) => (
                <div key={field}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                  {field === 'exportCreatedDate' ? <input type="date" placeholder={placeholder} value={formData[field]} onChange={e => handleInputChange(field, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /> : <input
                    value={formData[field]}
                    placeholder={placeholder}
                    onChange={e => handleInputChange(field, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />}
                </div>
              ))}
            </div>
          </section>

          {/* Container Details */}
          <section className="mb-8">
            <div className="flex justify-between mb-3">
              <div className="flex items-center space-x-2 mb-4 pb-2 grid grid-cols-5 border-b-2 border-gray-200">
                <div>

                  <h4 className="text-lg font-bold text-gray-800">CONTAINER DETAILS</h4></div>
              </div>
              <button
                type="button"
                onClick={addContainerRow}
                className="px-4 py-2 mb-4 pb-2 bg-teal-600 text-white rounded"
              >
                + Add Container
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-auto mb-2">
              <table className="w-full min-w-[1000px] overflow-auto">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Equipment Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Volume</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Quote</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {containerRows.map(row => (
                    <tr key={row.id}>
                      {[
                        ['equipmentType', 'Enter Equipment Type'],
                        ['volume', 'Qty'],
                        ['category', 'Enter Category'],
                        ['quote', 'Enter Quote'],
                        ['cost', 'Enter Cost'],
                      ].map(([field, placeholder]) => (
                      <td key={field} className='px-4 py-3'>
                        {field === 'equipmentType' && (
                          <select
                            value={row[field]}
                            onChange={e => updateContainerRow(row.id, field, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">None</option>
                            <option>40 HC RF</option>
                            <option>40 HQ</option>
                            <option>SOC</option>
                            <option>Tank (generic – “Tank”)</option>
                            <option>Truck</option>
                            <option>ISO Tanks</option>

                            <option>20GP</option>
                            <option>40GP</option>
                            <option>45HC</option>
                            <option>Reefer 20</option>
                            <option>Reefer 40</option>
                            <option>LCL</option>
                            <option>B/Bulk</option>
                            <option>Air Shipment</option>
                            <option>Roro</option>
                          </select>
                        )}
                        {field === 'volume' && (<td>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[1-9][0-9]*"
                            placeholder={placeholder}
                            value={row.volume}
                            onChange={(e) => {
                              const value = e.target.value;

                              if (value === '' || /^[1-9]\d*$/.test(value)) {
                                updateContainerRow(row.id, 'volume', e.target.value)
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td>)}

                        {field === 'category' && (<td >
                          <select
                            value={row.category}
                            onChange={(e) => updateContainerRow(row.id, field, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">None</option>
                            <option>SOC</option>
                            <option>Laden</option>
                            <option>Road</option>
                            <option>Heavy Duty (HD)</option>
                            <option>GP</option>
                            <option>Reefer</option>
                            <option>DG</option>
                            <option>SPL</option>
                            <option>Empty</option>
                            <option>CBM</option>
                            <option>Weight</option>
                            <option>Full Truck Load</option>
                            <option>Flat rack</option>
                            <option>Open Top</option>
                          </select>
                        </td>)}
                        {/* <td className="px-4 py-3">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td> */}

                        {field === 'quote' && (<td >
                          <textarea
                            type="text"
                            placeholder={placeholder}
                            value={row.quote}
                            onChange={(e) => {
                              updateContainerRow(row.id, 'quote', e.target.value)

                              e.target.style.height = '2.4rem'
                              e.target.style.height = `${e.target.scrollHeight}px`
                            }}
                            className="w-full h-[2.4rem] flex self-center px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td>)}

                       {(field === 'cost' && <td >
                          <textarea
                            type="text"
                            placeholder={placeholder}
                            value={row.cost}
                            onChange={(e) => {
                              updateContainerRow(row.id, 'cost', e.target.value)
                              e.target.style.height = '2.5rem'
                              e.target.style.height = `${e.target.scrollHeight}px`
                            }}
                            className="w-full h-[2.5rem] flex self-center px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td>)}

                        {/* <td className="px-4 py-3">
                          <input
                            type="text"
                            value={margin}
                            readOnly
                            className={`w-full px-3 py-2 rounded-lg text-sm bg-gray-100 border ${margin < 0 ? 'border-red-400 text-red-600' : 'border-gray-300'
                              }`}
                          />
                        </td> */}
                      </td>
                      ))}
                      <td className="text-center">
                        <button

                          onClick={() => removeContainerRow(row.id)}
                          disabled={containerRows.length === 1}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-gray-200">
                <h4 className="text-lg font-bold text-gray-800">OTHER CHARGES</h4>
              </div>

              <div className="w-full min-h-[3rem] px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-teal-500">

                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                  {formData.otherCharges.map((charge, index) => (
                    <span
                      key={index}
                      className="flex items-center text-align-center bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm"
                    >
                      {charge}
                      <button
                        onClick={() => removeOtherCharge(index)}
                        className="ml-2 text-teal-600 hover:text-red-500 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Input */}
                <input
                  type="text"
                  placeholder="Type a charge and press Enter..."
                  value={otherChargeInput}
                  onChange={e => setOtherChargeInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addOtherCharge();
                    }
                  }}
                  className="w-full outline-none text-sm"
                />
              </div>
            </div>

          </section>
          <section className="mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-gray-200">

                <h4 className="text-lg font-bold text-gray-800">OTHER DETAILS</h4>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    POL
                  </label>
                  <input
                    type="text"
                    placeholder="Port of Loading"
                    value={formData.pol}
                    onChange={(e) => handleInputChange('pol', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    POD
                  </label>
                  <input
                    type="text"
                    placeholder="Port of Discharge"
                    value={formData.pod}
                    onChange={(e) => handleInputChange('pod', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    FPOD
                  </label>
                  <input
                    type="text"
                    placeholder="Final POD"
                    value={formData.fpod}
                    onChange={(e) => handleInputChange('fpod', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Terms of Shipment
                  </label>
                  <select
                    value={formData.termsOfShipment}
                    onChange={(e) => handleInputChange('termsOfShipment', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select Terms</option>
                    <option>Prepaid</option>
                    <option>Collect</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Haulier Code
                  </label>
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={formData.haulierCode}
                    onChange={(e) => handleInputChange('haulierCode', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <label className="flex h-[100%] justify-between items-center space-x-2 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">

                  <span className="text-sm font-medium text-gray-700">HBL</span>

                  <input
                    type="checkbox"
                    checked={formData.hbl}
                    onChange={(e) => handleInputChange('hbl', e.target.checked)}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                </label>
                <label className="flex h-[100%] justify-between items-center space-x-2 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">

                  <span className="text-sm font-medium text-gray-700">FAC</span>

                  <input
                    type="checkbox"
                    checked={formData.fac}
                    onChange={(e) => handleInputChange('fac', e.target.checked)}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                </label>
                <label className="flex h-[100%] justify-between items-center space-x-2 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">

                  <span className="text-sm font-medium text-gray-700">Documentation</span>

                  <input
                    type="checkbox"
                    checked={formData.documentation}
                    onChange={(e) => handleInputChange('documentation', e.target.checked)}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                </label>
                <label className="flex h-[100%] justify-between items-center space-x-2 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">

                  <span className="text-sm font-medium text-gray-700">Transportation</span>

                  <input
                    type="checkbox"
                    checked={formData.transportation}
                    onChange={(e) => handleInputChange('transportation', e.target.checked)}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                </label>
                <div className='col-span-3'>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Special Instruction if Any
                  </label>
                  <textarea
                    type="text"
                    placeholder="Enter Remarks"
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div className='col-span-3'>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name of Executive
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Name"
                    value={formData.executiveName}
                    onChange={(e) => handleInputChange('executiveName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </section>
          <section className="mb-8">
            <div className="flex justify-between mb-3">
              <div className="flex items-center space-x-2 mb-4 pb-2 grid grid-cols-5 border-b-2 border-gray-200">
                <div>

                  <h4 className="text-lg font-bold text-gray-800">PLACEMENT DETAILS</h4></div>
              </div>
              <button
                type="button"
                onClick={addPlacementRow}
                className="px-4 py-2 mb-4 pb-2 bg-teal-600 text-white rounded"
              >
                + Add Container
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-auto mb-2">
              <table className="w-full min-w-[1000px] overflow-auto">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Equipment Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Volume</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Remarks</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {placementRows.map(row => (
                    <tr key={row.id}>
                      {[
                        ['equipmentType', 'Enter Equipment Type'],
                        ['volume', 'Enter Volume'],
                        ['category', 'Enter Category'],
                        ['date', 'Enter Date'],
                        ['time', 'Enter Time'],
                        ['remarks', 'Enter Remarks'],
                      ].map(([field, placeholder]) => (
                      <td key={field} className='px-4 py-3'>
                        {field === 'equipmentType' && (
                          <select
                            value={row[field]}
                            onChange={e => updatePlacementRow(row.id, field, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">None</option>
                            <option>40 HC RF</option>
                            <option>40 HQ</option>
                            <option>SOC</option>
                            <option>Tank (generic – “Tank”)</option>
                            <option>Truck</option>
                            <option>ISO Tanks</option>

                            <option>20GP</option>
                            <option>40GP</option>
                            <option>45HC</option>
                            <option>Reefer 20</option>
                            <option>Reefer 40</option>
                            <option>LCL</option>
                            <option>B/Bulk</option>
                            <option>Air Shipment</option>
                            <option>Roro</option>
                          </select>
                        )}
                        {field === 'volume' && (<td>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[1-9][0-9]*"
                            placeholder="Qty"
                            value={row.volume}
                            onChange={(e) => {
                              const value = e.target.value;

                              if (value === '' || /^[1-9]\d*$/.test(value)) {
                                updatePlacementRow(row.id, 'volume', e.target.value)
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td>)}

                        {field === 'category' && (<td >
                          <select
                            value={row.category}
                            onChange={(e) => updatePlacementRow(row.id, field, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">None</option>
                            <option>SOC</option>
                            <option>Laden</option>
                            <option>Road</option>
                            <option>Heavy Duty (HD)</option>
                            <option>GP</option>
                            <option>Reefer</option>
                            <option>DG</option>
                            <option>SPL</option>
                            <option>Empty</option>
                            <option>CBM</option>
                            <option>Weight</option>
                            <option>Full Truck Load</option>
                            <option>Flat rack</option>
                            <option>Open Top</option>
                          </select>
                        </td>)}
                        {/* <td className="px-4 py-3">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td> */}

                        {field === 'date' && (<td >
                          <input
                            type="date"
                            placeholder={placeholder}
                            value={row.date}
                            onChange={(e) => {
                              updatePlacementRow(row.id, 'date', e.target.value)

                              e.target.style.height = '2.4rem'
                              e.target.style.height = `${e.target.scrollHeight}px`
                            }}
                            className="w-full h-[2.4rem] flex self-center px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td>)}
                        {field === 'time' && (<td >
                          <input
                            type="time"
                            placeholder={placeholder}
                            value={row.time}
                            onChange={(e) => {
                              updatePlacementRow(row.id, 'time', e.target.value)

                              e.target.style.height = '2.4rem'
                              e.target.style.height = `${e.target.scrollHeight}px`
                            }}
                            className="w-full h-[2.4rem] flex self-center px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td>)}

                       {(field === 'remarks' && <td >
                          <textarea
                            type="text"
                            placeholder={placeholder}
                            value={row.remarks}
                            onChange={(e) => {
                              updatePlacementRow(row.id, 'remarks', e.target.value)
                              e.target.style.height = '2.5rem'
                              e.target.style.height = `${e.target.scrollHeight}px`
                            }}
                            className="w-full h-[2.5rem] flex self-center px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td>)}

                        {/* <td className="px-4 py-3">
                          <input
                            type="text"
                            value={margin}
                            readOnly
                            className={`w-full px-3 py-2 rounded-lg text-sm bg-gray-100 border ${margin < 0 ? 'border-red-400 text-red-600' : 'border-gray-300'
                              }`}
                          />
                        </td> */}
                      </td>
                      ))}
                      <td className="text-center">
                        <button

                          onClick={() => removePlacementRow(row.id)}
                          disabled={placementRows.length === 1}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-gray-200">
                <h4 className="text-lg font-bold text-gray-800">BOOKING DETAILS</h4>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    AFSYS Job No.
                  </label>
                  <input
                    type="text"
                    placeholder="Afsys Job No."
                    value={formData.afsysJobNo}
                    onChange={(e) => handleInputChange('afsysJobNo', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Booking Vessel
                  </label>
                  <input
                    type="text"
                    placeholder="Booking Vessel"
                    value={formData.bookingVessel}
                    onChange={(e) => handleInputChange('bookingVoyage', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Booking Voyage
                  </label>
                  <input
                    type="text"
                    placeholder="Booking Voyage"
                    value={formData.bookingVoyage}
                    onChange={(e) => handleInputChange('bookingVoyage', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vessel ETA Date
                  </label>
                  <input
                    type="date"
                    value={formData.vesselETA}
                    onChange={(e) => handleInputChange('vesselETA', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Booking Reference No.
                  </label>
                  <input
                    type="text"
                    placeholder="Booking Reference No."
                    value={formData.bookingRefNo}
                    onChange={(e) => handleInputChange('bookingRefNo', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Load List/SI Cut Off Date
                  </label>
                  <input
                    type="date"
                    value={formData.siCutOffDate}
                    onChange={(e) => handleInputChange('siCutOffDate', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Load List/SI Cut Off Time
                  </label>
                  <input
                    type="time"
                    value={formData.siCutOffTime}
                    onChange={(e) => handleInputChange('siCutOffTime', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Release Order From Carrier
                  </label>
                  <a
                    href="#"
                    className="w-full flex justify-start items-center text-blue-500 rounded-lg text-sm focus:outline-none "
                  > Click here to view <MoveUpRight className="w-4 h-4" /></a>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    BOC Attachment
                  </label>
                  <a
                    href="#"
                    className="w-full flex justify-starts items-center text-blue-500 rounded-lg text-sm focus:outline-none "
                  > Click here to view <MoveUpRight className="w-4 h-4" /></a>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Booking Remarks
                  </label>


                  <textarea
                    type="text"
                    placeholder="Enter Remarks"
                    value={formData.bookingRemarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />

                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Haulage Cost Sheet
                  </label>
                  <a
                    href="#"
                    className="w-full flex justify-starts items-center text-blue-500 rounded-lg text-sm focus:outline-none "
                  > Click here to view <MoveUpRight className="w-4 h-4" /></a>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Load List
                  </label>
                  <a
                    href="#"
                    className="w-full flex justify-starts items-center text-blue-500 rounded-lg text-sm focus:outline-none "
                  > Click here to view <MoveUpRight className="w-4 h-4" /></a>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CNF Remarks
                  </label>


                  <textarea
                    type="text"
                    placeholder="Enter Remarks"
                    value={formData.cnfRemarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />

                </div>
              </div>

            </div>
          </section>
          <section className="mb-8 grid grid-cols-3 gap-6">
            <div className="w-full max-w-md cols-span-1 gap-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Slip
              </label>

              {/* Upload Button */}
              {!bankSlip && (
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full cursor-pointer hover:bg-gray-200 transition">
                  <UploadCloud className="w-4 h-4" />
                  Upload bank slip
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setBankSlip(e.target.files[0])}
                  />
                </label>
              )}

              {/* File Chip */}
              {bankSlip && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 mt-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded-full">
                  <FileText className="w-4 h-4" />
                  <span className="max-w-[180px] truncate">
                    {bankSlip.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => setBankSlip(null)}
                    className="hover:text-green-900 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className='cols-span-1'>
              <label className="font-medium">Account Remarks</label>
              <textarea
                value={formData.accountRemarks}
                // onChange={e => (e.target.value)} 
                className="w-full min-h-[120px] border rounded p-3"
              />
            </div>
          </section>
          <section className="mb-8 grid grid-cols-1 gap-6">
            <div>
              <div className="flex items-center space-x-2 grid-cols-2 mb-4 pb-2 border-b-2 border-gray-200">

                <h4 className="text-lg font-bold text-gray-800">DOCUMENTS</h4>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    LPO
                  </label>
                  <a
                    href="#"
                    className="w-full flex justify-start items-center text-blue-500 rounded-lg text-sm focus:outline-none "
                  > Click here to view <MoveUpRight className="w-4 h-4" /></a>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    INVOICE
                  </label>
                  <a
                    href="#"
                    className="w-full flex justify-start items-center text-blue-500 rounded-lg text-sm focus:outline-none "
                  > Click here to view <MoveUpRight className="w-4 h-4" /></a>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    FAC
                  </label>
                  <a
                    href="#"
                    className="w-full flex justify-start items-center text-blue-500 rounded-lg text-sm focus:outline-none "
                  > Click here to view <MoveUpRight className="w-4 h-4" /></a>
                </div>
              </div>
            </div>
          </section>
          <section className="mb-8">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-gray-200">
              <h4 className="text-lg font-bold text-gray-800">
                ATTACHMENT AND COMMENTS
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* LEFT – REMARKS */}
              <div>
                <label className="block font-medium mb-2">REMARKS</label>

                {/* Existing remarks */}
                <div className="space-y-3 mb-6">
                  {remarksAttach.map((remark, i) => (
                    <div
                      key={i}
                      className="relative bg-sky-50 border border-sky-200 rounded-md p-4 text-sm text-gray-700"
                    >
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeRemark(i)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Remark text */}
                      <p className="pr-6 leading-relaxed">
                        {remark}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Add remark */}
                <label className="block font-medium mb-1">ADD REMARKS</label>
                <textarea
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="Enter your remarks here..."
                  className="w-full min-h-[110px] border border-gray-300 rounded-md p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />

                <button
                  type="button"
                  onClick={addRemark}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 transition"
                >
                  Add Remark
                </button>
              </div>


              {/* RIGHT – ATTACHMENTS */}
              <div>
                <label className="block font-medium mb-2">ATTACHMENTS</label>

                {/* Attachment chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {attachmentsR.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-sky-400 text-sky-700 rounded-full bg-sky-50"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="max-w-[180px] truncate">
                        {file.name}
                      </span>
                      <button onClick={() => removeAttachment(index)}>
                        <X className="w-4 h-4 hover:text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Upload box */}
                <label className="block font-medium mb-2">ADD ATTACHMENTS</label>
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Paperclip className="w-5 h-5" />
                    Choose Files
                  </div>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => addAttachments(e.target.files)}
                  />
                </label>
              </div>
            </div>
          </section>
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-200">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-teal-600" />
                <h4 className="text-lg font-bold text-gray-800">CONTAINER DETAILS</h4>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-auto">
              <table className="w-full min-w-[1000px] overflow-auto">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase text-nowrap">
                      Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Pending With</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">	Updated By</th>
                    {/* <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th> */}
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Updated Date</th>
                    {/* <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Margin</th> */}
                    {/* <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase w-20">Action</th> */}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approvalRows.map((row) => {
                    // const quote = Number(row.quote);
                    // const cost = Number(row.cost);
                    // const volume = Number(row.volume);
                    // const margin = !isNaN(quote) && !isNaN(cost) ? volume * (quote - cost) : '';

                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {row.stage}
                        </td>

                        <td className="px-4 py-3">
                          {row.pendingWith}
                        </td>

                        <td className="px-4 py-3">
                          {row.updatedBy}
                        </td>
                        {/* <td className="px-4 py-3">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </td> */}

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border
      ${row.status.trim() === "Approved"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                : row.status === "Pending"
                                  ? "bg-amber-100 text-amber-700 border-amber-300"
                                  : row.status === "Rejected"
                                    ? "bg-red-100 text-red-700 border-red-300"
                                    : row.status === "In Progress"
                                      ? "bg-blue-100 text-blue-700 border-blue-300"
                                      : "bg-gray-100 text-gray-700 border-gray-300"
                              }
    `}
                          >
                            {row.status}
                          </span>
                        </td>


                        <td className="px-4 py-3">
                          {row.updatedDate}
                        </td>

                        {/* <td className="px-4 py-3">
                          <input
                            type="text"
                            value={margin}
                            readOnly
                            className={`w-full px-3 py-2 rounded-lg text-sm bg-gray-100 border ${margin < 0 ? 'border-red-400 text-red-600' : 'border-gray-300'
                              }`}
                          />
                        </td> */}

                        {/* <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash className="w-5 h-5" />
                          </button>
                        </td> */}
                      </tr>
                    );
                  })}
                  {/* <tr className="bg-gray-100 font-bold">
                    <td colSpan={4} className="px-4 py-3 text-left text-sm text-gray-700">
                      Total
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {totals.quote.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {totals.cost.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-sm ${totals.margin < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {totals.margin.toFixed(2)}
                    </td>
                    <td />
                  </tr> */}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-300 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-green-600 text-white rounded"
            >
              Save Approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};




// Main App Component
const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
        <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
        {currentPage === 'dashboard' && <ApprovalDashboard />}
        {currentPage === 'approval' && <Approval />}
        {currentPage === 'sales-input' && <SalesInput />}
        {currentPage === 'export-report' && <ExportReport />}
    </div>
  );
};

export default App;