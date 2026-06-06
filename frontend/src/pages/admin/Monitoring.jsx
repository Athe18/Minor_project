import React, { useState, useEffect } from 'react';
import { adminAPI, subjectAPI } from '../../api';
import { 
  Search, 
  BookOpen, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Play
} from 'lucide-react';

export default function Monitoring({ onSelectSubject }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getMonitoring();
      setData(res.data);
    } catch (err) {
      setError('Failed to retrieve monitoring records.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewSubject = async (subjectName) => {
    try {
      // Set active subject on backend
      await subjectAPI.setActive(subjectName);
      localStorage.setItem('active_subject_id', subjectName);
      if (onSelectSubject) {
        onSelectSubject(subjectName);
      }
      // Navigate to workspace tab
      window.location.pathname = '/workspace';
    } catch (err) {
      alert('Failed to initialize review access for this course workspace.');
    }
  };

  const completedCount = data.filter(d => d.status === 'Completed').length;
  const pendingCount = data.length - completedCount;

  // Calculate overall average of attainments
  const completedAtts = data.filter(d => d.status === 'Completed').map(d => d.avg_attainment);
  const overallAvg = completedAtts.length > 0
    ? round(completedAtts.reduce((a, b) => a + b, 0) / completedAtts.length, 1)
    : 0.0;

  function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
  }

  const filteredData = data.filter(d => 
    d.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.subject_code && d.subject_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    d.department_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.champion_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Completed
          </span>
        );
      case 'CO-PO Mapped':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
            CO-PO Mapped
          </span>
        );
      case 'COs Generated':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
            COs Generated
          </span>
        );
      case 'Syllabus Uploaded':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            Syllabus Uploaded
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            Syllabus Pending
          </span>
        );
    }
  };

  if (loading && data.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading monitoring trackers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Academic Auditing & Monitoring</h2>
        <p className="text-xs text-slate-500 mt-0.5">Continuous overview of curricular compliance progress, accreditation metrics, and student attainment averages.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Completed Subjects</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{completedCount}</h3>
            <span className="text-[10px] text-slate-500 font-medium">Attainment matrices generated</span>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center border text-emerald-600 bg-emerald-50 border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending Courses</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</h3>
            <span className="text-[10px] text-slate-500 font-medium">Curriculum components incomplete</span>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center border text-rose-600 bg-rose-50 border-rose-100">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Overall Attainment Average</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{overallAvg}%</h3>
            <span className="text-[10px] text-slate-500 font-medium">Aggregated branch attainment score</span>
          </div>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center border text-blue-600 bg-blue-50 border-blue-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Directory Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search by subject code, title, champion, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Monitoring Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                <th className="py-3.5 pl-4">Subject</th>
                <th className="py-3.5">Department</th>
                <th className="py-3.5">Year / Sem</th>
                <th className="py-3.5">Course Champion</th>
                <th className="py-3.5">Progress Status</th>
                <th className="py-3.5">Avg Attainment</th>
                <th className="py-3.5 text-right pr-4">Auditing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">No subjects currently active under tracking.</td>
                </tr>
              ) : (
                filteredData.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/20 transition-colors">
                    <td className="py-3.5 pl-4 font-bold text-slate-900 dark:text-white">
                      <div>
                        <span>{d.subject_name}</span>
                        {d.subject_code && (
                          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">{d.subject_code}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-650 dark:text-slate-400">{d.department_name}</td>
                    <td className="py-3.5 text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="font-semibold block">{d.year}</span>
                        <span className="text-[10px] block mt-0.5 text-slate-400">{d.semester}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-semibold text-slate-700 dark:text-slate-350">{d.champion_name}</td>
                    <td className="py-3.5">{getStatusBadge(d.status)}</td>
                    <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {d.status === 'Completed' ? `${d.avg_attainment}%` : 'N/A'}
                    </td>
                    <td className="py-3.5 text-right pr-4">
                      <button
                        onClick={() => handleReviewSubject(d.subject_name)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all hover:scale-[1.02] ml-auto"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        Audit Workspace
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
