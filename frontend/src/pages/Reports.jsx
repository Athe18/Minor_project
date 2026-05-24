import React, { useState, useEffect } from 'react';
import { reportAPI, authAPI } from '../api';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  History, 
  CheckCircle2, 
  Loader2, 
  Search,
  UserCheck
} from 'lucide-react';

export default function Reports({ courseState }) {
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [search, setSearch] = useState('');
  const [loginLogs, setLoginLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logTab, setLogTab] = useState('agent');

  const fetchLoginLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await authAPI.getLoginLogs();
      setLoginLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch login logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLoginLogs();
  }, []);

  const downloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const response = await reportAPI.downloadExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${(courseState?.subject_name || 'Course').replace(/\s+/g, '_')}_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download Excel report.');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const downloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const response = await reportAPI.downloadPDF();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${(courseState?.subject_name || 'Course').replace(/\s+/g, '_')}_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download PDF report.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString();
    } catch (e) {
      return isoStr;
    }
  };

  const logs = courseState?.audit_trail || [];
  const filteredLogs = logs.filter(l => 
    l.agent.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.detail.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLoginLogs = loginLogs.filter(l =>
    (l.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.ip_address || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.login_time || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold font-sans tracking-tight">Accreditation Dossiers & Audit Trails</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Export fully formatted Excel and PDF dossiers for NBA committee evaluations, and review the underlying multi-agent log trace.
        </p>
      </div>

      {/* Download Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Excel Dossier Card */}
        <div className="glass-panel p-6 flex flex-col justify-between gap-5">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">Excel Competency Matrix</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Contains complete Sheets 6A to 6F (Competency Matrix, Teaching Philosophy, Course Articulation Matrix, PO Attainments, Recommendations, and Audit trail) as required by academic accreditation offices.
              </p>
            </div>
          </div>
          
          <button
            onClick={downloadExcel}
            disabled={downloadingExcel || !courseState?.cos?.length}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-600/10 disabled:opacity-50"
          >
            {downloadingExcel ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Compiling Sheet...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Excel dossier (.xlsx)
              </>
            )}
          </button>
        </div>

        {/* PDF Attainment Dossier Card */}
        <div className="glass-panel p-6 flex flex-col justify-between gap-5">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">Executive Summary Report</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Generates a print-ready executive PDF dossier outlining course thresholds, outcomes, mapping matrix percentages, direct achievements, philosophy statements, and recommendations.
              </p>
            </div>
          </div>
          
          <button
            onClick={downloadPDF}
            disabled={downloadingPDF || !courseState?.cos?.length}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-rose-600/10 disabled:opacity-50"
          >
            {downloadingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Formatting PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Executive Report (.pdf)
              </>
            )}
          </button>
        </div>

      </div>

      {/* Audit Trail Section */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLogTab('agent')}
              className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                logTab === 'agent'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-slate-400 hover:text-slate-205'
              }`}
            >
              <History className="w-4 h-4" />
              AI Agent Audit Logs
            </button>
            <button
              onClick={() => setLogTab('user')}
              className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                logTab === 'user'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-slate-400 hover:text-slate-205'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              User Access Logs
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Filter logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          {logTab === 'agent' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3 w-40">Timestamp</th>
                  <th className="p-3 w-48">Agent</th>
                  <th className="p-3 w-28">Action</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                {filteredLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="p-3 text-slate-500 font-medium whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                    <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{log.agent}</td>
                    <td className="p-3 font-semibold uppercase text-[10px] text-slate-500">{log.action}</td>
                    <td className="p-3 text-slate-650 dark:text-slate-350 leading-relaxed font-normal">{log.detail}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-slate-450">No logs found matching filter terms.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3">Login Timestamp</th>
                  <th className="p-3">Username / Operator</th>
                  <th className="p-3">Source IP Address</th>
                  <th className="p-3">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                {filteredLoginLogs.map((log, i) => (
                  <tr key={log.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="p-3 text-slate-500 font-medium whitespace-nowrap">{formatTimestamp(log.login_time)}</td>
                    <td className="p-3 font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {log.username}
                    </td>
                    <td className="p-3 text-slate-650 dark:text-slate-400 font-mono">{log.ip_address}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.username === 'admin' 
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                          : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                      }`}>
                        {log.username === 'admin' ? 'Administrator' : 'Faculty Operator'}
                      </span>
                    </td>
                  </tr>
                ))}
                {loadingLogs && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-slate-455">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-blue-500" />
                      Loading logs from SQLite...
                    </td>
                  </tr>
                )}
                {!loadingLogs && filteredLoginLogs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-slate-450">No logins logged in the SQLite database yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
