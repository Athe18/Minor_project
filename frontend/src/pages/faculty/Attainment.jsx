import React, { useState, useEffect } from 'react';
import { facultyAPI } from '../../api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Award,
  HelpCircle
} from 'lucide-react';

export default function Attainment() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeSubject = localStorage.getItem('active_subject_id') || '';

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await facultyAPI.getAttainment();
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch attainment reports for this subject.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading Attainment Metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center justify-between">
        <span>{error || 'No active subject context. Select a subject first.'}</span>
        <button onClick={loadData} className="flex items-center gap-1 font-bold underline">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const hasCOAttainment = data.co_attainment && data.co_attainment.length > 0;
  const hasPOAttainment = data.po_attainment && data.po_attainment.length > 0;

  // Prepare chart data for COs
  const coChartData = hasCOAttainment 
    ? data.co_attainment.map((co) => ({
        name: co.co_id.toUpperCase(),
        'Average Attainment %': parseFloat(co.avg_percentage.toFixed(1)),
        'Target Attainment %': 60.0 // Default target or lookup target if available
      }))
    : [];

  // Prepare chart data for POs
  const poChartData = hasPOAttainment
    ? data.po_attainment.map((po) => ({
        name: po.po_id,
        'Attainment Level': parseFloat(po.weighted_attainment.toFixed(2))
      }))
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Attainment Levels & Gap Analysis
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visual reports comparing student performance indicators against course targets.
          </p>
        </div>
        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
          Read-Only Mode
        </span>
      </div>

      {!hasCOAttainment && !hasPOAttainment ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 rounded-xl text-center text-slate-550 text-xs">
          No attainment data has been calculated yet. Go to Marks Upload and process marks sheets.
        </div>
      ) : (
        <>
          {/* Attainment Levels Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CO Attainment Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  CO Attainment Analysis (%)
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Average scores achieved per Course Outcome against system target.</p>
              </div>

              <div className="h-64 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} unit="%" />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#0f172a', 
                        borderColor: '#1e293b', 
                        borderRadius: '8px', 
                        color: '#f8fafc',
                        fontSize: '11px' 
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Average Attainment %" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="Target Attainment %" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PO Attainment Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-500" />
                  PO Weighted Attainment Levels (0-3 scale)
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Mapped strengths from performance indicators weighted by actual outcomes.</p>
              </div>

              <div className="h-64 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={poChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 3]} />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#0f172a', 
                        borderColor: '#1e293b', 
                        borderRadius: '8px', 
                        color: '#f8fafc',
                        fontSize: '11px' 
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Attainment Level" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Details list of attainments */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Detailed Attainment Roster
            </h3>
            
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-500/5 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4">CO ID</th>
                    <th className="py-2.5 text-center">IA (%)</th>
                    <th className="py-2.5 text-center">MSE (%)</th>
                    <th className="py-2.5 text-center">ESE (%)</th>
                    <th className="py-2.5 text-center">Avg Attainment</th>
                    <th className="py-2.5 text-center">Threshold Level</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 font-semibold text-slate-700 dark:text-slate-350">
                  {data.co_attainment.map((co) => {
                    const isPassed = co.avg_percentage >= 55.0; // default benchmark
                    return (
                      <tr key={co.co_id} className="hover:bg-slate-500/5 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-white uppercase">{co.co_id}</td>
                        <td className="py-2.5 text-center">{co.ia_percentage !== null ? `${co.ia_percentage.toFixed(1)}%` : '—'}</td>
                        <td className="py-2.5 text-center">{co.mse_percentage !== null ? `${co.mse_percentage.toFixed(1)}%` : '—'}</td>
                        <td className="py-2.5 text-center">{co.ese_percentage !== null ? `${co.ese_percentage.toFixed(1)}%` : '—'}</td>
                        <td className="py-2.5 text-center font-bold text-slate-800 dark:text-white">{co.avg_percentage.toFixed(1)}%</td>
                        <td className="py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-850 border dark:border-slate-800 text-[10px] font-bold text-slate-550">
                            Level {co.achieved_level}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {isPassed ? (
                            <span className="text-emerald-500 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Passed
                            </span>
                          ) : (
                            <span className="text-rose-500 font-bold flex items-center justify-center gap-1">
                              <AlertCircle className="w-4 h-4" /> Weak
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations and gap improvement notes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Curriculum Gap Recommendations
            </h3>
            
            {data.recommendations.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 rounded-lg text-xs leading-relaxed">
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>No major curriculum gaps or action steps recommended. Average thresholds are met.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 border border-slate-100 dark:border-slate-850 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-blue-500 uppercase">Target: {rec.target}</span>
                      <span className={`px-2 py-0.5 rounded-sm text-[9px] uppercase ${
                        rec.priority === 'High' 
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' 
                          : rec.priority === 'Medium' 
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        Priority: {rec.priority}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{rec.issue}</p>
                    <p className="text-slate-550 dark:text-slate-400 mt-1 font-semibold">{rec.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
