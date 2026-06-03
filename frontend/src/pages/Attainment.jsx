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
  ChevronRight,
  ClipboardList
} from 'lucide-react';

export default function Attainment({ courseState, refreshState, activeSubjectId }) {
  const [coAttainment, setCoAttainment] = useState([]);
  const [poAttainment, setPoAttainment] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  
  const itemsPerPage = 8;

  const [checkedComponents, setCheckedComponents] = useState({});
  const [activeInputTab, setActiveInputTab] = useState('upload'); // 'upload' or 'manual'
  const [manualMarks, setManualMarks] = useState({});
  const [coTargets, setCoTargets] = useState({});

  useEffect(() => {
    if (courseState && courseState.subject_name === activeSubjectId && courseState.cos) {
      const initial = {};
      const initialTargets = {};
      courseState.cos.forEach(co => {
        const existing = (courseState.co_attainment || []).find(a => a.co_id === co.co_id);
        initial[co.co_id] = {
          ia_percentage: existing ? existing.ia_percentage : '',
          mse_percentage: existing ? existing.mse_percentage : '',
          ese_percentage: existing ? existing.ese_percentage : ''
        };
        initialTargets[co.co_id] = co.target_attainment || courseState.level1_threshold || 60;
      });
      setManualMarks(initial);
      setCoTargets(initialTargets);
    }
  }, [courseState, activeSubjectId]);

  const handleManualMarkChange = (coId, field, value) => {
    setManualMarks(prev => ({
      ...prev,
      [coId]: {
        ...prev[coId],
        [field]: value
      }
    }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const attainments = Object.entries(manualMarks).map(([co_id, values]) => ({
        co_id,
        ia_percentage: parseFloat(values.ia_percentage) || 0.0,
        mse_percentage: parseFloat(values.mse_percentage) || 0.0,
        ese_percentage: parseFloat(values.ese_percentage) || 0.0
      }));

      const response = await attainmentAPI.saveManualInput(attainments, coTargets);
      if (response.data.success) {
        setCoAttainment(response.data.co_attainment);
        setPoAttainment(response.data.po_attainment);
        setStudents([]);
        setSuccess(true);
        setIsFinalized(true);
        refreshState();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save manual marks attainment.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to clear the current attainment calculations and student marks? This will reset the attainment section.')) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await attainmentAPI.clearAttainment();
      setCoAttainment([]);
      setPoAttainment([]);
      setStudents([]);
      setIsFinalized(false);
      refreshState();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to clear attainment data.');
    } finally {
      setLoading(false);
    }
  };

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



  useEffect(() => {
    if (courseState && courseState.subject_name === activeSubjectId) {
      setCoAttainment(courseState.co_attainment || []);
      setPoAttainment(courseState.po_attainment || []);
      setStudents(courseState.students || []);

      const hasAllComponents = courseState.ia_students?.length > 0 &&
                               courseState.mse_students?.length > 0 &&
                               courseState.ese_students?.length > 0;
      if (courseState.co_attainment?.length > 0 && (hasAllComponents || (!courseState.ia_students?.length && !courseState.students?.length))) {
        setIsFinalized(true);
      } else {
        setIsFinalized(false);
      }
    }
  }, [courseState, activeSubjectId]);

  const handleSpecificFileUpload = async (e, assessmentType) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const response = await attainmentAPI.uploadMarks(file, coTargets, assessmentType);
      if (response.data.success) {
        setCoAttainment(response.data.co_attainment);
        setPoAttainment(response.data.po_attainment);
        setStudents(response.data.students || []);
        setSuccess(true);
        refreshState();
      }
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to upload and parse ${assessmentType} marks file.`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleMarks = async () => {
    setLoading(true);
    setSuccess(false);
    setError('');
    
    try {
      const iaCSV = "roll_no,name,CO1,CO2,CO3,CO4,CO5,CO6\nMAX,MAX MARKS,30,30,30,30,30,30\n101,Aarav Sharma,24,21,27,18,22,25\n102,Priya Patel,18,22,21,15,19,16\n103,Rohan Mehta,27,28,25,24,27,30\n104,Sneha Kulkarni,15,16,18,13,15,12\n105,Arjun Desai,22,24,21,27,25,22\n106,Kavya Joshi,28,27,30,25,28,27\n107,Vikram Nair,12,13,10,16,12,15\n108,Anjali Singh,21,19,22,18,21,24\n109,Rahul Gupta,16,15,13,19,18,16\n110,Pooja Reddy,25,24,27,22,24,25";
      const mseCSV = "roll_no,name,CO1,CO2,CO3,CO4,CO5,CO6\nMAX,MAX MARKS,20,20,20,20,20,20\n101,Aarav Sharma,16,14,18,12,15,17\n102,Priya Patel,12,15,14,10,13,11\n103,Rohan Mehta,18,19,17,16,18,20\n104,Sneha Kulkarni,10,11,12,9,10,8\n105,Arjun Desai,15,16,14,18,17,15\n106,Kavya Joshi,19,18,20,17,19,18\n107,Vikram Nair,8,9,7,11,8,10\n108,Anjali Singh,14,13,15,12,14,16\n109,Rahul Gupta,11,10,9,13,12,11\n110,Pooja Reddy,17,16,18,15,16,17";
      const eseCSV = "roll_no,name,CO1,CO2,CO3,CO4,CO5,CO6\nMAX,MAX MARKS,50,50,50,50,50,50\n101,Aarav Sharma,40,35,45,30,37,42\n102,Priya Patel,30,37,35,25,32,27\n103,Rohan Mehta,45,47,42,40,45,50\n104,Sneha Kulkarni,25,27,30,22,25,20\n105,Arjun Desai,37,40,35,45,42,37\n106,Kavya Joshi,47,45,50,42,47,45\n107,Vikram Nair,20,22,17,27,20,25\n108,Anjali Singh,35,32,37,30,35,40\n109,Rahul Gupta,27,25,22,32,30,27\n110,Pooja Reddy,42,40,45,37,40,42";

      const iaFile = new File([iaCSV], "demo_ia_marks.csv", { type: 'text/csv' });
      const mseFile = new File([mseCSV], "demo_mse_marks.csv", { type: 'text/csv' });
      const eseFile = new File([eseCSV], "demo_ese_marks.csv", { type: 'text/csv' });

      await attainmentAPI.uploadMarks(iaFile, coTargets, 'IA');
      await attainmentAPI.uploadMarks(mseFile, coTargets, 'MSE');
      const response = await attainmentAPI.uploadMarks(eseFile, coTargets, 'ESE');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight">Student Marks & Attainment Engine</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload student marks sheets in CSV format or input CO-wise averages to calculate outcomes attainment.
          </p>
        </div>
        {coAttainment.length > 0 && (
          <div className="flex gap-2 self-start sm:self-center">
            {isFinalized && (
              <button
                onClick={() => setIsFinalized(false)}
                disabled={loading}
                className="px-4 py-2 text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border border-purple-500/20 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer font-sans"
              >
                Edit Marks & Targets
              </button>
            )}
            <button
              onClick={handleReset}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer font-sans"
            >
              Reset & Clear Data
            </button>
          </div>
        )}
      </div>

      {!isFinalized && (
        <div className="glass-panel p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
          {/* Configure Course Outcome Attainment Targets */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50/80 to-slate-100/50 dark:from-slate-900/60 dark:to-slate-950/40 border border-slate-200/80 dark:border-slate-800/60 space-y-4 shadow-inner">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                <TrendingUp className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-250 font-sans tracking-tight">Configure Course Outcome Attainment Targets</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Set target attainment levels (%) for each Course Outcome. Level thresholds (L1, L2, L3) scale relative to these values.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {(courseState?.cos || []).map(co => (
                <div key={co.co_id} className="flex flex-col gap-1.5 p-3 rounded-xl bg-white dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-850 hover:border-purple-500/35 transition-all duration-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{co.co_id} Target</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={coTargets[co.co_id] !== undefined ? coTargets[co.co_id] : (courseState.level1_threshold || 60)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCoTargets(prev => ({
                          ...prev,
                          [co.co_id]: isNaN(val) ? '' : val
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-center"
                    />
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab selectors */}
          <div className="flex border-b border-slate-100 dark:border-slate-800/60 mb-2">
            <button
              onClick={() => setActiveInputTab('upload')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeInputTab === 'upload'
                  ? 'border-purple-500 text-purple-500'
                  : 'border-transparent text-slate-400 hover:text-slate-350'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Upload CSV File
            </button>
            <button
              onClick={() => setActiveInputTab('manual')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeInputTab === 'manual'
                  ? 'border-purple-500 text-purple-500'
                  : 'border-transparent text-slate-400 hover:text-slate-350'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Manual Entry Grid
            </button>
          </div>

          {activeInputTab === 'upload' ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Upload Component Student Marks</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Select a CSV marks sheet for each component. The columns must include <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-rose-500">roll_no</code>, <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-rose-500">name</code>, and CO marks (e.g. <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-rose-500">CO1</code> to <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-rose-500">CO6</code>). 
                  The first data row must specify the <strong className="text-blue-500">MAX marks</strong> for each outcome column (labeled with roll number <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-rose-500">MAX</code>).
                </p>
              </div>

              <div className="space-y-4">
                {/* IA Upload */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${courseState?.ia_students?.length > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-850 dark:text-slate-200 block">IA Marks (CO-wise)</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-550 block">
                        {courseState?.ia_students?.length > 0 ? `${courseState.ia_students.length} students loaded` : 'No file uploaded'}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleSpecificFileUpload(e, 'IA')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer">
                      Upload CSV
                    </button>
                  </div>
                </div>

                {/* MSE Upload */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${courseState?.mse_students?.length > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-850 dark:text-slate-200 block">MSE Marks (CO-wise)</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-550 block">
                        {courseState?.mse_students?.length > 0 ? `${courseState.mse_students.length} students loaded` : 'No file uploaded'}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleSpecificFileUpload(e, 'MSE')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer">
                      Upload CSV
                    </button>
                  </div>
                </div>

                {/* ESE Upload */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${courseState?.ese_students?.length > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-850 dark:text-slate-200 block">ESE Marks (CO-wise)</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-550 block">
                        {courseState?.ese_students?.length > 0 ? `${courseState.ese_students.length} students loaded` : 'No file uploaded'}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleSpecificFileUpload(e, 'ESE')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer">
                      Upload CSV
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleLoadSampleMarks}
                  className="w-full py-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-650 dark:text-slate-350 rounded-xl border border-slate-200 dark:border-slate-800/60 transition-colors cursor-pointer"
                >
                  Demo: Load Sample IA, MSE, and ESE Marks
                </button>
              </div>

              {/* Continue button after all three inputs are given */}
              {courseState?.ia_students?.length > 0 &&
               courseState?.mse_students?.length > 0 &&
               courseState?.ese_students?.length > 0 && (
                 <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                   <button
                     onClick={() => setIsFinalized(true)}
                     className="w-full py-3 bg-emerald-650 hover:bg-emerald-550 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer font-sans"
                   >
                     <CheckCircle2 className="w-4 h-4" />
                     Continue to Attainment Matrix
                   </button>
                 </div>
               )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Manual Outcomes Attainment Input</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Enter the Achievement % (percentage of students scoring ≥ target marks) for IA, MSE, and ESE components.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-455 font-bold uppercase tracking-wider">
                        <th className="p-3 text-left">CO ID</th>
                        <th className="p-3">IA Achievement (%)</th>
                        <th className="p-3">MSE Achievement (%)</th>
                        <th className="p-3">ESE Achievement (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {(courseState?.cos || []).map(co => (
                        <tr key={co.co_id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                          <td className="p-3 text-left font-bold text-slate-800 dark:text-slate-200">{co.co_id}</td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              required
                              placeholder="e.g. 80"
                              value={manualMarks[co.co_id]?.ia_percentage ?? ''}
                              onChange={(e) => handleManualMarkChange(co.co_id, 'ia_percentage', e.target.value)}
                              className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-lg text-center font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              required
                              placeholder="e.g. 70"
                              value={manualMarks[co.co_id]?.mse_percentage ?? ''}
                              onChange={(e) => handleManualMarkChange(co.co_id, 'mse_percentage', e.target.value)}
                              className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-lg text-center font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              required
                              placeholder="e.g. 70"
                              value={manualMarks[co.co_id]?.ese_percentage ?? ''}
                              onChange={(e) => handleManualMarkChange(co.co_id, 'ese_percentage', e.target.value)}
                              className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-lg text-center font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-purple-650 hover:bg-purple-550 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving and Recalculating...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Calculate & Save Attainment
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5 text-xs text-rose-400 text-left">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {isFinalized && coAttainment.length > 0 && (
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
                       {(() => {
              const iaWeight = courseState?.ia_max_marks ? (Object.values(courseState.ia_max_marks)[0] || 30) : 30;
              const mseWeight = courseState?.mse_max_marks ? (Object.values(courseState.mse_max_marks)[0] || 20) : 20;
              const cieWeight = iaWeight + mseWeight;
              const eseWeight = courseState?.ese_max_marks ? (Object.values(courseState.ese_max_marks)[0] || 50) : 50;
              const totalWeight = iaWeight + mseWeight + eseWeight;

              const activeCOs = coAttainment.filter(co => {
                const coInfo = coMap[co.co_id] || {};
                return coInfo.statement && coInfo.statement.trim() !== "";
              });

              const avgTarget = coAttainment.length > 0 
                ? Math.round(coAttainment.reduce((sum, co) => {
                    const coInfo = coMap[co.co_id] || {};
                    return sum + (coInfo.statement && coInfo.statement.trim() !== "" ? (coInfo.target_attainment !== undefined ? coInfo.target_attainment : lvl1Val) : 0);
                  }, 0) / coAttainment.length)
                : 0;

              const iaCOs = activeCOs.filter(co => co.ia_percentage !== null && co.ia_percentage !== undefined);
              const avgIA = iaCOs.length > 0 ? (iaCOs.reduce((sum, co) => sum + co.ia_percentage, 0) / iaCOs.length).toFixed(2) : '-';

              const mseCOs = activeCOs.filter(co => co.mse_percentage !== null && co.mse_percentage !== undefined);
              const avgMSE = mseCOs.length > 0 ? (mseCOs.reduce((sum, co) => sum + co.mse_percentage, 0) / mseCOs.length).toFixed(2) : '-';

              const cieCOs = activeCOs.filter(co => co.cie_percentage !== null && co.cie_percentage !== undefined);
              const avgCIE = cieCOs.length > 0 ? (cieCOs.reduce((sum, co) => sum + co.cie_percentage, 0) / cieCOs.length).toFixed(2) : '-';

              const cieLvlCOs = activeCOs.filter(co => co.cie_level !== null && co.cie_level !== undefined);
              const avgCIELevel = cieLvlCOs.length > 0 ? (cieLvlCOs.reduce((sum, co) => sum + co.cie_level, 0) / cieLvlCOs.length).toFixed(2) : '-';

              const eseCOs = activeCOs.filter(co => co.ese_percentage !== null && co.ese_percentage !== undefined);
              const avgESE = eseCOs.length > 0 ? (eseCOs.reduce((sum, co) => sum + co.ese_percentage, 0) / eseCOs.length).toFixed(2) : '-';

              const eseLvlCOs = activeCOs.filter(co => co.ese_level !== null && co.ese_level !== undefined);
              const avgESELevel = eseLvlCOs.length > 0 ? (eseLvlCOs.reduce((sum, co) => sum + co.ese_level, 0) / eseLvlCOs.length).toFixed(2) : '-';

              const avgAchCOs = activeCOs.filter(co => co.avg_percentage !== null && co.avg_percentage !== undefined);
              const avgAvgAchieved = avgAchCOs.length > 0 ? (avgAchCOs.reduce((sum, co) => sum + co.avg_percentage, 0) / avgAchCOs.length).toFixed(2) : '-';

              const finalCOs = activeCOs.filter(co => co.achieved_level !== null && co.achieved_level !== undefined);
              const avgFinalAttainment = finalCOs.length > 0 ? (finalCOs.reduce((sum, co) => sum + co.achieved_level, 0) / finalCOs.length).toFixed(2) : '-';

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border-collapse border border-slate-200 dark:border-slate-800">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 text-slate-455 font-bold uppercase tracking-wider">
                        <th rowSpan={3} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Sr. NO.</th>
                        <th rowSpan={3} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">CO</th>
                        <th rowSpan={3} className="p-3 border border-slate-200 dark:border-slate-800 align-middle text-left min-w-[200px]">Course Outcomes</th>
                        <th rowSpan={3} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Revised Blooms Level</th>
                        <th rowSpan={3} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Target for COs %</th>
                        <th colSpan={4} className="p-2 border border-slate-200 dark:border-slate-800 align-middle">CIE Assessment</th>
                        <th colSpan={2} className="p-2 border border-slate-200 dark:border-slate-800 align-middle">ESE Assessment</th>
                        <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Average Achieved</th>
                        <th rowSpan={3} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Attainment Level</th>
                      </tr>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-slate-455 font-bold uppercase tracking-wider">
                        <th className="p-2 border border-slate-200 dark:border-slate-800">IA</th>
                        <th className="p-2 border border-slate-200 dark:border-slate-800">MSE</th>
                        <th className="p-2 border border-slate-200 dark:border-slate-800">Total</th>
                        <th className="p-2 border border-slate-200 dark:border-slate-800 text-[10px]">Attainment Level</th>
                        <th className="p-2 border border-slate-200 dark:border-slate-800">ESE</th>
                        <th className="p-2 border border-slate-200 dark:border-slate-800 text-[10px]">Attainment Level</th>
                      </tr>
                      <tr className="bg-slate-100/50 dark:bg-slate-900/50 text-slate-500 font-bold">
                        <th className="p-1.5 border border-slate-200 dark:border-slate-800">{iaWeight}</th>
                        <th className="p-1.5 border border-slate-200 dark:border-slate-800">{mseWeight}</th>
                        <th className="p-1.5 border border-slate-200 dark:border-slate-800">{cieWeight}</th>
                        <th className="p-1.5 border border-slate-200 dark:border-slate-800"></th>
                        <th className="p-1.5 border border-slate-200 dark:border-slate-800">{eseWeight}</th>
                        <th className="p-1.5 border border-slate-200 dark:border-slate-800"></th>
                        <th className="p-1.5 border border-slate-200 dark:border-slate-800">{totalWeight}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {coAttainment.map((co, index) => {
                        const coInfo = coMap[co.co_id] || {};
                        const isActive = coInfo.statement && coInfo.statement.trim() !== "";
                        return (
                          <tr key={co.co_id} className="hover:bg-slate-500/5 transition-colors">
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-semibold text-slate-700 dark:text-slate-300">
                              {index + 1}
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-bold text-slate-800 dark:text-slate-200">
                              {co.co_id}
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-800 text-left align-middle font-medium text-slate-700 dark:text-slate-350 max-w-[300px] whitespace-normal">
                              {isActive ? coInfo.statement : ''}
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-medium text-slate-660 dark:text-slate-350">
                              {isActive ? (coInfo.blooms_level ? `Level ${coInfo.blooms_level}` : 'Level 3') : '0'}
                            </td>
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-semibold text-slate-700 dark:text-slate-300">
                              {isActive ? (coInfo.target_attainment !== undefined ? coInfo.target_attainment : lvl1Val) : '0'}
                            </td>
                            {/* IA */}
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-medium text-slate-650 dark:text-slate-350">
                              {isActive && co.ia_percentage !== null && co.ia_percentage !== undefined ? `${co.ia_percentage.toFixed(2)}` : ''}
                            </td>
                            {/* MSE */}
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-medium text-slate-650 dark:text-slate-350">
                              {isActive && co.mse_percentage !== null && co.mse_percentage !== undefined ? `${co.mse_percentage.toFixed(2)}` : ''}
                            </td>
                            {/* CIE TOTAL */}
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-semibold text-slate-850 dark:text-slate-200">
                              {isActive && co.cie_percentage !== null && co.cie_percentage !== undefined ? `${co.cie_percentage.toFixed(2)}` : ''}
                            </td>
                            {/* CIE LEVEL */}
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-bold text-slate-800 dark:text-slate-100">
                              {isActive && co.cie_level !== null && co.cie_level !== undefined ? `${co.cie_level.toFixed(2)}` : ''}
                            </td>
                            {/* ESE */}
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-medium text-slate-650 dark:text-slate-350">
                              {isActive && co.ese_percentage !== null && co.ese_percentage !== undefined ? `${co.ese_percentage.toFixed(2)}` : ''}
                            </td>
                            {/* ESE LEVEL */}
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-bold text-slate-800 dark:text-slate-100">
                              {isActive && co.ese_level !== null && co.ese_level !== undefined ? `${co.ese_level.toFixed(2)}` : ''}
                            </td>
                            {/* Average Achieved */}
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-bold text-slate-850 dark:text-slate-100">
                              {isActive && co.avg_percentage !== null && co.avg_percentage !== undefined ? `${co.avg_percentage.toFixed(2)}` : ''}
                            </td>
                            {/* Final Attainment Level */}
                            <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-bold text-slate-850 dark:text-slate-100">
                              {isActive && co.achieved_level !== null && co.achieved_level !== undefined ? `${co.achieved_level.toFixed(2)}` : ''}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Average Footer Row */}
                      <tr className="bg-slate-100 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-100">
                        <td colSpan={4} className="p-3 border border-slate-200 dark:border-slate-800 text-center">Average</td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800">{avgTarget}</td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800">{avgIA}</td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800">{avgMSE}</td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800">{avgCIE}</td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800">{avgCIELevel}</td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800">{avgESE}</td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800">{avgESELevel}</td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800">{avgAvgAchieved}</td>
                        <td className="p-3 border border-slate-200 dark:border-slate-800">{avgFinalAttainment}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
            
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
                No individual student records loaded (Calculated via manual averages entry).
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <th className="p-3">Roll No</th>
                        <th className="p-3">Student Name</th>
                        {coAttainment.map(att => (
                          <th key={att.co_id} className="p-3 text-center">{att.co_id}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                      {paginatedStudents.map(student => (
                        <tr key={student.roll_no} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-350">{student.roll_no}</td>
                          <td className="p-3 font-medium text-slate-650 dark:text-slate-455">{student.name}</td>
                          {coAttainment.map(att => (
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
