import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Search, ChevronLeft, ChevronRight, Plus, X, Shield, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SCAN_SECRET;

const PAGE_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'payments', label: 'Payment Details' },
  { key: 'scan', label: 'Scan Entry' },
];

const DEFAULT_PERMISSIONS = { dashboard: true, payments: false, scan: false };

const authHeaders = {
  'Content-Type': 'application/json',
  'x-admin-secret': ADMIN_SECRET,
};

function PermBadges({ permissions }) {
  return (
    <div className="flex gap-1 justify-center flex-wrap">
      {PAGE_OPTIONS.map(p => (
        <span
          key={p.key}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
            (permissions || {})[p.key]
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-400 line-through'
          }`}
        >
          {p.label}
        </span>
      ))}
    </div>
  );
}

function PermCheckboxes({ permissions, onChange }) {
  return (
    <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
      {PAGE_OPTIONS.map(p => (
        <label key={p.key} className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={(permissions || {})[p.key] || false}
            onChange={() => onChange({ ...permissions, [p.key]: !(permissions || {})[p.key] })}
            className="w-4 h-4 rounded accent-indigo-600"
          />
          <span className="text-sm text-gray-700 font-medium">{p.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '', username: '', password: '', role: 'USER',
    permissions: { ...DEFAULT_PERMISSIONS },
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.username.trim() || !newUser.password.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setUsers(prev => [...prev, data]);
      setNewUser({ name: '', username: '', password: '', role: 'USER', permissions: { ...DEFAULT_PERMISSIONS } });
      setShowAddModal(false);
      toast.success('User created!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser.name.trim()) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      const payload = { name: editingUser.name, permissions: editingUser.permissions };
      if (editingUser.password) payload.password = editingUser.password;
      const res = await fetch(`${API_BASE}/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      setUsers(prev => prev.map(u => u.id === editingUser.id ? data : u));
      setShowEditModal(false);
      setEditingUser(null);
      toast.success('User updated!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('User deleted!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openEdit = (user) => {
    setEditingUser({ ...user, permissions: user.permissions || { ...DEFAULT_PERMISSIONS }, password: '' });
    setShowEditModal(true);
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full">
        <div className="flex items-center gap-2 w-full lg:flex-1">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px]"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="p-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition flex-shrink-0"
            title="Refresh"
          >
            <RefreshCw size={15} className="text-gray-500" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center gap-2 transition shadow-sm flex-shrink-0"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50">
              {paginatedUsers.map((user, idx) => (
                <div key={user.id} className="bg-white rounded-lg border border-indigo-50 shadow-sm p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] font-medium text-gray-400 uppercase tracking-widest block">#{(currentPage - 1) * itemsPerPage + idx + 1}</span>
                      <h3 className="font-semibold text-gray-900 text-[13px]">{user.name}</h3>
                      <p className="text-[10px] text-gray-500 font-mono">@{user.username}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role || 'USER'}
                    </span>
                  </div>
                  {user.role !== 'ADMIN' && (
                    <div className="flex flex-wrap gap-1">
                      {PAGE_OPTIONS.map(p => (
                        <span key={p.key} className={`px-2 py-0.5 rounded text-[9px] font-semibold ${(user.permissions || {})[p.key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {p.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {user.role === 'ADMIN' && (
                    <div className="flex items-center gap-1 text-[10px] text-purple-600 font-semibold">
                      <Shield size={11} /> Full Access
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(user)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[10px] font-medium">
                      <Edit2 size={12} /> Edit
                    </button>
                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-[10px] font-medium">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-4 text-center text-gray-500 bg-white rounded-xl border text-xs">No users found.</div>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full min-w-[800px] relative">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    {['SN', 'Name', 'Username', 'Role', 'Page Access', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user, idx) => (
                    <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-center text-sm text-gray-500">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-3 py-3 text-center text-sm font-semibold text-gray-800">{user.name}</td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600 font-mono">@{user.username}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.role || 'USER'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        {user.role === 'ADMIN'
                          ? <span className="text-xs text-purple-600 font-semibold flex items-center justify-center gap-1"><Shield size={13} /> All Pages</span>
                          : <PermBadges permissions={user.permissions} />
                        }
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => openEdit(user)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold text-sm transition-colors">
                            <Edit2 size={14} /> Edit
                          </button>
                          <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 flex items-center gap-1 font-semibold text-sm transition-colors">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-gray-500 font-medium">No users found.</div>
              )}
            </div>
          </>
        )}

        {/* Pagination */}
        <div className="px-2 md:px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2 rounded-b-lg">
          <div className="flex items-center gap-1.5">
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-gray-300 rounded-md px-1 py-1 text-[10px] md:text-sm bg-white font-medium shadow-sm focus:outline-none"
            >
              {[10, 15, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-[10px] md:text-sm text-gray-500 whitespace-nowrap font-medium">
              {filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
            </span>
          </div>
          <div className="flex gap-1.5 items-center text-gray-700">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 hover:bg-gray-50 transition shadow-sm">
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <span className="text-[10px] md:text-sm font-medium text-gray-500">Pg {currentPage}/{totalPages || 1}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 hover:bg-gray-50 transition shadow-sm">
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[95vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-red-500 transition"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="e.g. ramesh_kumar"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Set a password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                {newUser.role === 'USER' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Page Access</label>
                    <PermCheckboxes
                      permissions={newUser.permissions}
                      onChange={perms => setNewUser({ ...newUser, permissions: perms })}
                    />
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg transition text-sm"
                  >
                    {submitting ? 'Creating...' : 'Create User'}
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[95vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Edit User</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-red-500 transition"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                <input
                  value={editingUser.username}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editingUser.password}
                  onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
              </div>
              {editingUser.role !== 'ADMIN' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Page Access</label>
                  <PermCheckboxes
                    permissions={editingUser.permissions}
                    onChange={perms => setEditingUser({ ...editingUser, permissions: perms })}
                  />
                </div>
              )}
              {editingUser.role === 'ADMIN' && (
                <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                  <Shield size={16} />
                  <span className="font-medium">Admin has access to all pages</span>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSaveUser}
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg transition text-sm"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
