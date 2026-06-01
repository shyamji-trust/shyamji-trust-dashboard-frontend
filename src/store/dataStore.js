import { create } from 'zustand';

const API_BASE = import.meta.env.VITE_API_URL || '';

function mapToCredits(customers, payments) {
  return customers.map((c) => {
    const payment = payments.find((p) => p.customer_id === c.id);
    const status = payment ? (payment.status || 'PENDING') : 'PENDING';
    return {
      id: c.id,
      sn: c.reg_no || null,
      regNo: c.reg_no || null,
      personName: c.name || '',
      number: c.phone_no || '',
      address: c.address || '',
      aadharNo: c.aadhaar_no || '',
      illNess: c.illness || '',
      remarks: c.remarks || '',
      amount: parseFloat(c.donation_amount || 0),
      meetMahantStatus: c.meet_mahant_ji ? 'Yes' : 'No',
      mahantAmount: parseFloat(c.mahant_meeting_amount || 0),
      platformFee: parseFloat(c.platform_fee_plus_gst || 0),
      paymentMode: payment ? 'Online' : 'Cash',
      image: '',
      status,
      date: c.created_at ? c.created_at.slice(0, 10) : '',
      timestamp: c.created_at || '',
    };
  });
}

const useDataStore = create((set) => ({
  customers: [],
  payments: [],
  credits: [],
  loading: false,
  error: null,

  pollingTimer: null,

  startPolling: (intervalMs = 30000) => {
    const { fetchData, stopPolling } = useDataStore.getState();
    stopPolling();
    fetchData();
    const timer = setInterval(fetchData, intervalMs);
    useDataStore.setState({ pollingTimer: timer });
  },

  stopPolling: () => {
    const { pollingTimer } = useDataStore.getState();
    if (pollingTimer) {
      clearInterval(pollingTimer);
      useDataStore.setState({ pollingTimer: null });
    }
  },

  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const [custRes, payRes] = await Promise.all([
        fetch(`${API_BASE}/api/customers`),
        fetch(`${API_BASE}/api/payments`),
      ]);

      if (!custRes.ok) throw new Error(`Customers fetch failed: ${custRes.status}`);
      if (!payRes.ok) throw new Error(`Payments fetch failed: ${payRes.status}`);

      const customers = await custRes.json();
      const payments = await payRes.json();
      const credits = mapToCredits(customers, payments);

      set({ customers, payments, credits, loading: false });
    } catch (err) {
      set({ error: err.message || 'Failed to load data', loading: false });
    }
  },

  indents: [],
  addIndent: (indentData) => set((state) => ({ indents: [...state.indents, indentData] })),
  removeIndent: (indentId) => set((state) => ({ indents: state.indents.filter((i) => i.id !== indentId) })),
  updateIndent: (indentId, updatedData) =>
    set((state) => ({
      indents: state.indents.map((i) => (i.id === indentId ? { ...i, ...updatedData } : i)),
    })),
}));

export default useDataStore;
