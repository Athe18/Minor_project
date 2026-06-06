import React, { useState, useEffect } from 'react';
import { facultyAPI } from '../../api';
import { 
  Layers, 
  BookOpen, 
  HelpCircle,
  RefreshCw,
  Award
} from 'lucide-react';

export default function COOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeSubject = localStorage.getItem('active_subject_id') || '';

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await facultyAPI.getCOOverview();
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch CO-PO mapping overview details.');
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
        <p className="text-xs font-semibold text-slate-500">Loading CO-PO Mapping...</p>
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

  // Create lookup dictionary for mapping strength
  const strengthLookup = {};
  data.mappings.forEach((m) => {
    strengthLookup[`${m.co_id}-${m.po_id}`] = m.strength;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Curriculum Outcomes & Mapping Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Read-only articulation of course outcomes mapped to professional program outcomes.
          </p>
        </div>
        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
          Read-Only Mode
        </span>
      </div>

      {/* Course Context Option */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Course Description & Syllabus Context
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {data.course_description || 'No course context details uploaded yet by the Course Champion.'}
        </p>
      </div>

      {/* CO-PO Articulation Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          CO-PO Articulation Grid
        </h3>
        
        {data.cos.length === 0 || data.pos.length === 0 ? (
          <p className="text-xs text-slate-450 text-center py-6">No COs or POs configured to build mapping grid.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-slate-500/5 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-450 font-bold uppercase">
                  <th className="py-3 px-4 text-left w-36">Course Outcomes</th>
                  {data.pos.map((po) => (
                    <th key={po.po_id} className="py-3 w-16" title={po.statement}>
                      {po.po_id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-semibold text-slate-750 dark:text-slate-350">
                {data.cos.map((co) => (
                  <tr key={co.co_id} className="hover:bg-slate-500/5">
                    <td className="py-3.5 px-4 text-left font-bold text-slate-800 dark:text-white uppercase">
                      {co.co_id}
                    </td>
                    {data.pos.map((po) => {
                      const strength = strengthLookup[`${co.co_id}-${po.po_id}`] ?? 0;
                      return (
                        <td key={po.po_id} className="py-3.5">
                          {strength > 0 ? (
                            <span className={`w-7 h-7 rounded-full font-bold flex items-center justify-center mx-auto text-xs ${
                              strength === 3 
                                ? 'bg-blue-600 text-white shadow-xs' 
                                : strength === 2 
                                  ? 'bg-blue-300/30 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-500/20' 
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border dark:border-slate-700'
                            }`}>
                              {strength}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-750">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-600 rounded" /> 3 - Substantial (High)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-100 dark:bg-blue-950 border border-blue-500/20 rounded" /> 2 - Moderate (Medium)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-100 dark:bg-slate-800 rounded" /> 1 - Slight (Low)</span>
        </div>
      </div>

      {/* Outcomes Details splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Course Outcomes statement list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            Course Outcomes (COs)
          </h3>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {data.cos.map((co) => (
              <div key={co.co_id} className="p-3 border border-slate-100 dark:border-slate-850 rounded-lg text-xs leading-relaxed space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-blue-500 uppercase">{co.co_id}</span>
                  <span className="px-2 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">
                    Bloom's level: {co.blooms_level} ({co.blooms_keyword})
                  </span>
                </div>
                <p className="text-slate-650 dark:text-slate-400 mt-1 font-semibold">{co.statement}</p>
                <p className="text-[10px] text-slate-400 pt-1 font-bold">Target Attainment: {co.target_attainment}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* Program Outcomes statements */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-500" />
            Program Outcomes (POs)
          </h3>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {data.pos.map((po) => (
              <div key={po.po_id} className="p-3 border border-slate-100 dark:border-slate-850 rounded-lg text-xs leading-relaxed space-y-1">
                <span className="font-bold text-blue-500 uppercase">{po.po_id}</span>
                <p className="text-slate-650 dark:text-slate-400 mt-1 font-semibold">{po.statement}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Performance Indicators (PIs) read-only */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-500" />
          Competency & Performance Indicators (PIs)
        </h3>
        
        {data.performance_indicators.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No performance indicators configured for this department.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {data.performance_indicators.map((pi) => (
              <div key={pi.pi_id} className="p-3 border border-slate-100 dark:border-slate-850 rounded-lg text-xs leading-relaxed">
                <div className="flex items-center justify-between font-bold text-blue-500 mb-1">
                  <span className="uppercase">{pi.pi_id} (PO: {pi.po_id})</span>
                  <span className="text-[10px] text-slate-450 uppercase">{pi.competency_id}</span>
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-250">{pi.competency_statement}</p>
                <p className="text-slate-550 dark:text-slate-400 mt-1 font-semibold">{pi.pi_statement}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
