import React, { useState, useEffect } from 'react';
import { Filter, Search, ChevronLeft, ChevronRight, Calendar, FileDown, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
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
  const [selectedRemark, setSelectedRemark] = useState(null);

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const filteredCredits = credits.filter(credit => {
    if (credit.status !== 'COMPLETED') return false;
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

  const generateReceiptPDF = async (credit) => {
    const now = new Date();
    const fullDateTime =
      now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) +
      ' at ' +
      now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(credit.qrToken || credit.regNo || 'N/A', { width: 128, margin: 1 });
    } catch (_) {}

    const donation = parseFloat(credit.amount || 0);
    const mahant = parseFloat(credit.mahantAmount || 0);
    const fee = parseFloat(credit.platformFee || 0);
    const total = donation + mahant + fee;

    const html = `<!DOCTYPE html><html><head>
  <meta charset="UTF-8">
  <title>Receipt - ${credit.regNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @page { size: A4; margin: 8mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',Arial,sans-serif; color:#1a0a00; background:#fff; font-size:12px; }
    .page { max-width:720px; margin:0 auto; padding:18px 28px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:12px; margin-bottom:12px; border-bottom:2.5px solid #e07b20; }
    .header-left { flex:1; }
    .trust-name { font-size:16px; font-weight:800; color:#e07b20; margin-bottom:2px; }
    .trust-sub { font-size:10.5px; color:#666; line-height:1.5; }
    .reg-wrap { margin-top:8px; }
    .reg-label { font-size:9px; font-weight:700; color:#a07040; text-transform:uppercase; letter-spacing:1px; }
    .reg-num { font-size:22px; font-weight:800; color:#1a0a00; letter-spacing:3px; margin-top:1px; }
    .header-right { text-align:center; flex-shrink:0; margin-left:20px; }
    .qr-border { border:1.5px solid #fcd68a; border-radius:8px; padding:6px; background:#fffdf8; display:inline-block; }
    .qr-caption { font-size:8px; color:#a07040; text-transform:uppercase; letter-spacing:0.6px; margin-top:4px; font-weight:600; }
    .status-bar { display:flex; gap:10px; margin-bottom:12px; }
    .pill { flex:1; background:#f9f5ef; border:1px solid #fcd68a; border-radius:7px; padding:7px 12px; }
    .pill-label { font-size:8.5px; font-weight:700; color:#a07040; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:2px; }
    .pill-value { font-size:12px; font-weight:700; color:#1a0a00; }
    .paid-badge { display:inline-block; background:#16a34a; color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; }
    .section { margin-bottom:12px; }
    .section-title { font-size:9.5px; font-weight:800; color:#e07b20; text-transform:uppercase; letter-spacing:1.2px; border-bottom:1.5px solid #fcd68a; padding-bottom:4px; margin-bottom:8px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:7px 20px; }
    .grid-lbl { font-size:9px; font-weight:700; color:#a07040; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:1px; }
    .grid-val { font-size:12px; color:#1a0a00; font-weight:500; line-height:1.35; }
    table { width:100%; border-collapse:collapse; }
    th { background:#fff8f0; color:#e07b20; font-weight:700; text-align:left; padding:7px 12px; border:1px solid #fcd68a; font-size:10.5px; text-transform:uppercase; letter-spacing:0.4px; }
    td { padding:7px 12px; border:1px solid #e5e7eb; color:#1a0a00; font-size:12px; }
    .total-row td { font-weight:800; background:#fdf3e3; color:#e07b20; font-size:13px; border-color:#fcd68a; }
    .notes ol { padding-left:16px; }
    .notes li { font-size:10.5px; color:#555; margin-bottom:3px; line-height:1.55; }
    .footer { display:flex; justify-content:space-between; align-items:center; border-top:2px solid #e07b20; padding-top:10px; margin-top:12px; }
    .footer-trust { font-size:13px; font-weight:800; color:#e07b20; }
    .footer-contact { font-size:10.5px; color:#666; text-align:right; line-height:1.6; }
    .watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-28deg); font-size:72px; font-weight:900; color:#f5dfc0; opacity:0.09; pointer-events:none; z-index:0; white-space:nowrap; }
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  </style>
</head><body>
  <div class="watermark">JAI SHREE SHYAM</div>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <div class="trust-name">Shree Shyamji Mandir Trust</div>
        <div class="trust-sub">Kantabanji-767039, Balangir, Odisha</div>
        <div class="trust-sub">Ph: 9937021255 | 9853076485</div>
        <div class="reg-wrap">
          <div class="reg-label">Registration Number</div>
          <div class="reg-num">${credit.regNo}</div>
        </div>
      </div>
      ${qrDataUrl ? `<div class="header-right"><div class="qr-border"><img src="${qrDataUrl}" width="96" height="96" style="display:block"/></div><div class="qr-caption">Scan at entry gate</div></div>` : ''}
    </div>
    <div class="status-bar">
      <div class="pill"><div class="pill-label">Generated On</div><div class="pill-value">${fullDateTime}</div></div>
      <div class="pill"><div class="pill-label">Event Date</div><div class="pill-value">14th July 2026</div></div>
      <div class="pill"><div class="pill-label">Payment</div><div class="pill-value"><span class="paid-badge">Paid</span></div></div>
    </div>
    <div class="section">
      <div class="section-title">Event Details</div>
      <div class="grid">
        <div><div class="grid-lbl">Occasion</div><div class="grid-val">Shri Amrendra Ji Maharaj Darshan (Manona Dham)</div></div>
        <div><div class="grid-lbl">Venue</div><div class="grid-val">Shree Shyamji Mandir, Kantabanji-767039, Odisha</div></div>
        <div><div class="grid-lbl">Date</div><div class="grid-val">14th July 2026</div></div>
        <div><div class="grid-lbl">Timings</div><div class="grid-val">9:00 AM to 6:00 PM</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Devotee Details</div>
      <div class="grid">
        <div><div class="grid-lbl">Full Name</div><div class="grid-val">${credit.personName}</div></div>
        <div><div class="grid-lbl">Mobile</div><div class="grid-val">+91 ${credit.number}</div></div>
        <div><div class="grid-lbl">Address</div><div class="grid-val">${credit.address || 'N/A'}</div></div>
        <div><div class="grid-lbl">Aadhar No</div><div class="grid-val">${credit.aadharNo || 'N/A'}</div></div>
        ${credit.illNess ? `<div><div class="grid-lbl">Illness</div><div class="grid-val">${credit.illNess}</div></div>` : ''}
        <div><div class="grid-lbl">Meet Mahant Ji</div><div class="grid-val">${credit.meetMahantStatus}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Payment Breakdown</div>
      <table>
        <thead><tr><th>Particulars</th><th style="text-align:right">Amount (Rs.)</th></tr></thead>
        <tbody>
          <tr><td>Maharaj Ji Meeting / Darshan Fee</td><td style="text-align:right">${mahant > 0 ? mahant.toLocaleString('en-IN') : '0'}</td></tr>
          <tr><td>Voluntary Donation</td><td style="text-align:right">${donation > 0 ? donation.toLocaleString('en-IN') : '0'}</td></tr>
          <tr><td>Gateway Fee (2% + 18% GST on fee)</td><td style="text-align:right">${fee.toLocaleString('en-IN')}</td></tr>
          <tr class="total-row"><td><strong>Total Paid</strong></td><td style="text-align:right"><strong>Rs. ${total.toLocaleString('en-IN')}</strong></td></tr>
        </tbody>
      </table>
    </div>
    <div class="section notes">
      <div class="section-title">Important Notes</div>
      <ol>
        <li>Carry this receipt and show the QR code at the entry gate.</li>
        <li>The QR code is unique and can only be used <strong>once</strong> for entry.</li>
        <li>Registration number is mandatory for darshan entry.</li>
        <li>Donation amount is voluntary and non-refundable.</li>
        <li>Organizers reserve the right to manage schedules for smooth darshan.</li>
      </ol>
    </div>
    <div class="footer">
      <div><div class="footer-trust">Shree Shyamji Mandir Trust</div><div style="font-size:11px;color:#888;margin-top:2px">Kantabanji-767039, Balangir, Odisha</div></div>
      <div class="footer-contact">Ph: 9937021255<br/>9853076485</div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); }<\/script>
</body></html>`;

    const win = window.open('', '_blank', 'width=780,height=960');
    if (win) { win.document.write(html); win.document.close(); }
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
            <div key={credit.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col gap-2">

              {/* Row 1: Name + Status */}
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mb-0.5">REG: {credit.regNo || '-'}</p>
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-tight leading-tight truncate">{credit.personName}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex-shrink-0 ${
                  credit.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  credit.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>{credit.status}</span>
              </div>

              {/* Row 2: Contact + Date */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <div><span className="text-gray-400 font-medium">Phone: </span><span className="text-gray-700 font-semibold">{credit.number || '-'}</span></div>
                <div><span className="text-gray-400 font-medium">Date: </span><span className="text-gray-700 font-semibold">{formatDate(credit.date)}</span></div>
                <div className="col-span-2"><span className="text-gray-400 font-medium">Address: </span><span className="text-gray-700">{credit.address || '-'}</span></div>
                <div><span className="text-gray-400 font-medium">Illness: </span><span className="text-rose-600 font-semibold">{credit.illNess || '-'}</span></div>
                <div><span className="text-gray-400 font-medium">Meet Mahant: </span><span className="text-gray-700 font-semibold">{credit.meetMahantStatus || '-'}</span></div>
              </div>

              {/* Row 3: Amounts */}
              <div className="bg-slate-50 rounded-md p-2 border border-slate-100 grid grid-cols-4 gap-1 text-center">
                <div>
                  <p className="text-[8px] text-gray-400 uppercase font-medium tracking-wider">Donation</p>
                  <p className="text-[11px] font-bold text-emerald-600">{formatCurrency(credit.amount)}</p>
                </div>
                <div>
                  <p className="text-[8px] text-gray-400 uppercase font-medium tracking-wider">Mahant</p>
                  <p className="text-[11px] font-bold text-blue-600">{formatCurrency(credit.mahantAmount)}</p>
                </div>
                <div>
                  <p className="text-[8px] text-gray-400 uppercase font-medium tracking-wider">Fee</p>
                  <p className="text-[11px] font-bold text-orange-500">{formatCurrency(credit.platformFee)}</p>
                </div>
                <div>
                  <p className="text-[8px] text-gray-400 uppercase font-medium tracking-wider">Total</p>
                  <p className="text-[11px] font-extrabold text-gray-900">{formatCurrency(parseFloat(credit.amount || 0) + parseFloat(credit.mahantAmount || 0) + parseFloat(credit.platformFee || 0))}</p>
                </div>
              </div>

              {/* Row 4: Remarks */}
              {credit.remarks && credit.remarks !== '-' && (
                <div
                  className="text-[10px] text-gray-500 border-t border-gray-100 pt-1.5 cursor-pointer line-clamp-2 hover:text-sky-600"
                  onClick={() => setSelectedRemark(credit.remarks)}
                >
                  <span className="font-semibold text-gray-400 uppercase tracking-wider">Remarks: </span>{credit.remarks}
                </div>
              )}

              {/* Row 5: Generate Receipt */}
              <button
                onClick={() => generateReceiptPDF(credit)}
                className="w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white py-1.5 rounded-md text-xs font-semibold transition mt-1"
              >
                <Printer size={12} /> Generate Receipt
              </button>

            </div>
          ))}
          {filteredCredits.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm font-medium text-xs">No entries found.</div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full min-w-[1300px] relative">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                {['Reg No', 'Name', 'Phone', 'Address', 'Aadhaar No', 'Illness', 'Remarks', 'Donation Amt', 'Meet Mahant', 'Mahant Amt', 'Platform Fee', 'Total Amt', 'Status', 'Timestamp', 'Receipt'].map(h => (
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
                  <td
                    className="px-3 py-3 text-center text-sm text-gray-500 max-w-[100px] truncate cursor-pointer hover:text-sky-600 hover:underline"
                    onClick={() => credit.remarks && credit.remarks !== '-' && setSelectedRemark(credit.remarks)}
                    title={credit.remarks || '-'}
                  >{credit.remarks || '-'}</td>
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
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => generateReceiptPDF(credit)}
                      className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 rounded text-xs font-semibold transition shadow-sm"
                    >
                      <Printer size={11} /> PDF
                    </button>
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

      {/* Remarks Modal */}
      {selectedRemark && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedRemark(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Remarks</h3>
              <button
                onClick={() => setSelectedRemark(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >✕</button>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedRemark}</p>
          </div>
        </div>
      )}
    </div>
  );
}
