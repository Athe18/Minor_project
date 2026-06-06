import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  BookOpen, 
  TrendingUp, 
  AlertCircle,
  ArrowRight,
  Plus,
  Trash2,
  Play,
  Activity,
  Layers,
} from 'lucide-react';
import { subjectAPI } from '../api';


export default function Dashboard({ setActiveTab, onSelectSubject, readOnly }) {
  const [subjects, setSubjects] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, analysisRes] = await Promise.all([
        subjectAPI.list(),
        subjectAPI.getOverallAnalysis()
      ]);
      setSubjects(listRes.data);
      setAnalysis(analysisRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch academic subjects. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm(`Are you sure you want to delete the subject "${subjectId}"? This will delete all syllabus and calculations for this subject.`)) {
      return;
    }
    try {
      await subjectAPI.delete(subjectId);
      // Remove from localStorage if it was active
      if (localStorage.getItem('active_subject_id') === subjectId) {
        localStorage.removeItem('active_subject_id');
      }
      await loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete subject.');
    }
  };

  const handleWorkOnSubject = async (subjectId) => {
    try {
      await subjectAPI.setActive(subjectId);
      localStorage.setItem('active_subject_id', subjectId);
      if (onSelectSubject) {
        onSelectSubject(subjectId);
      }
      setActiveTab('workspace');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to set active subject.');
    }
  };

  // Map weak POs distribution for chart
  const weakPoChartData = analysis?.weak_po_distribution
    ? Object.keys(analysis.weak_po_distribution).map(poId => ({
        name: poId,
        'Subjects Affected': analysis.weak_po_distribution[poId]
      })).sort((a, b) => b['Subjects Affected'] - a['Subjects Affected'])
    : [];

  const getStatusBadge = (s) => {
    if (s.has_attainment) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1 w-max">
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          Completed
        </span>
      );
    }
    if (s.has_mappings) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1 w-max">
          <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
          CO-PO Mapped
        </span>
      );
    }
    if (s.has_syllabus) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center gap-1 w-max">
          <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
          Syllabus Uploaded
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1 w-max">
        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
        Syllabus Pending
      </span>
    );
  };

  if (loading && subjects.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading Academic Directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
            Academic Performance Dashboard
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Department-wide analytics, curriculum mapping directory, and student outcome attainment indexes.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* KPI 1: Total Subjects */}
        <div className="glass-panel p-5 flex items-center justify-between transition-all duration-300 hover:scale-[1.02]">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Subjects Managed</span>
            <h3 className="text-2xl font-bold text-slate-850 dark:text-white">
              {analysis?.total_subjects || 0}
            </h3>
            <span className="text-xs text-slate-500 font-medium">Active courses listed</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Overall CO Attainment */}
        <div className="glass-panel p-5 flex items-center justify-between transition-all duration-300 hover:scale-[1.02]">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg CO Attainment</span>
            <h3 className="text-2xl font-bold text-slate-850 dark:text-white">
              {analysis?.avg_co_attainment || 0}%
            </h3>
            <span className="text-xs text-slate-500 font-medium">Departmental overall score</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Total Weak PO Mappings */}
        <div className="glass-panel p-5 flex items-center justify-between transition-all duration-300 hover:scale-[1.02]">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Failing POs Identified</span>
            <h3 className="text-2xl font-bold text-slate-850 dark:text-white">
              {weakPoChartData.length} <span className="text-xs font-normal text-slate-400">unique POs</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Needs improvement suggestions</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Charts & Forms Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Directory & Add Subject */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Add New Subject Button */}
          {!readOnly && (
            <button
              onClick={() => setActiveTab('setup')}
              className="w-full glass-panel p-5 flex items-center justify-between gap-4 group hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-500 transition-colors">Add New Subject</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Open Course Setup to configure a new subject with CO generation</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200 shrink-0" />
            </button>
          )}

          {/* Directory table */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                Academic Subject Directory
              </h4>
              <span className="text-[10px] text-slate-450 font-bold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">
                {subjects.length} Subjects
              </span>
            </div>

            {subjects.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-sm text-slate-450">No academic subjects found. Create your first subject above!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Subject Name</th>
                      <th className="pb-3">Year</th>
                      <th className="pb-3">Semester</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Avg CO Attainment</th>
                      <th className="pb-3">Weak POs</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 text-xs">
                    {subjects.map((sub) => (
                      <tr key={sub.subject_name} className="hover:bg-slate-500/5 transition-colors group">
                        <td className="py-3.5 pl-2 font-semibold text-slate-800 dark:text-slate-100 max-w-[180px] truncate" title={sub.subject_name}>
                          {sub.subject_name}
                        </td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 font-semibold border dark:border-slate-800">
                            {sub.year}
                          </span>
                        </td>
                        <td className="py-3.5">
                          {sub.semester ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-semibold text-[10px]">
                              {sub.semester.replace('Semester ', 'Sem ')}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5">
                          {getStatusBadge(sub)}
                        </td>
                        <td className="py-3.5 font-bold text-slate-700 dark:text-slate-350">
                          {sub.has_attainment ? `${sub.avg_co_attainment}%` : 'N/A'}
                        </td>
                        <td className="py-3.5 font-semibold text-slate-700 dark:text-slate-350">
                          {sub.has_attainment ? (
                            sub.weak_pos_count > 0 ? (
                              <span className="text-rose-500 font-bold">{sub.weak_pos_count} POs</span>
                            ) : (
                              <span className="text-emerald-500">None</span>
                            )
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleWorkOnSubject(sub.subject_name)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-blue-500/10 transition-all hover:scale-[1.02]"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Work
                            </button>
                            
                            {!readOnly && (
                              <button
                                onClick={() => handleDeleteSubject(sub.subject_name)}
                                className="p-1.5 rounded-lg text-slate-450 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                                title="Delete Subject"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Department-wide Curriculum Gaps Chart */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-5 space-y-4 h-full flex flex-col">
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-500" />
                Department Curriculum Gaps
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Frequencies of weak PO attainments aggregated across all subjects. High numbers indicate core departmental needs.
              </p>
            </div>

            {weakPoChartData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-450 text-xs py-12">
                <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <span>No program outcome weaknesses recorded. Upload marks sheets for subjects to build analytics.</span>
              </div>
            ) : (
              <div className="flex-1 h-64 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weakPoChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#0f172a', 
                        borderColor: '#1e293b', 
                        borderRadius: '8px', 
                        color: '#f8fafc',
                        fontSize: '11px' 
                      }} 
                    />
                    <Bar dataKey="Subjects Affected" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
