import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { facultyAPI } from '../../api';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Lock, 
  Unlock, 
  Loader2, 
  Check, 
  Settings,
  HelpCircle,
  Database
} from 'lucide-react';

export default function MarksUpload() {
  const query = new URLSearchParams(useLocation().search);
  const initialType = query.get('type') || 'IA';

  const [subjectsList, setSubjectsList] = useState([]);
  const [activeSubject, setActiveSubject] = useState(localStorage.getItem('active_subject_id') || '');
  const [activeTab, setActiveTab] = useState(initialType); // IA, MSE, ESE
  const [uploadMethod, setUploadMethod] = useState('file'); // file, manual
  
  // Lock state
  const [lockStatus, setLockStatus] = useState({ locked: false });
  const [checkingLock, setCheckingLock] = useState(false);

  // Stored subject state
  const [storedState, setStoredState] = useState(null);
  const [loadingStored, setLoadingStored] = useState(false);

  // File state
  const [file, setFile] = useState(null);

  // Manual entry state
  const [manualRows, setManualRows] = useState([
    { roll_no: '', name: '', marks: {} }
  ]);
  const [coColumns, setCoColumns] = useState(['CO1']);
  const [manualMaxMarks, setManualMaxMarks] = useState({ CO1: 10 });

  // Preview & Validate state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Background processing state
  const [saving, setSaving] = useState(false);
  const [jobStatus, setJobStatus] = useState(null); // { status: 'idle' }
  const sseRef = useRef(null);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await facultyAPI.getSubjects();
        setSubjectsList(res.data);
        if (!activeSubject && res.data.length > 0) {
          setActiveSubject(res.data[0].subject_name);
          localStorage.setItem('active_subject_id', res.data[0].subject_name);
        }
      } catch (err) {
        console.error('Failed to fetch subjects', err);
      }
    };
    fetchSubjects();
  }, []);

  const loadStoredState = async () => {
    if (!activeSubject) return;
    setLoadingStored(true);
    try {
      const res = await facultyAPI.getSubjectState(activeSubject);
      setStoredState(res.data);
    } catch (err) {
      console.error('Failed to fetch stored subject state', err);
    } finally {
      setLoadingStored(false);
    }
  };

  // Fetch Lock status and stored subject state when subject changes
  useEffect(() => {
    if (!activeSubject) return;
    
    const checkLock = async () => {
      setCheckingLock(true);
      try {
        const res = await facultyAPI.getUploadLockStatus(activeSubject);
        setLockStatus(res.data);
      } catch (err) {
        console.error('Failed to get lock status', err);
      } finally {
        setCheckingLock(false);
      }
    };

    checkLock();
    loadStoredState();
    // Poll lock status every 30 seconds
    const interval = setInterval(checkLock, 30000);
    return () => clearInterval(interval);
  }, [activeSubject]);

  // Reset file and validation states when subject, tab, or method changes
  useEffect(() => {
    setFile(null);
    setValidationResult(null);
    setValidationError('');
  }, [activeTab, activeSubject, uploadMethod]);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);

  const handleSubjectChange = (e) => {
    const sName = e.target.value;
    setActiveSubject(sName);
    localStorage.setItem('active_subject_id', sName);
    setValidationResult(null);
    setValidationError('');
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setValidationResult(null);
    setValidationError('');
  };

  // Manual Row Handlers
  const handleAddManualRow = () => {
    setManualRows([...manualRows, { roll_no: '', name: '', marks: {} }]);
  };

  const handleRemoveManualRow = (index) => {
    const rows = [...manualRows];
    rows.splice(index, 1);
    setManualRows(rows);
  };

  const handleManualRowChange = (index, field, value) => {
    const rows = [...manualRows];
    rows[index][field] = value;
    setManualRows(rows);
  };

  const handleManualMarkChange = (index, co, value) => {
    const rows = [...manualRows];
    rows[index].marks[co] = value;
    setManualRows(rows);
  };

  const handleAddCoColumn = () => {
    const num = coColumns.length + 1;
    const nextCo = `CO${num}`;
    setCoColumns([...coColumns, nextCo]);
    setManualMaxMarks({ ...manualMaxMarks, [nextCo]: 10 });
  };

  const handleMaxMarkChange = (co, val) => {
    setManualMaxMarks({ ...manualMaxMarks, [co]: parseFloat(val) || 0 });
  };

  // Preview & Validate Flow
  const handleValidate = async () => {
    if (!activeSubject) return;
    setValidating(true);
    setValidationError('');
    setValidationResult(null);

    try {
      if (uploadMethod === 'file') {
        if (!file) {
          setValidationError('Please select a file to upload.');
          setValidating(false);
          return;
        }

        const formData = new FormData();
        formData.append('marks_file', file);
        formData.append('assessment_type', activeTab);
        formData.append('subject_name', activeSubject);

        const res = await facultyAPI.validateUploadFile(formData);
        setValidationResult(res.data);
      } else {
        // Validate manual
        const payload = {
          subject_name: activeSubject,
          assessment_type: activeTab,
          students: manualRows.map(r => ({
            roll_no: r.roll_no,
            name: r.name || 'Unknown',
            marks: r.marks
          })),
          max_marks: manualMaxMarks
        };

        const res = await facultyAPI.validateUploadManual(payload);
        setValidationResult({
          success: res.data.success,
          errors: res.data.errors,
          warnings: res.data.warnings,
          students: payload.students,
          max_marks: payload.max_marks
        });
      }
    } catch (err) {
      console.error(err);
      setValidationError(err.response?.data?.detail || 'Validation failed. Check file format or lock state.');
    } finally {
      setValidating(false);
    }
  };

  // Save & Recalculate (Background Task)
  const handleSave = async () => {
    if (!validationResult || !validationResult.success) return;
    setSaving(true);

    try {
      const payload = {
        subject_name: activeSubject,
        assessment_type: activeTab,
        students: validationResult.students,
        max_marks: validationResult.max_marks
      };

      const res = await facultyAPI.saveUpload(payload);
      
      if (res.data.status === 'processing') {
        // Open SSE status stream to monitor calculations
        startSSE();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to save marks.');
      setSaving(false);
    }
  };

  const startSSE = () => {
    if (sseRef.current) {
      sseRef.current.close();
    }

    const token = localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    
    // Connect to native EventSource using query token
    const sse = new EventSource(`${apiBase}/faculty/upload/status-stream/${activeSubject}?token=${token}`);
    sseRef.current = sse;

    sse.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setJobStatus(data);
      
      if (data.status === 'completed') {
        sse.close();
        setSaving(false);
        setValidationResult(null);
        setFile(null);
        loadStoredState();
        alert('Attainment calculations completed and saved successfully.');
      } else if (data.status === 'failed') {
        sse.close();
        setSaving(false);
        alert(`Calculations failed: ${data.error}`);
      }
    };

    sse.onerror = () => {
      sse.close();
      setSaving(false);
      alert('EventSource stream disconnected.');
    };
  };

  const getStoredPhaseData = () => {
    if (!storedState) return { students: [], max_marks: {} };
    const atype = activeTab.toUpperCase();
    if (atype === 'IA') {
      return { students: storedState.ia_students || [], max_marks: storedState.ia_max_marks || {} };
    } else if (atype === 'MSE') {
      return { students: storedState.mse_students || [], max_marks: storedState.mse_max_marks || {} };
    } else if (atype === 'ESE') {
      return { students: storedState.ese_students || [], max_marks: storedState.ese_max_marks || {} };
    }
    return { students: [], max_marks: {} };
  };

  const storedData = getStoredPhaseData();
  const hasStoredData = storedData.students && storedData.students.length > 0;

  const isLockedByOther = lockStatus.locked && lockStatus.locked_by_id !== parseInt(localStorage.getItem('user_id'));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Marks Upload Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose a subject, pick the assessment type, upload a file or manually enter student marks, and process OBE metrics.
          </p>
        </div>

        {/* Lock Info Box */}
        <div className="flex items-center gap-2 text-xs">
          {lockStatus.locked ? (
            <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 border ${
              isLockedByOther 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              <Lock className="w-3.5 h-3.5" />
              <span>
                {isLockedByOther 
                  ? `Locked by ${lockStatus.locked_by_name}` 
                  : 'Locked by you (Editing)'}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Unlock className="w-3.5 h-3.5" />
              <span>Editing available</span>
            </div>
          )}
        </div>
      </div>

      {/* Lock Block Banner */}
      {isLockedByOther && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2.5">
          <Lock className="w-4.5 h-4.5 shrink-0" />
          <span>Editing by another faculty ({lockStatus.locked_by_name}). Upload operations are disabled.</span>
        </div>
      )}

      {/* Background Processing Progress Bar */}
      {saving && jobStatus && (
        <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Attainment calculation is running...
            </span>
            <span>{jobStatus.progress}%</span>
          </div>
          <div className="w-full bg-blue-500/20 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${jobStatus.progress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500">
            Background job status: <span className="font-bold uppercase">{jobStatus.status}</span>. You do not need to wait; operations run in parallel.
          </p>
        </div>
      )}

      {/* Core Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Input configuration panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-5">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Select Subject</label>
              <select
                value={activeSubject}
                onChange={handleSubjectChange}
                disabled={isLockedByOther || saving}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-semibold outline-none"
              >
                {subjectsList.map((sub) => (
                  <option key={sub.id} value={sub.subject_name}>{sub.subject_name}</option>
                ))}
              </select>
            </div>

            {/* Assessment Type Tab Selectors */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assessment Phase</label>
              <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-850 p-1 rounded-lg">
                {['IA', 'MSE', 'ESE'].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setActiveTab(t);
                      setValidationResult(null);
                    }}
                    disabled={isLockedByOther || saving}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                      activeTab === t 
                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs' 
                        : 'text-slate-450 hover:text-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Method selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Input Method</label>
              <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-850 p-1 rounded-lg">
                <button
                  onClick={() => setUploadMethod('file')}
                  disabled={isLockedByOther || saving}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                    uploadMethod === 'file' 
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs' 
                      : 'text-slate-450 hover:text-slate-800'
                  }`}
                >
                  Excel/CSV Upload
                </button>
                <button
                  onClick={() => setUploadMethod('manual')}
                  disabled={isLockedByOther || saving}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                    uploadMethod === 'manual' 
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs' 
                      : 'text-slate-450 hover:text-slate-800'
                  }`}
                >
                  Manual Entry
                </button>
              </div>
            </div>

            {/* Dynamic Inputs (File or Manual) */}
            {uploadMethod === 'file' ? (
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Select Marks Sheet</p>
                  <p className="text-[10px] text-slate-400">CSV or Excel format with a 'MAX' row.</p>
                </div>
                <input 
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={isLockedByOther || saving}
                  className="hidden"
                  id="marks-file-input"
                  key={`${activeSubject}-${activeTab}-${uploadMethod}`}
                />
                <label 
                  htmlFor="marks-file-input"
                  className="inline-block px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {file ? file.name : 'Choose File'}
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CO Columns Max Marks</span>
                  <button 
                    onClick={handleAddCoColumn}
                    disabled={isLockedByOther || saving}
                    className="text-[10px] text-blue-600 font-bold underline"
                  >
                    + Add CO
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {coColumns.map((co) => (
                    <div key={co} className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1 text-center bg-slate-50 dark:bg-slate-850">
                      <span className="text-[9px] font-bold block text-slate-450">{co}</span>
                      <input
                        type="number"
                        min="1"
                        value={manualMaxMarks[co] || 10}
                        onChange={(e) => handleMaxMarkChange(co, e.target.value)}
                        disabled={isLockedByOther || saving}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1 text-[11px] font-bold text-center outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stored Marks Status Indicator */}
            {hasStoredData && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 rounded-lg text-xs flex flex-col gap-1 text-left">
                <span className="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-450">
                  <CheckCircle2 className="w-4 h-4" />
                  Marks Already Uploaded
                </span>
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  {storedData.students.length} students loaded. Uploading a new file will overwrite existing marks.
                </span>
              </div>
            )}

            {/* Error notifications */}
            {validationError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs leading-relaxed">
                {validationError}
              </div>
            )}

            {/* Validate Trigger */}
            <button
              onClick={handleValidate}
              disabled={isLockedByOther || validating || saving}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm shadow-blue-500/10 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                'Preview & Validate Marks'
              )}
            </button>
          </div>
        </div>

        {/* Right 2 columns: Validation Report and Data Roster Preview */}
        <div className="lg:col-span-2 space-y-6">
          {validationResult ? (
            <div className="space-y-6">
              {/* Validation Banner Report */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Validation Audit Log
                  </h4>
                  {validationResult.success ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Passed Validation
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" />
                      Failed Validation
                    </span>
                  )}
                </div>

                {/* Errors display */}
                {validationResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />
                      Errors Detected ({validationResult.errors.length})
                    </p>
                    <div className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-lg text-xs space-y-1.5">
                      {validationResult.errors.map((err, i) => (
                        <div key={i} className="text-rose-700 dark:text-rose-400 flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                          <p>{err}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings display */}
                {validationResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Warnings & Roster Notices ({validationResult.warnings.length})
                    </p>
                    <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs space-y-1.5">
                      {validationResult.warnings.map((warn, i) => (
                        <div key={i} className="text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                          <span className="mt-1 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                          <p>{warn}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    <span>All records successfully parsed and verified! No formatting or mark errors found.</span>
                  </div>
                )}

                {/* Save Marks Button */}
                {validationResult.success && (
                  <button
                    onClick={handleSave}
                    disabled={isLockedByOther || saving}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm shadow-emerald-500/10"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Initiating Attainment Recalculation...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        Save Marks & Calculate Attainment
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Roster Data Preview Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Roster Data Import Preview
                </h4>
                
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-500/5 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Roll Number</th>
                        <th className="py-2.5">Name</th>
                        {Object.keys(validationResult.max_marks).map((co) => (
                          <th key={co} className="py-2.5 text-center">
                            {co}
                            <span className="block text-[8px] text-slate-400 font-semibold lowercase">max: {validationResult.max_marks[co]}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 font-semibold text-slate-650 dark:text-slate-350">
                      {validationResult.students.map((student, i) => (
                        <tr key={i} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{student.roll_no}</td>
                          <td className="py-2.5 truncate max-w-[150px]">{student.name}</td>
                          {Object.keys(validationResult.max_marks).map((co) => (
                            <td key={co} className="py-2.5 text-center font-bold text-slate-800 dark:text-white">
                              {student.marks[co] !== undefined ? student.marks[co] : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state for preview or Manual Entry Inputs */
            uploadMethod === 'manual' ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Manual Student Entry Roster
                  </h4>
                  <button
                    onClick={handleAddManualRow}
                    disabled={isLockedByOther || saving}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-350 transition-colors"
                  >
                    + Add Student Row
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-500/5 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4 w-32">Roll Number</th>
                        <th className="py-2.5 w-44">Name</th>
                        {coColumns.map((co) => (
                          <th key={co} className="py-2.5 text-center w-24">{co}</th>
                        ))}
                        <th className="py-2.5 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualRows.map((row, index) => (
                        <tr key={index} className="border-b border-slate-100 dark:border-slate-850/60 hover:bg-slate-500/5 transition-colors">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              placeholder="e.g. 21CO103"
                              value={row.roll_no}
                              onChange={(e) => handleManualRowChange(index, 'roll_no', e.target.value)}
                              disabled={isLockedByOther || saving}
                              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded px-2 py-1 outline-none text-xs font-semibold"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              required
                              placeholder="Student Name"
                              value={row.name}
                              onChange={(e) => handleManualRowChange(index, 'name', e.target.value)}
                              disabled={isLockedByOther || saving}
                              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded px-2 py-1 outline-none text-xs font-semibold"
                            />
                          </td>
                          {coColumns.map((co) => (
                            <td key={co} className="py-2 px-3">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max={manualMaxMarks[co]}
                                placeholder="Marks"
                                value={row.marks[co] !== undefined ? row.marks[co] : ''}
                                onChange={(e) => handleManualMarkChange(index, co, e.target.value)}
                                disabled={isLockedByOther || saving}
                                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded px-2 py-1 text-center outline-none text-xs font-semibold"
                              />
                            </td>
                          ))}
                          <td className="py-2 text-center">
                            <button
                              onClick={() => handleRemoveManualRow(index)}
                              disabled={isLockedByOther || saving || manualRows.length === 1}
                              className="text-slate-400 hover:text-rose-500 text-xs font-bold disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : hasStoredData ? (
              /* Current Stored Roster Preview */
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Current Stored Roster ({activeTab})
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">These marks are currently saved and active in the database.</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Stored in System
                  </span>
                </div>
                
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-500/5 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Roll Number</th>
                        <th className="py-2.5">Name</th>
                        {Object.keys(storedData.max_marks).map((co) => (
                          <th key={co} className="py-2.5 text-center">
                            {co}
                            <span className="block text-[8px] text-slate-400 font-semibold lowercase">max: {storedData.max_marks[co]}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 font-semibold text-slate-650 dark:text-slate-350">
                      {storedData.students.map((student, i) => (
                        <tr key={i} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{student.roll_no}</td>
                          <td className="py-2.5 truncate max-w-[150px]">{student.name}</td>
                          {Object.keys(storedData.max_marks).map((co) => (
                            <td key={co} className="py-2.5 text-center font-bold text-slate-800 dark:text-white">
                              {student.marks[co] !== undefined ? student.marks[co] : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl text-center text-slate-555 text-xs py-24 space-y-4">
                <HelpCircle className="w-10 h-10 text-slate-350 mx-auto" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Roster Validation Preview</p>
                  <p className="text-slate-400">Configure parameters on the left and click 'Preview & Validate Marks' to inspect the dataset before saving.</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
