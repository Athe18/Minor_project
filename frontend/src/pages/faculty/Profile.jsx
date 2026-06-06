import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { facultyAPI } from '../../api';
import { 
  User, 
  Lock, 
  History, 
  GraduationCap, 
  CheckCircle2, 
  Key,
  RefreshCw,
  Loader2
} from 'lucide-react';

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const location = useLocation();

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await facultyAPI.getProfile();
      setProfileData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load user profile metadata.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Handle anchor scrolling for password change
  useEffect(() => {
    if (location.hash === '#change-password') {
      const el = document.getElementById('change-password-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.hash, loading]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await facultyAPI.changePassword(newPassword);
      setPasswordSuccess('Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      setPasswordError(err.response?.data?.detail || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading Profile...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center justify-between">
        <span>{error}</span>
        <button onClick={loadProfile} className="flex items-center gap-1 font-bold underline">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          My Account Profile
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your login credentials and view administrative history logs.
        </p>
      </div>

      {/* Main Profile Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col items-center justify-center text-center space-y-3 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-850 pb-6 md:pb-0 md:pr-6">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <User className="w-10 h-10" />
          </div>
          <div>
            <h3 className="font-bold text-slate-850 dark:text-white text-sm">{profileData.name}</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase block mt-1 w-max mx-auto">
              {profileData.role.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Academic Department</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block flex items-center gap-1">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                {profileData.department}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Subject Assignments</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold mt-1 block">
                {profileData.assigned_subjects.length} Course(s) assigned
              </span>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-850" />

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Syllabus Rosters</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {profileData.assigned_subjects.map((sub, i) => (
                <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-850 border dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-350 text-[10px] font-bold uppercase">
                  {sub}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Password Panel */}
        <div id="change-password-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-500" />
            Security & Change Password
          </h4>
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">New Password</label>
              <input
                type="password"
                required
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={updatingPassword}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-semibold outline-none"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={updatingPassword}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs font-semibold outline-none"
              />
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs leading-relaxed">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-xs leading-relaxed flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                {passwordSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {updatingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>

        {/* Login Logs Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-500" />
            Login Session History
          </h4>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-500/5 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-semibold text-slate-500">
                {profileData.login_history.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="py-4 text-center text-slate-400">No login records found</td>
                  </tr>
                ) : (
                  profileData.login_history.map((log, i) => (
                    <tr key={i} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                        {new Date(log.login_time).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-[10px] font-bold uppercase">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
