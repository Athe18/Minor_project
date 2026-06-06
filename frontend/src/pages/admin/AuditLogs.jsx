import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { 
  Search, 
  History, 
  Download, 
  X,
  Calendar,
  Filter
} from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (actionFilter) filters.action = actionFilter;
      if (entityFilter) filters.entity = entityFilter;
      if (startDate) filters.start_date = new Date(startDate).toISOString();
      if (endDate) {
        // Include the entire end day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filters.end_date = end.toISOString();
      }
      const res = await adminAPI.getAuditLogs(filters);
      setLogs(res.data);
    } catch (err) {
      setError('Failed to fetch system audit logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, startDate, endDate]);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    // Header
    const headers = ["Log ID", "User Name", "Username", "Action", "Entity Scope", "Subject Impacted", "Timestamp", "Before State", "After State"];
    
    // Rows
    const rows = logs.map(l => [
      l.id,
      l.user_name || 'System',
      l.username || 'System',
      l.action,
      l.entity || '',
      l.subject_name || '',
      new Date(l.created_at).toLocaleString(),
      l.old_value ? JSON.stringify(l.old_value).replace(/"/g, '""') : '',
      l.new_value ? JSON.stringify(l.new_value).replace(/"/g, '""') : ''
    ]);
    
    // CSV structure
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MIT_OBE_AuditTrail_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Local client side search filter
  const filteredLogs = logs.filter(l => 
    (l.user_name && l.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (l.username && l.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (l.action && l.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (l.subject_name && l.subject_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const actionsList = [
    'LOGIN', 'CREATE_USER', 'EDIT_USER', 'DISABLE_USER', 'ENABLE_USER', 'RESET_PASSWORD',
    'CREATE_DEPARTMENT', 'EDIT_DEPARTMENT', 'CREATE_SUBJECT', 'DELETE_SUBJECT', 
    'ASSIGN_CHAMPION', 'ADD_FACULTY', 'REMOVE_FACULTY',
    'GENERATE_CO', 'FINALIZE_CO', 'UPLOAD_MARKS', 'SAVE_SETTINGS', 'EXPORT_REPORT'
  ];

  const entitiesList = [
    'user', 'users', 'departments', 'subjects', 'course_assignments', 
    'course_outcomes', 'attainment', 'system_settings', 'excel', 'pdf'
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">Trace administrative, academic, and system-wide configurations logs for compliance and accountability checks.</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] shrink-0"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Query Filter and Search Dashboard */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
          <Filter className="w-4 h-4 text-blue-600" />
          Query Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Action Filter */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">Operation Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
            >
              <option value="">-- All Actions --</option>
              {actionsList.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Scope Filter */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">Entity Scope</label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
            >
              <option value="">-- All Scopes --</option>
              {entitiesList.map(ent => (
                <option key={ent} value={ent}>{ent.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">Start Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 pr-9 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">End Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 pr-9 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Search Query */}
          <div className="space-y-1">
            <label className="font-bold text-slate-500">Keyword Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="User / Subject keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(actionFilter || entityFilter || startDate || endDate || searchQuery) && (
          <button
            onClick={() => {
              setActionFilter('');
              setEntityFilter('');
              setStartDate('');
              setEndDate('');
              setSearchQuery('');
            }}
            className="text-[10px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-0.5 pt-2"
          >
            <X className="w-3.5 h-3.5" />
            Clear Active Filters
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Querying audit logs database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-3.5 pl-4">Log ID</th>
                  <th className="py-3.5">User</th>
                  <th className="py-3.5">Action</th>
                  <th className="py-3.5">Scope</th>
                  <th className="py-3.5">Subject Impacted</th>
                  <th className="py-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">No logs found matching query filters.</td>
                  </tr>
                ) : (
                  filteredLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/20 transition-colors">
                      <td className="py-3.5 pl-4 text-slate-500 dark:text-slate-400 font-mono text-[10px]">{l.id}</td>
                      <td className="py-3.5">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{l.user_name || 'System'}</span>
                          <span className="text-[9px] text-slate-400 font-mono block">@{l.username || 'system'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 font-bold">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3.5 font-semibold text-slate-650 dark:text-slate-455 font-mono text-[10px]">{l.entity || '—'}</td>
                      <td className="py-3.5 text-slate-700 dark:text-slate-300 font-semibold">{l.subject_name || '—'}</td>
                      <td className="py-3.5 text-slate-500 dark:text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
