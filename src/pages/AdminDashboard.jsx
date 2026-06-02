import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp, Users, IndianRupee, CheckCircle2, Clock,
  Calendar, MapPin, Star, BarChart3, PieChart, Activity, X,
} from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/helpers';
import useDataStore from '../store/dataStore';

// ── Tiny palette for charts ──────────────────────────────────────────────
const COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6',
];

// ── Reusable horizontal bar ──────────────────────────────────────────────
function HBar({ label, value, max, color, suffix = '' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 font-medium truncate max-w-[60%]">{label}</span>
        <span className="font-semibold text-gray-800 ml-2 whitespace-nowrap">{suffix}{value}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Inline donut (pure CSS/SVG) ──────────────────────────────────────────
function DonutChart({ data, size = 120 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-xs text-gray-400 text-center py-4">No data</p>;

  const r = 45; const cx = 60; const cy = 60;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const slices = data.map((d, i) => {
    const frac = d.value / total;
    const dash = frac * circumference;
    const slice = (
      <circle
        key={i}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={COLORS[i % COLORS.length]}
        strokeWidth="18"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
      />
    );
    offset += dash;
    return slice;
  });

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="mx-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="18" />
      {slices}
      <text x={cx} y={cy - 6} textAnchor="middle" className="text-xs font-bold" fill="#1f2937" fontSize="11" fontWeight="700">{total}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill="#6b7280" fontSize="8">Records</text>
    </svg>
  );
}

export default function AdminDashboard() {
  const { credits: records, loading, error, fetchData } = useDataStore();
  const [selectedMonthReport, setSelectedMonthReport] = useState(null);
  const [selectedDayReport, setSelectedDayReport] = useState(null);

  // Generate list of last 6 months for trend chart selection
  const trendMonthsList = useMemo(() => {
    const list = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); // Set to first day to avoid boundary overflow bugs when subtracting months
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      list.push({ key, label });
    }
    return list;
  }, []);

  const [selectedTrendMonth, setSelectedTrendMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // ── Core stats ───────────────────────────────────────────────────────────
  const approvedRecords = useMemo(() => records.filter(r => r.status === 'COMPLETED'), [records]);

  const totalRecords  = records.length;
  const totalDonation    = approvedRecords.reduce((s, r) => s + parseFloat(r.amount       || 0), 0);
  const totalMahant      = approvedRecords.reduce((s, r) => s + parseFloat(r.mahantAmount  || 0), 0);
  const totalPlatformFee = approvedRecords.reduce((s, r) => s + parseFloat(r.platformFee   || 0), 0);
  const totalCombined    = totalDonation + totalMahant + totalPlatformFee;
  const approvedCount = approvedRecords.length;
  const pendingCount  = records.filter(r => r.status === 'PENDING').length;

  // Today's records
  const today = new Date().toISOString().split('T')[0];
  const todayRecords  = records.filter(r => r.date === today).length;
  const todayDonation = approvedRecords.filter(r => r.date === today)
                                        .reduce((s, r) => s + parseFloat(r.amount || 0), 0);

  // ── Analytics: Status breakdown ─────────────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const map = {};
    records.forEach(r => { const s = r.status || 'UNKNOWN'; if (s !== 'PENDING') map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [records]);

  // ── Analytics: Address breakdown ─────────────────────────────────────────
  const addressBreakdown = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const addr = (r.address || 'Not Specified').trim();
      map[addr] = (map[addr] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [records]);

  // ── Analytics: Meet Mahant Jii status ────────────────────────────────────
  const mahantStatus = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const ms = (r.meetMahantStatus || 'Not Set').trim();
      map[ms] = (map[ms] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [records]);

  // ── Analytics: Top donors by donation amount ─────────────────────────────
  const topDonors = useMemo(() => {
    const map = {};
    approvedRecords.forEach(r => {
      const name = r.personName || 'Unknown';
      map[name] = (map[name] || 0) + parseFloat(r.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [approvedRecords]);

  // ── Analytics: Monthly trend (last 6 months) ─────────────────────────────
  const monthlyTrend = useMemo(() => {
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months[key] = { key, label, count: 0, amount: 0 };
    }
    approvedRecords.forEach(r => {
      const key = r.date ? r.date.slice(0, 7) : null;
      if (key && months[key]) {
        months[key].count++;
        months[key].amount += parseFloat(r.amount || 0);
      }
    });
    return Object.values(months);
  }, [approvedRecords]);

  // Daily trend calculations for the selected month dropdown
  const dailyTrendData = useMemo(() => {
    if (!selectedTrendMonth) return [];
    const [year, month] = selectedTrendMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${selectedTrendMonth}-${dayStr}`;
      days.push({ day: d, date: dateKey, count: 0, amount: 0 });
    }

    approvedRecords.forEach(r => {
      if (r.date && r.date.startsWith(selectedTrendMonth)) {
        const dayNum = parseInt(r.date.split('-')[2]) || 1;
        const index = dayNum - 1;
        if (days[index]) {
          days[index].count++;
          days[index].amount += parseFloat(r.amount || 0);
        }
      }
    });

    return days;
  }, [approvedRecords, selectedTrendMonth]);

  const maxDailyCount = Math.max(...dailyTrendData.map(d => d.count), 1);

  const dailyBreakdown = useMemo(() => {
    if (!selectedMonthReport) return [];
    const days = {};
    approvedRecords.forEach(r => {
      if (r.date && r.date.startsWith(selectedMonthReport.key)) {
        const d = r.date;
        if (!days[d]) {
          days[d] = { date: d, count: 0, amount: 0, mahantAmount: 0, platformFee: 0 };
        }
        days[d].count++;
        days[d].amount += parseFloat(r.amount || 0);
        days[d].mahantAmount += parseFloat(r.mahantAmount || 0);
        days[d].platformFee += parseFloat(r.platformFee || 0);
      }
    });
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [approvedRecords, selectedMonthReport]);

  // Selected day cases
  const selectedDayCases = useMemo(() => {
    if (!selectedDayReport) return [];
    return approvedRecords.filter(r => r.date === selectedDayReport.date);
  }, [approvedRecords, selectedDayReport]);

  const selectedDayStats = useMemo(() => {
    if (!selectedDayReport) return { count: 0, donation: 0, mahant: 0, total: 0 };
    const cases = selectedDayCases;
    const donation = cases.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const mahant = cases.reduce((sum, r) => sum + parseFloat(r.mahantAmount || 0), 0);
    const platformFee = cases.reduce((sum, r) => sum + parseFloat(r.platformFee || 0), 0);
    return {
      count: cases.length,
      donation,
      mahant,
      platformFee,
      total: donation + mahant + platformFee
    };
  }, [selectedDayCases, selectedDayReport]);

  const statusColor = { COMPLETED: 'bg-green-100 text-green-700', PENDING: 'bg-yellow-100 text-yellow-700', FAILED: 'bg-red-100 text-red-700' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 font-medium">Loading data from Supabase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm font-semibold text-red-600">Failed to load data</p>
          <p className="text-xs text-gray-500">{error}</p>
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
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-5 flex flex-col h-full min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

      {/* ── STATS CARDS ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2 md:gap-3">
        {[
          { label: 'Total Records', value: totalRecords, icon: Users, from: 'from-sky-50', to: 'to-sky-100', border: 'border-sky-200', bg: 'bg-sky-500', text: 'text-sky-700', isCurrency: false },
          { label: "Today's Records", value: todayRecords, icon: Calendar, from: 'from-teal-50', to: 'to-teal-100', border: 'border-teal-200', bg: 'bg-teal-500', text: 'text-teal-700', isCurrency: false },
          { label: "Today's Donation", value: todayDonation, icon: IndianRupee, from: 'from-cyan-50', to: 'to-cyan-100', border: 'border-cyan-200', bg: 'bg-cyan-500', text: 'text-cyan-700', isCurrency: true },
          { label: 'Total Donation', value: totalDonation, icon: IndianRupee, from: 'from-emerald-50', to: 'to-emerald-100', border: 'border-emerald-200', bg: 'bg-emerald-500', text: 'text-emerald-700', isCurrency: true },
          { label: 'Mahant Jii Amt', value: totalMahant, icon: TrendingUp, from: 'from-indigo-50', to: 'to-indigo-100', border: 'border-indigo-200', bg: 'bg-indigo-500', text: 'text-indigo-700', isCurrency: true },
          { label: 'Platform Fee', value: totalPlatformFee, icon: Activity, from: 'from-orange-50', to: 'to-orange-100', border: 'border-orange-200', bg: 'bg-orange-500', text: 'text-orange-700', isCurrency: true },
          { label: 'Total Charged', value: totalCombined, icon: Activity, from: 'from-purple-50', to: 'to-purple-100', border: 'border-purple-200', bg: 'bg-purple-500', text: 'text-purple-700', isCurrency: true },
          { label: 'Approved', value: approvedCount, icon: CheckCircle2, from: 'from-green-50', to: 'to-green-100', border: 'border-green-200', bg: 'bg-green-500', text: 'text-green-700', isCurrency: false },
        ].map(({ label, value, icon: Icon, from, to, border, bg, text, isCurrency }) => (
          <div key={label} className={`bg-gradient-to-br ${from} ${to} rounded-xl p-3 border ${border} flex items-center gap-2`}>
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] text-gray-500 font-medium uppercase tracking-wide leading-tight truncate">{label}</p>
              <p className={`text-sm md:text-lg font-bold ${text} leading-tight truncate`}>
                {isCurrency ? formatCurrency(value) : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── ANALYTICS CHARTS ROW 1 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">

        {/* Address Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 xl:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-sky-500" />
            <h3 className="text-sm font-semibold text-gray-800">Address Breakdown</h3>
          </div>
          <div className="space-y-2">
            {addressBreakdown.length > 0 ? addressBreakdown.map(([addr, cnt], i) => (
              <HBar key={addr} label={addr} value={cnt} max={addressBreakdown[0][1]} color={COLORS[i % COLORS.length]} />
            )) : <p className="text-xs text-gray-400 text-center py-4">No address data</p>}
          </div>
        </div>

        {/* Meet Mahant Jii Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 xl:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-800">Meet Mahant Jii Status</h3>
          </div>
          <DonutChart data={mahantStatus.map(([k, v]) => ({ label: k, value: v }))} size={110} />
          <div className="mt-3 space-y-1">
            {mahantStatus.map(([label, cnt], i) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-gray-600 truncate flex-1">{label}</span>
                <span className="font-semibold text-gray-800">{cnt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Record Status Donut */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 xl:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <PieChart size={16} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-800">Record Status</h3>
          </div>
          <DonutChart data={statusBreakdown.map(([k, v]) => ({ label: k, value: v }))} size={110} />
          <div className="mt-3 space-y-1">
            {statusBreakdown.map(([label, cnt], i) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-gray-600 flex-1">{label}</span>
                <span className="font-semibold text-gray-800">{cnt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Donors */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 xl:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-yellow-500" />
            <h3 className="text-sm font-semibold text-gray-800">Top Donors</h3>
          </div>
          <div className="space-y-2">
            {topDonors.length > 0 ? topDonors.map(([name, amt], i) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{name}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">{formatCurrency(amt)}</p>
                </div>
              </div>
            )) : <p className="text-xs text-gray-400 text-center py-4">No donor data</p>}
          </div>
        </div>
      </div>

      {/* ── ANALYTICS CHARTS ROW 2 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3">

        {/* Daily Records Trend Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-600 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-gray-800">Daily Transaction Trend</h3>
                <p className="text-[10px] text-gray-400 font-medium">Day-wise complete graph & transaction count</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Month Selector */}
              <select
                value={selectedTrendMonth}
                onChange={(e) => setSelectedTrendMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-gray-700 shadow-sm transition cursor-pointer"
              >
                {trendMonthsList.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
              {/* Detailed Report Trigger */}
              <button
                onClick={() => {
                  const mObj = trendMonthsList.find(m => m.key === selectedTrendMonth) || { key: selectedTrendMonth, label: selectedTrendMonth };
                  setSelectedMonthReport(mObj);
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-2.5 py-1 rounded-lg text-xs transition border border-indigo-200/50 shadow-sm whitespace-nowrap"
              >
                View Daily Report
              </button>
            </div>
          </div>

          {/* Daily graph */}
          <div className="flex items-end gap-[3px] md:gap-[5px] h-36 overflow-x-auto pb-1 select-none scrollbar-hide [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {dailyTrendData.map((d) => {
              const barH = maxDailyCount > 0 ? Math.round((d.count / maxDailyCount) * 100) : 0;
              const hasData = d.count > 0;
              return (
                <div
                  key={d.day}
                  onClick={() => {
                    setSelectedDayReport(d);
                  }}
                  className="flex-1 flex flex-col items-center min-w-[14px] md:min-w-[18px] group cursor-pointer"
                  title={`Day ${d.day}: ${d.count} transaction(s), ${formatCurrency(d.amount)} (Click to view day details)`}
                >
                  {/* Transaction Count */}
                  <span className={`text-[8px] font-bold transition-all duration-200 ${hasData ? 'text-indigo-600 opacity-100 scale-100' : 'text-gray-400 opacity-0 group-hover:opacity-100 group-hover:scale-100'} mb-1`}>
                    {d.count}
                  </span>
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t transition-all duration-500 min-h-[3px] ${hasData ? 'bg-gradient-to-t from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 opacity-95 shadow-[0_-1px_4px_rgba(99,102,241,0.2)]' : 'bg-slate-100 group-hover:bg-slate-200'}`}
                    style={{ height: `${Math.max(barH, 3)}%` }}
                  />
                  {/* Day Label */}
                  <span className={`text-[8px] mt-1.5 transition-colors font-medium ${hasData ? 'text-gray-900 font-bold' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Report Modal */}
      {selectedMonthReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Daily Breakdown Report</h3>
                <p className="text-xs text-gray-400 font-medium">Month: {selectedMonthReport.label}</p>
              </div>
              <button
                onClick={() => setSelectedMonthReport(null)}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Daily Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  {
                    label: 'Total Cases',
                    value: dailyBreakdown.reduce((sum, d) => sum + d.count, 0),
                    bg: 'bg-sky-50 text-sky-700 border-sky-200'
                  },
                  {
                    label: 'Donation Amt',
                    value: formatCurrency(dailyBreakdown.reduce((sum, d) => sum + d.amount, 0)),
                    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  },
                  {
                    label: 'Mahant Jii Amt',
                    value: formatCurrency(dailyBreakdown.reduce((sum, d) => sum + d.mahantAmount, 0)),
                    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  },
                  {
                    label: 'Platform Fee',
                    value: formatCurrency(dailyBreakdown.reduce((sum, d) => sum + (d.platformFee || 0), 0)),
                    bg: 'bg-orange-50 text-orange-700 border-orange-200'
                  },
                  {
                    label: 'Total Charged',
                    value: formatCurrency(dailyBreakdown.reduce((sum, d) => sum + d.amount + d.mahantAmount + (d.platformFee || 0), 0)),
                    bg: 'bg-purple-50 text-purple-700 border-purple-200'
                  }
                ].map(({ label, value, bg }) => (
                  <div key={label} className={`p-3 rounded-lg border ${bg} text-center`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 block mb-1">{label}</span>
                    <span className="text-sm md:text-base font-bold">{value}</span>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-center">Date</th>
                      <th className="px-4 py-3 text-center">Cases Count</th>
                      <th className="px-4 py-3 text-center">Donation Amount</th>
                      <th className="px-4 py-3 text-center">Mahant Jii Amount</th>
                      <th className="px-4 py-3 text-center">Platform Fee</th>
                      <th className="px-4 py-3 text-center">Total Charged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-600">
                    {dailyBreakdown.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-center font-medium text-gray-900">{formatDate(day.date)}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-sky-600">{day.count}</td>
                        <td className="px-4 py-2.5 text-center text-emerald-600 font-medium">{formatCurrency(day.amount)}</td>
                        <td className="px-4 py-2.5 text-center text-indigo-600 font-medium">{formatCurrency(day.mahantAmount)}</td>
                        <td className="px-4 py-2.5 text-center text-orange-500 font-medium">{formatCurrency(day.platformFee || 0)}</td>
                        <td className="px-4 py-2.5 text-center text-gray-900 font-bold">{formatCurrency(day.amount + day.mahantAmount + (day.platformFee || 0))}</td>
                      </tr>
                    ))}
                    {dailyBreakdown.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-400 font-medium">No records found for this month.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedMonthReport(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Day Details Modal */}
      {selectedDayReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-indigo-50/30 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-bold text-gray-900">Cases Details — {formatDate(selectedDayReport.date)}</h3>
                  <p className="text-[9px] text-gray-400 font-semibold tracking-wide uppercase">Day {selectedDayReport.day} of month</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayReport(null)}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Daily Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  {
                    label: 'Total Cases',
                    value: selectedDayStats.count,
                    icon: Users,
                    bg: 'bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-700 border-sky-200/60 shadow-sm'
                  },
                  {
                    label: 'Donation Amt',
                    value: formatCurrency(selectedDayStats.donation),
                    icon: IndianRupee,
                    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200/60 shadow-sm'
                  },
                  {
                    label: 'Mahant Jii Amt',
                    value: formatCurrency(selectedDayStats.mahant),
                    icon: TrendingUp,
                    bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-700 border-indigo-200/60 shadow-sm'
                  },
                  {
                    label: 'Platform Fee',
                    value: formatCurrency(selectedDayStats.platformFee),
                    icon: Activity,
                    bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50 text-orange-700 border-orange-200/60 shadow-sm'
                  },
                  {
                    label: 'Total Charged',
                    value: formatCurrency(selectedDayStats.total),
                    icon: Activity,
                    bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50 text-purple-700 border-purple-200/60 shadow-sm'
                  }
                ].map(({ label, value, icon: Icon, bg }) => (
                  <div key={label} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${bg}`}>
                    <div className="text-left min-w-0">
                      <span className="text-[9px] uppercase font-bold tracking-wider opacity-85 block mb-0.5">{label}</span>
                      <span className="text-xs md:text-sm font-extrabold truncate block">{value}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Icon size={16} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Table / Cards */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-center">SN</th>
                        <th className="px-4 py-3 text-center">Reg No</th>
                        <th className="px-4 py-3 text-center">Name</th>
                        <th className="px-4 py-3 text-center">Illness</th>
                        <th className="px-4 py-3 text-center">Donation</th>
                        <th className="px-4 py-3 text-center">Mahant Amt</th>
                        <th className="px-4 py-3 text-center">Total Amt</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm text-gray-600">
                      {selectedDayCases.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-center font-semibold text-gray-900">{r.sn}</td>
                          <td className="px-4 py-3 text-center text-gray-700 font-medium">{r.regNo || '-'}</td>
                          <td className="px-4 py-3 text-center text-gray-800 font-bold uppercase tracking-tight">{r.personName}</td>
                          <td className="px-4 py-3 text-center text-gray-600 font-medium">
                            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded text-xs border border-rose-100/50">
                              <HeartPulse size={12} className="text-rose-500" />
                              {r.illNess || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-emerald-600 font-bold">{formatCurrency(r.amount)}</td>
                          <td className="px-4 py-3 text-center text-indigo-600 font-bold">{formatCurrency(r.mahantAmount)}</td>
                          <td className="px-4 py-3 text-center text-gray-900 font-extrabold">
                            {formatCurrency(parseFloat(r.amount || 0) + parseFloat(r.mahantAmount || 0) + parseFloat(r.platformFee || 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[r.status] || 'bg-gray-100 text-gray-600'}`}>
                              {r.status || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-400 text-xs font-medium">
                            {r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                          </td>
                        </tr>
                      ))}
                      {selectedDayCases.length === 0 && (
                        <tr>
                          <td colSpan="9" className="p-8 text-center text-gray-400 font-medium">No records found for this day.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden divide-y divide-gray-100 p-2 space-y-2 bg-slate-50/30">
                  {selectedDayCases.map((r) => (
                    <div key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">SN: {r.sn}</span>
                          <h4 className="font-bold text-gray-800 text-xs uppercase tracking-tight">{r.personName}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColor[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.status || '-'}
                        </span>
                      </div>
                      
                      <div className="bg-slate-50/70 rounded-lg p-2 border border-slate-100/50 space-y-1 text-[10px]">
                        <div><span className="text-gray-400 font-medium">Reg No: </span><span className="text-gray-700 font-bold">{r.regNo || '-'}</span></div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-medium">Illness: </span>
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-bold px-1.5 py-0.2 rounded text-[9px]">
                            <HeartPulse size={9} />
                            {r.illNess || '-'}
                          </span>
                        </div>
                        <div><span className="text-gray-400 font-medium">Time: </span><span className="text-gray-500 font-semibold">{r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</span></div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-100/60">
                        <div><span className="text-gray-400 font-semibold">Donation: </span><span className="text-emerald-600 font-bold">{formatCurrency(r.amount || 0)}</span></div>
                        <div><span className="text-gray-400 font-semibold">Mahant: </span><span className="text-indigo-600 font-bold">{formatCurrency(r.mahantAmount || 0)}</span></div>
                        <div><span className="text-gray-900 font-extrabold">{formatCurrency(parseFloat(r.amount || 0) + parseFloat(r.mahantAmount || 0) + parseFloat(r.platformFee || 0))}</span></div>
                      </div>
                    </div>
                  ))}
                  {selectedDayCases.length === 0 && (
                    <div className="p-6 text-center text-gray-400 font-medium bg-white rounded-xl border border-dashed border-gray-200">
                      No records found for this day.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedDayReport(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow-md active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
