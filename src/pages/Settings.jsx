import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Search, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { getUsers, saveUsers } from '../utils/storageManager';

export default function Settings() {
  const [users, setUsers] = useState(getUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Modal and new user state
  const [showFormModal, setShowFormModal] = useState(false);
  const [newUser, setNewUser] = useState({
    id: '',
    name: '',
    password: '',
    role: 'USER'
  });

  // Edit user state
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(q)) ||
      (user.id && user.id.toLowerCase().includes(q)) ||
      (user.role && user.role.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ===== USER CRUD ACTIONS =====
  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUser.id.trim() || !newUser.name.trim() || !newUser.password.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    // Check if user already exists
    if (users.some(u => u.id === newUser.id)) {
      toast.error('User ID already exists');
      return;
    }
    const updatedUsers = [...users, { ...newUser, accessPages: [] }];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setNewUser({
      id: '',
      name: '',
      password: '',
      role: 'USER'
    });
    toast.success('User created successfully!');
    setShowFormModal(false);
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.id);
    setEditingUser({ ...user });
  };

  const handleSaveUser = () => {
    if (!editingUser.name.trim() || !editingUser.password.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    const updatedUsers = users.map(u => u.id === editingUserId ? editingUser : u);
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    setEditingUserId(null);
    setEditingUser(null);
    toast.success('User updated successfully!');
  };

  const handleDeleteUser = (userId) => {
    if (confirm('Are you sure you want to delete this user?')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      saveUsers(updatedUsers);
      toast.success('User deleted!');
    }
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Header section with Search and Add User */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full">
        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center">
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px]"
              />
            </div>
            {/* Mobile Add User Button */}
            <button
              onClick={() => setShowFormModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition"
              title="Add New User"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Desktop Add User Button */}
        <button
          onClick={() => setShowFormModal(true)}
          className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0 mt-2 lg:mt-0"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Users List Container */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0">
        
        {/* Mobile View: User Cards */}
        <div className="md:hidden flex flex-col gap-2 p-2 overflow-y-auto flex-1 bg-slate-50/50 pb-2">
          {paginatedUsers.map((user, idx) => (
            <div key={user.id} className="bg-white rounded-lg border border-indigo-50 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.1)] p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-medium text-gray-400 uppercase tracking-widest block leading-none mb-0.5">
                    #{(currentPage - 1) * itemsPerPage + idx + 1}
                  </span>
                  <h3 className="font-semibold text-gray-900 text-[12px] uppercase tracking-tight">{user.name}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {user.role}
                </span>
              </div>
              <div className="bg-slate-50 rounded p-2 border border-slate-100 text-[10px] text-gray-600 space-y-0.5">
                <div><span className="font-semibold text-gray-500">ID:</span> {user.id}</div>
                <div><span className="font-semibold text-gray-500">Password:</span> ••••••••</div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => handleEditUser(user)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[10px] font-medium">
                  <Edit2 size={12} /> Edit
                </button>
                <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-[10px] font-medium">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="p-4 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm font-medium text-xs">
              No users found.
            </div>
          )}
        </div>

        {/* Desktop View: Styled Table */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full min-w-[700px] relative">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">SN</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Name</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">User ID</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Password</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Role</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-900 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user, idx) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  {editingUserId === user.id ? (
                    <>
                      <td className="px-3 py-3 text-center text-sm text-gray-900 font-medium">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={editingUser.name}
                          onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 w-full text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="text"
                          value={editingUser.id}
                          disabled
                          className="border border-gray-300 rounded px-2 py-1 w-full text-sm bg-gray-100 cursor-not-allowed"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={editingUser.password}
                          onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 w-full text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                          className="border border-gray-300 rounded px-2 py-1 w-full text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={handleSaveUser} className="text-green-600 hover:text-green-800 font-semibold text-sm">Save</button>
                          <button onClick={() => setEditingUserId(null)} className="text-gray-500 hover:text-gray-800 text-sm font-medium">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 text-center text-sm text-gray-900 font-medium">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-700 font-medium">{user.name}</td>
                      <td className="px-3 py-3 text-center text-sm text-gray-700">{user.id}</td>
                      <td className="px-3 py-3 text-center text-sm text-gray-500 font-mono">••••••••</td>
                      <td className="px-3 py-3 text-center text-sm">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-sm">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => handleEditUser(user)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold transition-colors">
                            <Edit2 size={15} /> Edit
                          </button>
                          <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 flex items-center gap-1 font-semibold transition-colors">
                            <Trash2 size={15} /> Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-medium">No users found.</div>
          )}
        </div>

        {/* Footer & Pagination */}
        <div className="px-2 md:px-4 py-2 border-t border-gray-200 bg-gray-50 flex flex-col lg:flex-row items-center justify-between gap-2 lg:gap-4 rounded-b-lg pb-2 md:pb-3">
          <div className="flex w-full lg:w-auto justify-between items-center gap-2">
            <div className="text-[10px] md:text-sm text-gray-600 flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-300 rounded-md px-1 flex-shrink-0 md:px-2 py-1 focus:outline-none focus:border-indigo-500 bg-white font-medium text-[10px] md:text-sm shadow-sm"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-[10px] md:text-sm text-gray-500 whitespace-nowrap ml-1 font-medium">
                {filteredUsers.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
              </span>
            </div>

            <div className="flex gap-1.5 md:gap-2 justify-end items-center flex-shrink-0 text-gray-700">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
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
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
            <div className="p-2 md:p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-base md:text-xl font-bold text-gray-900">Add New User</h2>
              <button type="button" onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="p-3 md:p-5 overflow-y-auto flex-1">
              <form onSubmit={handleAddUser} className="space-y-3 md:space-y-4">
                {/* User ID */}
                <div>
                  <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                    User ID *
                  </label>
                  <input
                    type="text"
                    value={newUser.id}
                    onChange={(e) => setNewUser({ ...newUser, id: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="e.g. employee3"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                    required
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                    required
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-[11px] md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1.5">
                    Role *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-[11px] md:text-base appearance-none bg-white min-h-[30px] md:min-h-[42px]"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                {/* Submit Button */}
                <div className="flex gap-2 md:gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-1.5 px-4 md:py-2 md:px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition text-[12px] md:text-base h-[38px] md:h-[42px]"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-1.5 md:px-6 md:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium text-[12px] md:text-base h-[38px] md:h-[42px]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
