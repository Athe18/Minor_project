import React, { useState, useEffect } from 'react';
import { attainmentAPI } from '../api';
import { 
  Upload, 
  Search, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Attainment({ courseState, refreshState }) {
  const [coAttainment, setCoAttainment] = useState([]);
  const [poAttainment, setPoAttainment] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const itemsPerPage = 8;

  const [checkedComponents, setCheckedComponents] = useState({});

  const handleCheckboxChange = (coId, type) => {
    setCheckedComponents(prev => {
      const current = prev[coId] || { IA: true, MSE: true, CIE: true, ESE: true };
      let updated = { ...current };
      
      if (type === 'CIE') {
        const val = !current.CIE;
        updated.CIE = val;
        updated.IA = val;
        updated.MSE = val;
      } else if (type === 'IA' || type === 'MSE') {
        updated[type] = !current[type];
        updated.CIE = updated.IA || updated.MSE;
      } else {
        updated[type] = !current[type];
      }
      
      return {
        ...prev,
        [coId]: updated
      };
    });
  };

  // Helper for dynamic attainment calculations
  const lvl1Val = courseState?.level1_threshold || 55;
  const lvl2Val = courseState?.level2_threshold || 65;
  const lvl3Val = courseState?.level3_threshold || 75;

  const coMap = React.useMemo(() => {
    const map = {};
    if (courseState?.cos) {
      courseState.cos.forEach(co => {
        map[co.co_id] = co;
      });
    }
    return map;
  }, [courseState?.cos]);

  const computedCoAttainments = React.useMemo(() => {
    return (courseState?.co_attainment || []).map(att => {
      const checks = checkedComponents[att.co_id] || { IA: true, MSE: true, CIE: true, ESE: true };
      
      const iaMax = 30;
      const mseMax = 20;
      const eseMaxVal = 50;

      // Simulated raw scores
      const iaScore = checks.IA ? (att.avg_percentage * iaMax / 100) : 0;
      const mseScore = checks.MSE ? (att.avg_percentage * mseMax / 100) : 0;
      const cieScore = checks.CIE ? (iaScore + mseScore) : 0;
      
      const currentCieMax = (checks.IA ? iaMax : 0) + (checks.MSE ? mseMax : 0);
      const ciePercentage = currentCieMax > 0 ? (cieScore / currentCieMax * 100) : 0;

      const eseScore = checks.ESE ? (att.avg_percentage * eseMaxVal / 100) : 0;
      const currentEseMax = checks.ESE ? eseMaxVal : 0;
      const esePercentage = currentEseMax > 0 ? (eseScore / currentEseMax * 100) : 0;

      const getLevel = (pct) => {
        if (pct >= lvl3Val) return 3;
        if (pct >= lvl2Val) return 2;
        if (pct >= lvl1Val) return 1;
        return 0;
      };

      const cieAttainmentLevel = checks.CIE ? getLevel(ciePercentage) : 0;
      const eseAttainmentLevel = checks.ESE ? getLevel(esePercentage) : 0;

      // Overall Average Achieved
      const totalObtained = (checks.CIE ? cieScore : 0) + (checks.ESE ? eseScore : 0);
      const totalMax = (checks.CIE ? currentCieMax : 0) + (checks.ESE ? currentEseMax : 0);
      const overallPercentage = totalMax > 0 ? (totalObtained / totalMax * 100) : 0;
      const overallAttainmentLevel = getLevel(overallPercentage);

      return {
        ...att,
        checks,
        iaScore,
        mseScore,
        cieScore,
        currentCieMax,
        ciePercentage,
        cieAttainmentLevel,
        eseScore,
        currentEseMax,
        esePercentage,
        eseAttainmentLevel,
        overallPercentage,
        overallAttainmentLevel,
        totalMax
      };
    });
  }, [courseState?.co_attainment, checkedComponents, lvl1Val, lvl2Val, lvl3Val]);

  useEffect(() => {
    if (courseState) {
      setCoAttainment(courseState.co_attainment || []);
      setPoAttainment(courseState.po_attainment || []);
      setStudents(courseState.students || []);
    }
  }, [courseState]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const response = await attainmentAPI.uploadMarks(file);
      if (response.data.success) {
        setCoAttainment(response.data.co_attainment);
        setPoAttainment(response.data.po_attainment);
        setStudents(response.data.students || []);
        setSuccess(true);
        refreshState();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload and parse student marks file.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleMarks = async () => {
    // If the user wants, they can download or trigger mock marks upload using sample_marks.csv path.
    setLoading(true);
    setSuccess(false);
    setError('');
    
    try {
      // Mock uploading sample CSV
      const mockFile = new File(["roll_no,name,CO1,CO2,CO3,CO4,CO5,CO6\nMAX,MAX MARKS,20,20,20,20,20,20\n101,Aarav Sharma,16,14,18,12,15,17\n102,Priya Patel,12,15,14,10,13,11\n103,Rohan Mehta,18,19,17,16,18,20\n104,Sneha Kulkarni,10,11,12,9,10,8\n105,Arjun Desai,15,16,14,18,17,15\n106,Kavya Joshi,19,18,20,17,19,18\n107,Vikram Nair,8,9,7,11,8,10\n108,Anjali Singh,14,13,15,12,14,16\n109,Rahul Gupta,11,10,9,13,12,11\n110,Pooja Reddy,17,16,18,15,16,17"], "sample_marks.csv", { type: 'text/csv' });
      const response = await attainmentAPI.uploadMarks(mockFile);
      if (response.data.success) {
        setCoAttainment(response.data.co_attainment);
        setPoAttainment(response.data.po_attainment);
        setStudents(response.data.students || []);
        setSuccess(true);
        refreshState();
      }
    } catch (err) {
      setError('Failed to load sample marks.');
    } finally {
      setLoading(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_no.toLowerCase().includes(search.toLowerCase())
  );

  // Paginated students
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getAttainmentLevelBadge = (level) => {
    if (level === 3) return <span className="badge-green">Level 3</span>;
    if (level === 2) return <span className="badge-blue">Level 2</span>;
    if (level === 1) return <span className="badge-orange">Level 1</span>;
    return <span className="badge-red">Not Achieved</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold font-sans tracking-tight">Student Marks & Attainment Engine</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload student marks sheets in CSV format to calculate outcomes attainment levels against target thresholds.
        </p>
      </div>

      {coAttainment.length === 0 ? (
        <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 mx-auto">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Upload Student Marks Sheet</h3>
            <p className="text-sm text-slate-400 mt-1">
              Select a CSV sheet containing columns like <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">roll_no</code>, <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">name</code>, and marks for <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">CO1</code> through <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">CO6</code>. 
              The first data row must specify the <strong className="text-blue-500">MAX marks</strong> for each outcome column (labeled with roll number <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">MAX</code>).
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 relative cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-xs font-semibold text-slate-650 dark:text-slate-300">Choose CSV File</span>
              </div>
            </div>
            
            <button
              onClick={handleLoadSampleMarks}
              className="py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
            >
              Demo: Load Sample Marks CSV
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-xs text-blue-500 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" />
              Calculating attainment levels...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5 text-xs text-rose-400 text-left">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Detailed Course Outcomes Attainment Matrix (Full Width) */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold text-sm uppercase tracking-wider">Course Outcomes Attainment Matrix</h4>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Interactive component weights & real-time recalculation</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse border border-slate-200 dark:border-slate-800">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 text-slate-455 font-bold uppercase tracking-wider">
                    <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle text-left min-w-[200px]">Course Outcome</th>
                    <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Revised Bloom's Level</th>
                    <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle min-w-[150px]">Assessment Components</th>
                    <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Target (%)</th>
                    <th colSpan={4} className="p-2 border border-slate-200 dark:border-slate-800 align-middle">CIE Assessment</th>
                    <th colSpan={2} className="p-2 border border-slate-200 dark:border-slate-800 align-middle">ESE Assessment</th>
                    <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Average Achieved</th>
                    <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Attainment Level</th>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-slate-455 font-bold uppercase tracking-wider">
                    <th className="p-2 border border-slate-200 dark:border-slate-800">IA (30)</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-800">MSE (20)</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-800">CIE (50)</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-800">CIE Att.</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-800">ESE (50)</th>
                    <th className="p-2 border border-slate-200 dark:border-slate-800">ESE Att.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {computedCoAttainments.map(co => {
                    const coInfo = coMap[co.co_id] || {};
                    return (
                      <tr key={co.co_id} className="hover:bg-slate-500/5 transition-colors">
                        <td className="p-3 border border-slate-200 dark:border-slate-800 text-left align-middle font-semibold">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{co.co_id}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-550 font-normal line-clamp-2 max-w-[200px]" title={coInfo.statement}>
                              {coInfo.statement || "No description available"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-medium text-slate-600 dark:text-slate-350">
                          {coInfo.blooms_level ? `L${coInfo.blooms_level} - ${coInfo.blooms_keyword}` : 'L3 - Apply'}
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <label className="flex items-center gap-0.5 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={co.checks.IA} 
                                onChange={() => handleCheckboxChange(co.co_id, 'IA')} 
                                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">IA</span>
                            </label>
                            <label className="flex items-center gap-0.5 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={co.checks.MSE} 
                                onChange={() => handleCheckboxChange(co.co_id, 'MSE')} 
                                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">MSE</span>
                            </label>
                            <label className="flex items-center gap-0.5 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={co.checks.CIE} 
                                onChange={() => handleCheckboxChange(co.co_id, 'CIE')} 
                                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">CIE</span>
                            </label>
                            <label className="flex items-center gap-0.5 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={co.checks.ESE} 
                                onChange={() => handleCheckboxChange(co.co_id, 'ESE')} 
                                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                              <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400">ESE</span>
                            </label>
                          </div>
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-semibold text-slate-700 dark:text-slate-300">
                          {lvl1Val}%
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-medium text-slate-650 dark:text-slate-350">
                          {co.checks.IA ? co.iaScore.toFixed(2) : '-'}
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-medium text-slate-650 dark:text-slate-350">
                          {co.checks.MSE ? co.mseScore.toFixed(2) : '-'}
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle">
                          {co.checks.CIE ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-850 dark:text-slate-200">{co.cieScore.toFixed(2)}</span>
                              <span className="text-[10px] text-slate-400">({co.ciePercentage.toFixed(1)}%)</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle">
                          {co.checks.CIE ? getAttainmentLevelBadge(co.cieAttainmentLevel) : '-'}
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle">
                          {co.checks.ESE ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-850 dark:text-slate-200">{co.eseScore.toFixed(2)}</span>
                              <span className="text-[10px] text-slate-400">({co.esePercentage.toFixed(1)}%)</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle">
                          {co.checks.ESE ? getAttainmentLevelBadge(co.eseAttainmentLevel) : '-'}
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-bold text-slate-800 dark:text-slate-100">
                          {co.overallPercentage.toFixed(2)}%
                        </td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle">
                          {getAttainmentLevelBadge(co.overallAttainmentLevel)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Attainment analysis processed successfully. Outward reports unlocked.</span>
              </div>
            </div>
          </div>

          {/* Student database list */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold text-sm uppercase tracking-wider">Student Roster & Marks</h4>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search roll or name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="block w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {students.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No student records loaded. Please try uploading the CSV again.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <th className="p-3">Roll No</th>
                        <th className="p-3">Student Name</th>
                        {computedCoAttainments.map(att => (
                          <th key={att.co_id} className="p-3 text-center">{att.co_id}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                      {paginatedStudents.map(student => (
                        <tr key={student.roll_no} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-350">{student.roll_no}</td>
                          <td className="p-3 font-medium text-slate-650 dark:text-slate-450">{student.name}</td>
                          {computedCoAttainments.map(att => (
                            <td key={att.co_id} className="p-3 text-center font-medium">
                              {student.marks[att.co_id] !== undefined ? student.marks[att.co_id] : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4 text-xs">
                    <span className="text-slate-455">
                      Page {currentPage} of {totalPages} ({filteredStudents.length} students)
                    </span>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
