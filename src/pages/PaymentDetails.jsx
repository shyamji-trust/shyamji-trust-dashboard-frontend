import React, { useState, useEffect } from 'react';
import { Filter, Search, ChevronLeft, ChevronRight, Calendar, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useDataStore from '../store/dataStore';
import { formatDate, formatCurrency } from '../utils/helpers';

export default function PaymentDetails() {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { credits, loading: dataLoading, error: dataError, fetchData } = useDataStore();

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    personName: '',
    mode: '',
    searchQuery: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const filteredCredits = credits.filter(credit => {
    if (filters.fromDate && credit.date < filters.fromDate) return false;
    if (filters.toDate && credit.date > filters.toDate) return false;
    if (filters.personName && credit.personName !== filters.personName) return false;
    if (filters.mode && credit.paymentMode !== filters.mode) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match = (
        (credit.regNo && String(credit.regNo).toLowerCase().includes(q)) ||
        (credit.personName && credit.personName.toLowerCase().includes(q)) ||
        (credit.date && credit.date.includes(q)) ||
        (credit.amount && String(credit.amount).includes(q)) ||
        (credit.remarks && credit.remarks.toLowerCase().includes(q))
      );
      if (!match) return false;
    }
    return true;
  });

  const sortedCredits = filteredCredits.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const totalPages = Math.ceil(sortedCredits.length / itemsPerPage);
  const paginatedCredits = sortedCredits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageTotalAmount = paginatedCredits.reduce((sum, c) => sum + parseFloat(c.amount || 0) + parseFloat(c.mahantAmount || 0) + parseFloat(c.platformFee || 0), 0);
  const totalAmount = sortedCredits.reduce((sum, c) => sum + parseFloat(c.amount || 0) + parseFloat(c.mahantAmount || 0) + parseFloat(c.platformFee || 0), 0);

  const handleExportPDF = () => {
    const fmtAmt = (val) => {
      const n = parseFloat(val || 0);
      return 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Payment Records', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}  |  Total: ${sortedCredits.length} records`, 14, 22);

    autoTable(doc, {
      startY: 27,
      head: [['Reg No', 'Name', 'Phone', 'Illness', 'Donation Amt', 'Meet Mahant', 'Mahant Amt', 'Platform Fee', 'Total Amt', 'Status', 'Date']],
      body: sortedCredits.map(c => [
        c.regNo || '',
        c.personName || '',
        c.number || '',
        c.illNess || '',
        fmtAmt(c.amount),
        c.meetMahantStatus || '',
        fmtAmt(c.mahantAmount),
        fmtAmt(c.platformFee),
        fmtAmt(parseFloat(c.amount || 0) + parseFloat(c.mahantAmount || 0) + parseFloat(c.platformFee || 0)),
        c.status || '',
        formatDate(c.date),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 32 },
        2: { cellWidth: 23 },
        3: { cellWidth: 26 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 23, halign: 'right' },
        7: { cellWidth: 23, halign: 'right' },
        8: { cellWidth: 25, halign: 'right' },
        9: { cellWidth: 20, halign: 'center' },
        10: { cellWidth: 20, halign: 'center' },
      },
    });

    doc.save(`payments-${new Date().toISOString().slice(0, 10)}.pdf`);
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
          <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
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

          {/* Search + Mobile buttons */}
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
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`lg:hidden flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={14} />
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition"
            >
              <FileDown size={14} />
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
              <option value="Online">Online</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          className="hidden lg:flex bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm flex-shrink-0 mt-2 lg:mt-0"
        >
          <FileDown size={16} /> Export PDF
        </button>
      </div>

      {/* List Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0">

        {/* Mobile View: Cards */}
        <div className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50 pb-2">
          {paginatedCredits.map((credit) => (
            <div key={credit.id} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-1.5 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-900 text-[11px] uppercase tracking-tight">{credit.personName}</h3>
                <div className="flex flex-col items-end gap-[1px]">
                  <span className="font-medium text-emerald-600 text-[12px] tracking-tight leading-none">{formatCurrency(credit.amount)}</span>
                  <span className={`px-1.5 py-[1px] rounded text-[7px] font-bold tracking-widest uppercase mt-[2px] leading-none ${
                    credit.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    credit.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>{credit.status}</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded p-1.5 border border-slate-100">
                <div className="flex items-center gap-1 mb-0.5 border-b border-slate-200/60 pb-0.5">
                  <Calendar size={9} className="text-indigo-400" />
                  <span className="text-[9px] font-medium text-slate-700 tracking-tight leading-none mt-[1px]">{formatDate(credit.date)}</span>
                  <span className="text-[8px] text-slate-400 font-medium ml-auto tracking-wider leading-none mt-[1px]">REF: {credit.regNo}</span>
                </div>
                <p className="text-[8px] text-indigo-500 font-medium uppercase tracking-wider leading-none">Remarks</p>
                <p className="text-slate-700 text-[10px] leading-snug font-normal mt-[1px]">{credit.remarks || 'No remarks provided.'}</p>
              </div>
            </div>
          ))}
          {filteredCredits.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm font-medium text-xs">No entries found.</div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full min-w-[1220px] relative">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                {['Reg No', 'Name', 'Phone', 'Address', 'Aadhaar No', 'Illness', 'Remarks', 'Donation Amt', 'Meet Mahant', 'Mahant Amt', 'Platform Fee', 'Total Amt', 'Status', 'Timestamp'].map(h => (
                  <th key={h} className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">{h}</th>
                ))}
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
                  <td className="px-3 py-3 text-center text-sm font-bold text-emerald-600">{credit.amount ? formatCurrency(credit.amount) : '-'}</td>
                  <td className="px-3 py-3 text-center text-sm text-gray-700">{credit.meetMahantStatus || '-'}</td>
                  <td className="px-3 py-3 text-center text-sm font-semibold text-blue-600">{credit.mahantAmount ? formatCurrency(credit.mahantAmount) : '-'}</td>
                  <td className="px-3 py-3 text-center text-sm font-semibold text-orange-500">{credit.platformFee ? formatCurrency(credit.platformFee) : '-'}</td>
                  <td className="px-3 py-3 text-center text-sm font-bold text-gray-900">{formatCurrency(parseFloat(credit.amount || 0) + parseFloat(credit.mahantAmount || 0) + parseFloat(credit.platformFee || 0))}</td>
                  <td className="px-3 py-3 text-center text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      credit.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      credit.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>{credit.status || '-'}</span>
                  </td>
                  <td className="px-3 py-3 text-center text-sm text-gray-500 whitespace-nowrap">
                    {credit.timestamp ? new Date(credit.timestamp).toLocaleString('en-IN') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCredits.length === 0 && (
            <div className="p-8 text-center text-gray-500">No entries found.</div>
          )}
        </div>

        {/* Footer & Pagination */}
        <div className="px-2 md:px-4 py-2 border-t border-gray-200 bg-gray-50 flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-4 rounded-b-lg pb-2 md:pb-3">
          {paginatedCredits.length > 0 && (
            <div className="flex w-full lg:w-auto justify-between lg:hidden items-center text-xs border-b border-gray-200 pb-2 mb-1 px-1">
              <div className="flex flex-col"><span className="text-gray-500 text-[9px] uppercase font-medium tracking-wider mb-0.5">Page Total</span><span className="font-medium text-emerald-600 text-[13px]">{formatCurrency(pageTotalAmount)}</span></div>
              <div className="flex flex-col text-right"><span className="text-gray-500 text-[9px] uppercase font-medium tracking-wider mb-0.5">Total Filtered</span><span className="font-medium text-gray-900 text-[13px]">{formatCurrency(totalAmount)}</span></div>
            </div>
          )}
          {paginatedCredits.length > 0 && (
            <div className="hidden lg:flex items-center gap-6 text-sm order-2">
              <div><span className="text-gray-600">Page Total:</span><span className="font-semibold text-emerald-600 ml-1">{formatCurrency(pageTotalAmount)}</span></div>
              <div className="w-px h-4 bg-gray-300" />
              <div><span className="text-gray-500 text-xs mr-1">Filtered Total:</span><span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span></div>
            </div>
          )}
          <div className="flex w-full lg:w-auto justify-between items-center order-3 lg:order-1 gap-2">
            <div className="text-[10px] md:text-sm text-gray-600 flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-300 rounded-md px-1 flex-shrink-0 md:px-2 py-1 focus:outline-none focus:border-indigo-500 bg-white font-medium text-[10px] md:text-sm shadow-sm"
              >
                {[10, 15, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-[10px] md:text-sm text-gray-500 whitespace-nowrap ml-1 font-medium">
                {filteredCredits.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, sortedCredits.length)} of {sortedCredits.length}
              </span>
            </div>
            <div className="flex gap-1.5 md:gap-2 justify-end items-center flex-shrink-0 text-gray-700">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600">
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <div className="flex items-center text-[10px] md:text-sm font-medium whitespace-nowrap text-gray-500">Pg {currentPage}/{totalPages || 1}</div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600">
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
