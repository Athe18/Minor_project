import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { 
  Building2, 
  Users, 
  BookOpen, 
  UserSquare2, 
  GraduationCap, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  KeyRound, 
  ArrowRight,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function AdminDashboard({ navigateToTab }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminAPI.getDashboardStats();
        setStats(res.data);
      } catch (err) {
        setError('Failed to load system dashboard statistics.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading system overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
        {error}
      </div>
    );
  }

  const kpis = [
    { label: 'Total Departments', value: stats?.total_departments || 0, icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'Total Subjects', value: stats?.total_subjects || 0, icon: BookOpen, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Course Champions', value: stats?.total_champions || 0, icon: UserSquare2, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { label: 'Total Faculty', value: stats?.total_faculty || 0, icon: GraduationCap, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { label: 'Active Sessions', value: stats?.active_sessions || 0, icon: Activity, color: 'text-pink-600 bg-pink-50 border-pink-100' },
    { label: 'Subjects Completed', value: stats?.subjects_completed || 0, icon: CheckCircle2, color: 'text-teal-600 bg-teal-50 border-teal-100' },
    { label: 'Pending Subjects', value: stats?.pending_subjects || 0, icon: AlertCircle, color: 'text-rose-600 bg-rose-50 border-rose-100' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">ERP System Operations Control</h2>
        <p className="text-xs text-slate-500 mt-0.5">Real-time status overview, user statistics, system governance indices, and recent audit logs.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{kpi.value}</h3>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-Column Logs / Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Audit Logs (Left 2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Recent System Activity
            </h4>
            <button 
              onClick={() => navigateToTab('audit')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              View Full Audit Trail
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-2 pl-2">User</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Scope</th>
                  <th className="pb-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {stats?.recent_actions?.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">No actions recorded in audit logs.</td>
                  </tr>
                ) : (
                  stats?.recent_actions?.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-colors">
                      <td className="py-3 pl-2 font-semibold text-slate-700 dark:text-slate-350">{act.user_name || act.username || 'System'}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                          {act.action}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-[10px]">{act.entity || '—'}</td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">
                        {new Date(act.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & Recent Logins (Right Col) */}
        <div className="space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              Quick Administrative Access
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <button 
                onClick={() => navigateToTab('users')}
                className="w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <PlusCircle className="w-4 h-4 text-blue-600" />
                  Add User Account
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button 
                onClick={() => navigateToTab('subjects')}
                className="w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Configure Subjects
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button 
                onClick={() => navigateToTab('reports')}
                className="w-full py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  Export Overall Reports
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Recent Login Logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              Recent Logins
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[220px] overflow-y-auto pr-1">
              {stats?.recent_login_activity?.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No login attempts logged.</p>
              ) : (
                stats?.recent_login_activity?.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-[11px] gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-250 truncate max-w-[150px]">
                        {log.name || log.username}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{log.ip_address}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-slate-500 block">{new Date(log.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(log.login_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
