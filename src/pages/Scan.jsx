import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, RefreshCw, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SCAN_SECRET;
const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Scan() {
  const [phase, setPhase] = useState('scanning');
  const [record, setRecord] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [cameraErr, setCameraErr] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const didScan = useRef(false);

  const stopCamera = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    didScan.current = false;
  };

  const scanLoop = async () => {
    if (didScan.current || !videoRef.current || !detectorRef.current) return;
    if (videoRef.current.readyState >= 2) {
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes.length > 0) {
          didScan.current = true;
          stopCamera();
          handleScanned(codes[0].rawValue);
          return;
        }
      } catch { /* frame decode error — ignore */ }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  };

  const startCamera = async () => {
    setCameraErr('');
    didScan.current = false;

    if (!('BarcodeDetector' in window)) {
      setCameraErr('QR scanning requires Chrome or Edge. Please open this page in Chrome.');
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch {
      setCameraErr('Camera access denied. Allow camera permission and try again.');
    }
  };

  useEffect(() => {
    if (phase === 'scanning') startCamera();
    else stopCamera();
    return stopCamera;
  }, [phase]);

  const handleScanned = async (raw) => {
    const token = raw.includes('/') ? raw.split('/').pop() : raw;
    setPhase('loading');
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ token }),
      });
      let data = {};
      try { data = await res.json(); } catch { /* empty body */ }
      if (!res.ok) { toast.error(data.error || 'QR not found'); setPhase('scanning'); return; }
      setRecord(data);
      setPhase('result');
    } catch {
      toast.error('Failed to verify QR');
      setPhase('scanning');
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/confirm-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ token: record.token }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to confirm'); return; }
      setPhase('done');
      toast.success('Entry confirmed!');
    } catch {
      toast.error('Failed to confirm entry');
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => { setRecord(null); setPhase('scanning'); };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-md">

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Entry Scanner</h1>
          <p className="text-sm text-gray-500 mt-1">Scan the QR code on the devotee's receipt</p>
        </div>

        {/* Scanning */}
        {phase === 'scanning' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <QrCode size={18} className="text-sky-600" />
              <span className="font-semibold text-gray-800 text-sm">Point camera at QR code</span>
            </div>
            {cameraErr ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm text-red-500 font-medium">{cameraErr}</p>
                <button onClick={startCamera} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold">
                  Try Again
                </button>
              </div>
            ) : (
              <div className="relative bg-black">
                <video
                  ref={videoRef}
                  className="w-full aspect-square object-cover"
                  playsInline
                  muted
                />
                {/* Targeting box */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-52 h-52 rounded-lg border-2 border-sky-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Verifying QR code...</p>
          </div>
        )}

        {/* Result */}
        {phase === 'result' && record && (
          <div className="space-y-4">
            {record.scanned ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                <XCircle size={32} className="text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-700 text-base">Already Used</p>
                  <p className="text-xs text-red-500 mt-0.5">This QR has been scanned before. Entry denied.</p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 size={32} className="text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-green-700 text-base">Valid Entry</p>
                  <p className="text-xs text-green-600 mt-0.5">QR is valid and has not been used.</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
              <h2 className="font-bold text-gray-900 text-xl">{record.customer?.name || '—'}</h2>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Reg No</p>
                  <p className="font-semibold text-gray-800">{record.customer?.reg_no || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Phone</p>
                  <p className="font-semibold text-gray-800">{record.customer?.phone_no || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Donation</p>
                  <p className="font-semibold text-emerald-600">₹{record.customer?.donation_amount || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Payment</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    record.payment?.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{record.payment?.status || 'PENDING'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {!record.scanned && (
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-base"
                >
                  {confirming
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle2 size={20} />}
                  {confirming ? 'Confirming...' : 'Confirm Entry'}
                </button>
              )}
              <button onClick={reset} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition flex items-center justify-center gap-2">
                <RefreshCw size={17} /> Scan Another
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {phase === 'done' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
              <CheckCircle2 size={60} className="text-green-500" />
              <h2 className="font-bold text-green-800 text-2xl">Entry Confirmed!</h2>
              <p className="text-sm text-green-600 font-medium">{record?.customer?.name} has been checked in.</p>
            </div>
            <button onClick={reset} className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-base">
              <RefreshCw size={18} /> Scan Next Person
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
