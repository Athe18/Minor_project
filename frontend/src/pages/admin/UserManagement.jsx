import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Key, 
  ToggleLeft, 
  ToggleRight, 
  UserCog, 
  X,
  Check,
  AlertTriangle
} from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Selected/Active Form States
  const [selectedUser, setSelectedUser] = useState(null);
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('course_faculty');
  const [formDeptId, setFormDeptId] = useState('');
  const [formStatus, setFormStatus] = useState('active');

  const [newPassword, setNewPassword] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, deptsRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getDepartments()
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      setError('Failed to retrieve user directories or department details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formUsername || !formPassword || !formName) {
      alert('Please fill in name, username, and password fields.');
      return;
    }
    try {
      await adminAPI.createUser({
        username: formUsername,
        password: formPassword,
        role: formRole,
        name: formName,
        department_id: formDeptId ? parseInt(formDeptId) : null
      });
      setShowCreateModal(false);
      resetForms();
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create user account.');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await adminAPI.updateUser(selectedUser.id, {
        username: formUsername,
        role: formRole,
        name: formName,
        department_id: formDeptId ? parseInt(formDeptId) : null,
        status: formStatus
      });
      setShowEditModal(false);
      resetForms();
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update user account details.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    try {
      await adminAPI.resetPassword(selectedUser.id, newPassword);
      setShowPasswordModal(false);
      setNewPassword('');
      alert('Password reset completed successfully.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reset password.');
    }
  };

  const handleToggleStatus = async (user) => {
    const confirmation = window.confirm(`Are you sure you want to ${user.status === 'active' ? 'disable' : 'enable'} the account for "${user.name}"?`);
    if (!confirmation) return;
    try {
      const res = await adminAPI.toggleUserStatus(user.id);
      // Update locally
      setUsers(users.map(u => u.id === user.id ? { ...u, status: res.data.status } : u));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle account status.');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormRole(user.role);
    setFormDeptId(user.department_id || '');
    setFormStatus(user.status || 'active');
    setShowEditModal(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const resetForms = () => {
    setSelectedUser(null);
    setFormName('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('course_faculty');
    setFormDeptId('');
    setFormStatus('active');
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && users.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading user accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Accounts Administration</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage institutional profiles, designate academic roles, reset credentials, or disable access keys.</p>
        </div>
        <button
          onClick={() => { resetForms(); setShowCreateModal(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Directory Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search by name, username, or system role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline-block">
          Found {filteredUsers.length} of {users.length} Users
        </span>
      </div>

      {/* Users Database Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                <th className="py-3.5 pl-4">Name</th>
                <th className="py-3.5">Username</th>
                <th className="py-3.5">System Role</th>
                <th className="py-3.5">Department</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5">Created Date</th>
                <th className="py-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">No user accounts found matching the criteria.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/20 transition-colors">
                    <td className="py-3.5 pl-4 font-bold text-slate-900 dark:text-white">{u.name}</td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{u.username}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        u.role === 'admin' 
                          ? 'bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-950/20 dark:border-purple-900/50' 
                          : u.role === 'course_champion'
                            ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/50'
                            : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-800/40 dark:border-slate-800/80 dark:text-slate-400'
                      }`}>
                        {u.role.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 dark:text-slate-400">{u.department_name || 'Not Linked'}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${
                        u.status === 'active' ? 'text-emerald-600' : 'text-rose-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          u.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                        }`} />
                        {u.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-450">{new Date(u.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="py-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                          title="Edit User Profile"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => openPasswordModal(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                          title="Reset Account Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.status === 'active' 
                              ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20' 
                              : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                          }`}
                          title={u.status === 'active' ? 'Disable Account Access' : 'Enable Account Access'}
                        >
                          {u.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE USER MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <UserPlus className="w-4.5 h-4.5 text-blue-600" />
                Create New User Profile
              </h4>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Dr. Jane Doe"
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Username (Faculty ID / Code)</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. janedoe"
                  value={formUsername} 
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Initial Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="Minimum 6 characters"
                  value={formPassword} 
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">System Role</label>
                  <select 
                    value={formRole} 
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="course_champion">Course Champion</option>
                    <option value="course_faculty">Course Faculty</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Academic Department</label>
                  <select 
                    value={formDeptId} 
                    onChange={(e) => setFormDeptId(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                  >
                    <option value="">Not Assigned / Standalone</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <UserCog className="w-4.5 h-4.5 text-blue-600" />
                Edit User Profile Details
              </h4>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Username</label>
                <input 
                  type="text" 
                  required
                  value={formUsername} 
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">System Role</label>
                  <select 
                    value={formRole} 
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="course_champion">Course Champion</option>
                    <option value="course_faculty">Course Faculty</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Department</label>
                  <select 
                    value={formDeptId} 
                    onChange={(e) => setFormDeptId(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                  >
                    <option value="">Not Assigned / Standalone</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Access Key Status</label>
                <select 
                  value={formStatus} 
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                >
                  <option value="active">Active (Permit Access)</option>
                  <option value="disabled">Disabled (Lock Credentials)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PASSWORD RESET MODAL --- */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Key className="w-4.5 h-4.5 text-amber-600" />
                Reset Account Password
              </h4>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg flex gap-2">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-normal font-semibold">
                You are updating the credentials for <b>{selectedUser?.name}</b>. The user will be required to log in again using their new password.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">New Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
