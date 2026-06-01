import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Upload, X, Eye, Plus, Filter, Search, ChevronLeft, ChevronRight, Calendar, MapPin, Briefcase, FileText, Check, File, FileDown, Navigation } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import useDataStore from '../store/dataStore';
import {
  saveCredit,
  getLedger,
  saveLedger,
  getSettings
} from '../utils/storageManager';
import {
  generateId,
  generateSerialNumber,
  formatDate,
  formatCurrency,
  fileToBase64,
  getTodayDate,
  createLedgerEntry,
  calculateBalance
} from '../utils/helpers';

export default function PaymentDetails() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { user } = useAuthStore();
  const { credits, loading: dataLoading, error: dataError } = useDataStore();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    personName: user?.name || '',
    date: getTodayDate(),
    amount: '',
    paymentMode: 'Cash',
    remarks: '',
    regNo: '',
    number: '',
    address: '',
    aadharNo: '',
    illNess: '',
    meetMahantStatus: 'No',
    mahantAmount: ''
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    personName: '',
    mode: '',
    searchQuery: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const filteredCredits = credits.filter(credit => {
    if (filters.fromDate && credit.date < filters.fromDate) return false;
    if (filters.toDate && credit.date > filters.toDate) return false;
    if (filters.personName && credit.personName !== filters.personName) return false;
    if (filters.mode && credit.paymentMode !== filters.mode) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match = (
        (credit.sn && String(credit.sn).toLowerCase().includes(q)) ||
        (credit.personName && credit.personName.toLowerCase().includes(q)) ||
        (credit.date && credit.date.includes(q)) ||
        (credit.amount && String(credit.amount).toLowerCase().includes(q)) ||
        (credit.paymentMode && credit.paymentMode.toLowerCase().includes(q)) ||
        (credit.remarks && credit.remarks.toLowerCase().includes(q))
      );
      if (!match) return false;
    }

    return true;
  });

  const sortedCredits = filteredCredits.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const totalPages = Math.ceil(sortedCredits.length / itemsPerPage);
  const paginatedCredits = sortedCredits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pageTotalAmount = paginatedCredits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalAmount = sortedCredits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setImage(base64);
      setImagePreview(base64);
    } catch (error) {
      toast.error('Error reading image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.personName.trim()) {
      toast.error('Please enter person name');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) < 0) {
      toast.error('Please enter valid donation amount');
      return;
    }

    try {
      setLoading(true);

      const donationAmt = parseFloat(formData.amount || 0);
      const mahantAmt = formData.meetMahantStatus === 'Yes' ? parseFloat(formData.mahantAmount || 0) : 0;
      const combinedTotal = donationAmt + mahantAmt;

      const newCredit = {
        id: generateId(),
        sn: generateSerialNumber(),
        regNo: formData.regNo || '',
        personName: formData.personName,
        number: formData.number || '',
        address: formData.address || '',
        aadharNo: formData.aadharNo || '',
        illNess: formData.illNess || '',
        amount: donationAmt,
        meetMahantStatus: formData.meetMahantStatus,
        mahantAmount: mahantAmt,
        paymentMode: formData.paymentMode,
        image: image || '',
        remarks: formData.remarks,
        date: formData.date,
        status: 'COMPLETED',
        timestamp: new Date().toISOString()
      };

      // Save credit
      saveCredit(newCredit);

      // Calculate new balance
      const updatedCredits = getCredits();
      const newBalance = calculateBalance(
        formData.personName,
        updatedCredits,
        getLedger()
      );

      // Create ledger entry
      const ledgerEntry = createLedgerEntry(
        newCredit.id,
        formData.personName,
        'CREDIT',
        combinedTotal,
        formData.date,
        newCredit.id,
        newBalance
      );

      saveLedger(ledgerEntry);

      toast.success(`Case of ${formatCurrency(combinedTotal)} added successfully!`);

      // Reset form
      setFormData({
        personName: user?.name || '',
        date: getTodayDate(),
        amount: '',
        paymentMode: 'Cash',
        remarks: '',
        regNo: '',
        number: '',
        address: '',
        aadharNo: '',
        illNess: '',
        meetMahantStatus: 'No',
        mahantAmount: ''
      });
      setImage(null);
      setImagePreview('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Automatically close the modal after 3 seconds
      setTimeout(() => {
        setShowFormModal(false);
        setLoading(false);
      }, 3000);

    } catch (error) {
      console.error(error);
      toast.error('Error adding case');
      setLoading(false);
    }
  };

  const handleImageView = (imageBase64) => {
    setSelectedImage(imageBase64);
    setShowImageModal(true);
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 font-medium">Loading data from Supabase...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm font-semibold text-red-600">Failed to load data</p>
          <p className="text-xs text-gray-500">{dataError}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full">
        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center">

          {/* Search + Add Filter Button Row (Mobile grouping) */}
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search all fields..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px]"
              />
            </div>
            {/* Mobile Filter Button */}
            <button
               onClick={() => setShowMobileFilters(!showMobileFilters)}
               className={`lg:hidden flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={14} />
            </button>
            {/* Mobile Add Button */}
            <button
              onClick={() => setShowFormModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Filters */}
          <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:flex grid-cols-2 md:grid-cols-4 lg:flex-row gap-2 w-full lg:w-auto lg:flex-[4] items-center`}>
             <input
               type="text"
               placeholder="From Date"
               onFocus={(e) => (e.target.type = 'date')}
               onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
               value={filters.fromDate}
               onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-sky-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             />
             <input
               type="text"
               placeholder="To Date"
               onFocus={(e) => (e.target.type = 'date')}
               onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
               value={filters.toDate}
               onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-sky-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             />
             <select
               value={filters.personName}
               onChange={(e) => setFilters({ ...filters, personName: e.target.value })}
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-sky-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             >
               <option value="">All Persons</option>
               {Array.from(new Set(credits.map(c => c.personName))).map(person => (
                 <option key={person} value={person}>{person}</option>
               ))}
             </select>
             <select
               value={filters.mode}
               onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
               className="w-full bg-white border border-gray-300 rounded-lg lg:rounded px-2 py-1.5 focus:outline-none focus:border-sky-500 text-[11px] md:text-sm h-[32px] md:h-[38px]"
             >
               <option value="">All Modes</option>
               <option value="Cash">Cash</option>
               <option value="Cheque">Cheque</option>
               <option value="Bank Transfer">Bank Transfer</option>
               <option value="Online">Online</option>
             </select>
          </div>
        </div>

        <button
          onClick={() => setShowFormModal(true)}
          className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0 mt-2 lg:mt-0"
        >
          <Plus size={16} /> Add Case
        </button>
      </div>

      {/* Form Section Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-2 md:p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-base md:text-xl font-bold text-gray-900">Case & Donation Entry Form</h2>
              <button type="button" onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="p-3 md:p-5 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-2 md:space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                  {/* Reg No */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                      Reg No
                    </label>
                    <input
                      type="text"
                      value={formData.regNo}
                      onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                      placeholder="e.g. REG-10045"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                    />
                  </div>

                  {/* Person Name */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.personName}
                      onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                      placeholder="Enter person name"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                      required
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                      required
                    />
                  </div>

                  {/* Number */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                      Number
                    </label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="Contact number"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                    />
                  </div>

                  {/* Aadhar No */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                      Aadhar No
                    </label>
                    <input
                      type="text"
                      value={formData.aadharNo}
                      onChange={(e) => setFormData({ ...formData, aadharNo: e.target.value })}
                      placeholder="12-digit Aadhar"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                    />
                  </div>

                  {/* Illness */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                      Ill Ness
                    </label>
                    <input
                      type="text"
                      value={formData.illNess}
                      onChange={(e) => setFormData({ ...formData, illNess: e.target.value })}
                      placeholder="e.g. Heart surgery"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                    />
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Full postal address"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                    />
                  </div>

                  {/* Donation Amount */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                      Donation Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                      required
                    />
                  </div>

                  {/* Meet Mahant Jii Status */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                      Meet Mahant Jii Status
                    </label>
                    <select
                      value={formData.meetMahantStatus}
                      onChange={(e) => setFormData({ ...formData, meetMahantStatus: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {/* Mahant Jii Amount */}
                  {formData.meetMahantStatus === 'Yes' && (
                    <div>
                      <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                        Mahant Jii Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.mahantAmount}
                        onChange={(e) => setFormData({ ...formData, mahantAmount: e.target.value })}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px] animate-in fade-in duration-300"
                      />
                    </div>
                  )}

                  {/* Payment Mode */}
                  <div>
                    <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                      Payment Mode *
                    </label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-2">
                    Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Add any remarks..."
                    rows="2"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-2">
                    Upload Image (Optional)
                  </label>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border border-dashed border-gray-300 rounded-lg p-2 md:p-4 hover:border-sky-400 hover:bg-sky-50 transition flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="text-gray-400 mb-0.5 md:mb-2 w-5 h-5 md:w-7 md:h-7" />
                      <span className="text-[11px] md:text-sm font-medium text-gray-700">
                        Click to upload
                      </span>
                    </button>

                    {imagePreview && (
                      <div className="mt-2 md:mt-4">
                        <div className="relative inline-block">
                          <img
                             src={imagePreview}
                             alt="Preview"
                             className="h-20 w-20 md:h-40 md:w-40 object-cover rounded border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImage(null);
                              setImagePreview('');
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 md:p-1 hover:bg-red-600"
                          >
                            <X size={12} className="md:w-4 md:h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-2 md:gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-1.5 px-4 md:py-2 md:px-6 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition text-[12px] md:text-base"
                  >
                    {loading ? 'Adding Case...' : 'Add Case'}
                  </button>
                  <button
                    type="reset"
                    className="px-4 py-1.5 md:px-6 md:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-[12px] md:text-base"
                  >
                    Reset
                  </button>
                </div>

                <p className="text-[10px] md:text-xs text-gray-500 bg-blue-50 p-2 md:p-3 rounded border border-blue-200">
                  ℹ️ Credits are auto-approved and will be reflected in the ledger immediately.
                </p>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* List Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0">
        {/* Mobile View: Cards */}
        <div className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50 pb-2">
          {paginatedCredits.map((credit) => (
            <div key={credit.id} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-1.5 relative flex flex-col gap-1 transition-all">
              {/* Top Row: SN and Badge */}
              <div className="flex justify-between items-center mb-0">
                <div className="flex items-center gap-1.5">
                  <div>
                    <h3 className="font-medium text-gray-900 text-[11px] uppercase tracking-tight leading-none mt-[2px]">
                      {credit.personName}
                    </h3>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-[1px]">
                  <span className="font-medium text-emerald-600 text-[12px] tracking-tight leading-none">{formatCurrency(credit.amount)}</span>
                  <div className="bg-sky-100/80 text-sky-700 px-1 py-[1px] rounded text-[7px] font-medium tracking-widest uppercase mt-[2px] leading-none">
                    {credit.paymentMode}
                  </div>
                </div>
              </div>

              {/* Remarks Box */}
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded p-1.5 border border-slate-100">
                <div className="flex items-center gap-1 mb-0.5 border-b border-slate-200/60 pb-0.5">
                  <Calendar size={9} className="text-indigo-400" />
                  <span className="text-[9px] font-medium text-slate-700 tracking-tight leading-none mt-[1px]">{formatDate(credit.date)}</span>
                  <span className="text-[8px] text-slate-400 font-medium ml-auto tracking-wider leading-none mt-[1px]">REF: {credit.regNo}</span>
                </div>
                <div>
                  <p className="text-[8px] text-indigo-500 font-medium mb-0 uppercase tracking-wider leading-none">Remarks</p>
                  <p className="text-slate-700 text-[10px] leading-snug font-normal mt-[1px]">{credit.remarks || 'No remarks provided.'}</p>
                </div>
              </div>

              {/* View Image Action */}
              {credit.image && (
                <div className="mt-0 flex justify-end">
                  <button onClick={() => handleImageView(credit.image)} className="text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 py-1 rounded text-[9px] font-medium flex items-center gap-1.5 transition-colors w-full justify-center">
                    <Eye size={10} strokeWidth={2} /> View Attached Receipt
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredCredits.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm font-medium text-xs">
              No entries found.
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full min-w-[1200px] relative">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Reg No</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Name</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Number</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Address</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Aadhar No</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Ill Ness</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Remarks</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Donation Amount</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Meet Mahant Jii Status</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Mahant Jii Amount</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Total Amount</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Status</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">TimeStamp</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCredits.map((credit) => (
                <tr key={credit.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 text-center text-sm font-bold text-gray-900">{credit.regNo}</td>
                  <td className="px-3 py-3 text-center text-sm text-gray-700">{credit.personName}</td>
                  <td className="px-3 py-3 text-center text-sm text-gray-700">{credit.number || '-'}</td>
                  <td className="px-3 py-3 text-center text-sm text-gray-700 max-w-[120px] truncate">{credit.address || '-'}</td>
                  <td className="px-3 py-3 text-center text-sm text-gray-700">{credit.aadharNo || '-'}</td>
                  <td className="px-3 py-3 text-center text-sm text-gray-700">{credit.illNess || '-'}</td>
                  <td className="px-3 py-3 text-center text-sm text-gray-500 max-w-[100px] truncate">{credit.remarks || '-'}</td>
                  <td className="px-3 py-3 text-center text-sm font-bold text-emerald-600">
                    {credit.amount ? formatCurrency(credit.amount) : '-'}
                  </td>
                  <td className="px-3 py-3 text-center text-sm text-gray-700">{credit.meetMahantStatus || '-'}</td>
                  <td className="px-3 py-3 text-center text-sm font-semibold text-blue-600">
                    {credit.mahantAmount ? formatCurrency(credit.mahantAmount) : '-'}
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-bold text-gray-900">
                    {formatCurrency((parseFloat(credit.amount || 0) + parseFloat(credit.mahantAmount || 0)))}
                  </td>
                  <td className="px-3 py-3 text-center text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      credit.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : credit.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {credit.status || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-sm text-gray-500 whitespace-nowrap">
                    {credit.timestamp ? new Date(credit.timestamp).toLocaleString('en-IN') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCredits.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No entries found.
            </div>
          )}
        </div>

        {/* Footer & Pagination Controls */}
        <div className="px-2 md:px-4 py-2 border-t border-gray-200 bg-gray-50 flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-4 rounded-b-lg pb-2 md:pb-3">

          {/* Mobile Totals Row */}
          {paginatedCredits.length > 0 && (
            <div className="flex w-full lg:w-auto justify-between lg:hidden items-center text-xs border-b border-gray-200 pb-2 mb-1 px-1">
              <div className="flex flex-col"><span className="text-gray-500 text-[9px] uppercase font-medium tracking-wider mb-0.5">Page Total</span> <span className="font-medium text-emerald-600 text-[13px]">{formatCurrency(pageTotalAmount)}</span></div>
              <div className="flex flex-col text-right"><span className="text-gray-500 text-[9px] uppercase font-medium tracking-wider mb-0.5">Total Filtered</span> <span className="font-medium text-gray-900 text-[13px]">{formatCurrency(totalAmount)}</span></div>
            </div>
          )}

          {/* Desktop Totals (Hidden on Mobile) */}
          {paginatedCredits.length > 0 && (
            <div className="hidden lg:flex items-center gap-6 text-sm order-2">
              <div><span className="text-gray-600">Page Total:</span> <span className="font-semibold text-emerald-600 ml-1">{formatCurrency(pageTotalAmount)}</span></div>
              <div className="w-px h-4 bg-gray-300"></div>
              <div><span className="text-gray-500 text-xs mr-1">Filtered Total:</span> <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span></div>
            </div>
          )}

          {/* Controls Row */}
          <div className="flex w-full lg:w-auto justify-between items-center order-3 lg:order-1 gap-2">
            <div className="text-[10px] md:text-sm text-gray-600 flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-md px-1 flex-shrink-0 md:px-2 py-1 focus:outline-none focus:border-indigo-500 bg-white font-medium text-[10px] md:text-sm shadow-sm"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[10px] md:text-sm text-gray-500 whitespace-nowrap ml-1 font-medium">
                {filteredCredits.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, sortedCredits.length)} of {sortedCredits.length}
              </span>
            </div>

            <div className="flex gap-1.5 md:gap-2 justify-end items-center flex-shrink-0 text-gray-700">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
                title="Previous Page"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <div className="flex items-center text-[10px] md:text-sm font-medium whitespace-nowrap text-gray-500">
                Pg {currentPage}/{totalPages || 1}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
                title="Next Page"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Image Preview</h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <img src={selectedImage} alt="Credit" className="w-full rounded" />
          </div>
        </div>
      )}
    </div>
  );
}
