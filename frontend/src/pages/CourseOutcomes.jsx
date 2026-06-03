import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Save, 
  RefreshCw, 
  Edit3, 
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  TrendingUp,
  Upload,
  Plus,
  Trash2,
  Check,
  Loader2,
  ChevronRight,
  FileText,
  Database,
  BookOpen,
  Clock,
  X
} from 'lucide-react';

export default function CourseOutcomes({ courseState, refreshState, activeSubjectId }) {
  // Start at Phase 1 (semester + subject selection)
  const [currentStep, setCurrentStep] = useState(1);
  const [curriculum, setCurriculum] = useState(null);
  
  // Phase 1 States — year pre-filled from Setup page via localStorage
  const [academicYear, setAcademicYear] = useState(
    () => localStorage.getItem('selected_year') || courseState?.year || 'SY'
  );
  const defaultSem = (yr) => {
    if (yr === 'FY') return 'Semester 1';
    if (yr === 'SY') return 'Semester 3';
    if (yr === 'TY') return 'Semester 5';
    return 'Semester 7'; // LY
  };
  const [semester, setSemester] = useState(() => defaultSem(localStorage.getItem('selected_year') || courseState?.year || 'SY'));
  const [subjectName, setSubjectName] = useState('');
  
  // Phase 2 States
  const [descOption, setDescOption] = useState('typed');
  const [typedDesc, setTypedDesc] = useState('');
  const [descFile, setDescFile] = useState(null);
  const [parsedContext, setParsedContext] = useState(null);
  
  // Phase 3 States
  const [prevOption, setPrevOption] = useState('skip');
  const [prevRawText, setPrevRawText] = useState('');
  const [prevFile, setPrevFile] = useState(null);
  const [parsedPrevCos, setParsedPrevCos] = useState([]);
  
  // Phase 4 States
  const [perfFiles, setPerfFiles] = useState([]);
  const [perfTypes, setPerfTypes] = useState([]);
  const [attainmentAnalysis, setAttainmentAnalysis] = useState(null);
  const [perfValidationErrors, setPerfValidationErrors] = useState([]);
  
  // Phase 5 States
  const [numCos, setNumCos] = useState(6);
  const [refineFeedback, setRefineFeedback] = useState('');
  const [newGeneratedCos, setNewGeneratedCos] = useState([]);
  const [validationReport, setValidationReport] = useState(null);
  const [agentProgress, setAgentProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  
  // Phase 6 States
  const [finalCos, setFinalCos] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingLevel, setEditingLevel] = useState(3);
  const [editingKeyword, setEditingKeyword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [stateInitialized, setStateInitialized] = useState(false);
  const [phase1Done, setPhase1Done] = useState(false);
  const lastActiveSubjectIdRef = useRef(activeSubjectId);

  // Fetch Curriculum list on mount
  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const response = await api.get('/curriculum');
        setCurriculum(response.data);
      } catch (err) {
        console.error("Failed to load curriculum catalog", err);
      }
    };
    fetchCurriculum();
  }, []);

  // Sync state when courseState loads or changes
  useEffect(() => {
    // If the subject ID changed, reset the local wizard state first
    if (lastActiveSubjectIdRef.current !== activeSubjectId) {
      lastActiveSubjectIdRef.current = activeSubjectId;
      setStateInitialized(false);
      setShowWizard(false);
      setCurrentStep(1);
      setFinalCos([]);
      setNewGeneratedCos([]);
      setValidationReport(null);
      setParsedContext(null);
      setParsedPrevCos([]);
      setAttainmentAnalysis(null);
      setPerfFiles([]);
      setPerfTypes([]);
      setPerfValidationErrors([]);
      return;
    }

    if (courseState && courseState.subject_name === activeSubjectId) {
      if (courseState.subject_name) setSubjectName(courseState.subject_name);
      if (courseState.year) {
        // Only override year if no Setup selection stored
        if (!localStorage.getItem('selected_year')) {
          setAcademicYear(courseState.year);
          setSemester(defaultSem(courseState.year));
        }
      }
      if (courseState.semester) setSemester(courseState.semester);
      if (courseState.course_context_data) setParsedContext(courseState.course_context_data);
      if (courseState.previous_cos) setParsedPrevCos(courseState.previous_cos);
      if (courseState.previous_attainment_analysis) setAttainmentAnalysis(courseState.previous_attainment_analysis);
      if (courseState.new_generated_cos) setNewGeneratedCos(courseState.new_generated_cos);
      
      if (courseState.cos && courseState.cos.length > 0) {
        setFinalCos(courseState.cos);
      }

      if (!stateInitialized) {
        if (courseState.cos && courseState.cos.length > 0) {
          // COs already done — show locked view
          setShowWizard(false);
          setStateInitialized(true);
        } else {
          // Setup page already handled academic-setup (Phase 1), so start at Step 1 (Course Configured)
          setShowWizard(true);
          setCurrentStep(1);
          setStateInitialized(true);
        }
      }
    } else if (!activeSubjectId) {
      // No active course — start at Step 1 (Setup page must run first)
      if (!stateInitialized) {
        setShowWizard(true);
        setCurrentStep(1);
        setStateInitialized(true);
      }
    }
  }, [courseState, stateInitialized, activeSubjectId]);

  // When year changes, reset semester to the first valid one and clear subject
  const handleYearChange = (yearVal) => {
    setAcademicYear(yearVal);
    setSemester(defaultSem(yearVal));
    setSubjectName('');
    localStorage.setItem('selected_year', yearVal);
  };

  const getAvailableSubjects = () => {
    if (!curriculum) return [];
    const deptData = curriculum['CSE (Data Science)'] || {};
    const yearData = deptData[academicYear] || {};
    return yearData[semester] || [];
  };

  const getYearLabel = (y) => {
    const map = { FY: 'First Year (FY)', SY: 'Second Year (SY)', TY: 'Third Year (TY)', LY: 'Final Year (LY)' };
    return map[y] || y;
  };

  // Phase 1: Academic Setup — called after semester + subject are selected
  const handleAcademicSetup = async () => {
    if (!subjectName) {
      setError('Please select a subject.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/workflow/academic-setup', {
        department: localStorage.getItem('department') || 'Department of Computer Engineering',
        vision_mission: localStorage.getItem('vision_mission') || '',
        year: academicYear,
        semester,
        subject_name: subjectName
      });
      // Clear the Setup-page year so it doesn't override future visits
      localStorage.removeItem('selected_year');
      setSuccess('Subject configured successfully!');
      setTimeout(() => setSuccess(''), 2000);
      refreshState();
      setCurrentStep(2);
    } catch (err) {
      setError("Failed to configure academic setup.");
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: Course Input
  const handleCourseInputSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('option', descOption);
      if (descOption === 'typed') {
        formData.append('text', typedDesc);
      } else if (descFile) {
        formData.append('file', descFile);
      } else {
        throw new Error("Please upload a file or type a description.");
      }

      const res = await api.post('/workflow/course-input', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setParsedContext(res.data.context_data);
      refreshState();
      setCurrentStep(3);
    } catch (err) {
      setError(err.message || "Failed to process course description.");
    } finally {
      setLoading(false);
    }
  };

  // Phase 3: Previous COs
  const handlePreviousCosSubmit = async (e) => {
    e.preventDefault();
    if (prevOption === 'skip') {
      setCurrentStep(4);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('option', prevOption);
      if (prevOption === 'paste') {
        formData.append('text', prevRawText);
      } else if (prevFile) {
        formData.append('file', prevFile);
      } else {
        throw new Error("Please upload a file or paste COs.");
      }

      const res = await api.post('/workflow/previous-cos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setParsedPrevCos(res.data.previous_cos);
      refreshState();
      setCurrentStep(4);
    } catch (err) {
      setError(err.message || "Failed to parse previous COs.");
    } finally {
      setLoading(false);
    }
  };

  // Phase 4: Previous Year Assessments (Optional)
  const handleAddAssessmentFile = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setPerfFiles([...perfFiles, file]);
      setPerfTypes([...perfTypes, type]);
      setPerfValidationErrors([]);
    }
  };

  const handleRemoveAssessmentFile = (idx) => {
    setPerfFiles(perfFiles.filter((_, i) => i !== idx));
    setPerfTypes(perfTypes.filter((_, i) => i !== idx));
    setPerfValidationErrors([]);
  };

  const handlePreviousPerformanceSubmit = async () => {
    if (perfFiles.length === 0) {
      // Skipped
      setCurrentStep(5);
      return;
    }
    setLoading(true);
    setError('');
    setPerfValidationErrors([]);
    try {
      const formData = new FormData();
      perfFiles.forEach((file, i) => {
        formData.append('files', file);
        formData.append('types', perfTypes[i]);
      });
      const res = await api.post('/workflow/previous-performance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const analysis = res.data.attainment_analysis || {};
      const errors = analysis.validation_errors || [];
      
      setAttainmentAnalysis(analysis);
      refreshState();
      
      if (errors.length > 0) {
        setPerfValidationErrors(errors);
      } else {
        setCurrentStep(5);
      }
    } catch (err) {
      setError("Failed to analyze previous performance data.");
    } finally {
      setLoading(false);
    }
  };

  // Phase 5: AI Generation Pipeline Simulation
  const handleTriggerAIGeneration = async () => {
    setGenerating(true);
    setAgentProgress(0);
    setError('');
    
    // Simulated steps to show multi-agent cooperate
    const interval = setInterval(() => {
      setAgentProgress(prev => {
        if (prev >= 4) {
          clearInterval(interval);
          return 4;
        }
        return prev + 1;
      });
    }, 1500);

    try {
      const response = await api.post('/workflow/generate-cos', {
        num_cos: numCos,
        feedback: refineFeedback
      });
      
      clearInterval(interval);
      setAgentProgress(5); // Complete
      setTimeout(() => {
        setNewGeneratedCos(response.data.cos);
        setValidationReport(response.data.validation);
        
        // Auto-initialize hybrid/final list with new outcomes as a default starting point
        setFinalCos(response.data.cos);
        
        refreshState();
        setGenerating(false);
        setCurrentStep(6);
      }, 800);
    } catch (err) {
      clearInterval(interval);
      setGenerating(false);
      setError("Failed to run AI generation workflow.");
    }
  };

  // Phase 6: Comparison & Hybrid builder
  const handleKeepOutcome = (co) => {
    // Check duplicates
    if (finalCos.some(item => item.statement === co.statement)) return;
    
    const nextId = `CO${finalCos.length + 1}`;
    setFinalCos([...finalCos, {
      ...co,
      co_id: nextId
    }]);
  };

  const handleRemoveFinalOutcome = async (index) => {
    const updated = finalCos.filter((_, i) => i !== index).map((co, i) => ({
      ...co,
      co_id: `CO${i + 1}`
    }));
    setFinalCos(updated);
    
    // Commit immediately to database
    setLoading(true);
    setError('');
    try {
      await api.post('/workflow/finalize-cos', { cos: updated });
      setSuccess("Outcome removed successfully!");
      setTimeout(() => setSuccess(''), 2000);
      refreshState();
    } catch (err) {
      setError("Failed to remove outcome.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditFinal = (index, co) => {
    setEditingIndex(index);
    setEditingText(co.statement);
    setEditingLevel(co.blooms_level);
    setEditingKeyword(co.blooms_keyword);
  };

  const handleSaveEditFinal = async () => {
    const updated = [...finalCos];
    updated[editingIndex] = {
      ...updated[editingIndex],
      statement: editingText,
      blooms_level: parseInt(editingLevel),
      blooms_keyword: editingKeyword
    };
    setFinalCos(updated);
    setEditingIndex(null);
    
    // Commit immediately to database
    setLoading(true);
    setError('');
    try {
      await api.post('/workflow/finalize-cos', { cos: updated });
      setSuccess("Outcome updated successfully!");
      setTimeout(() => setSuccess(''), 2000);
      refreshState();
    } catch (err) {
      setError("Failed to save outcome edits.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomOutcome = () => {
    const nextId = `CO${finalCos.length + 1}`;
    setFinalCos([...finalCos, {
      co_id: nextId,
      statement: 'Apply knowledge to solve complex computer science problems.',
      blooms_level: 3,
      blooms_keyword: 'Apply',
      confidence_score: 1.0,
      validation_status: 'approved'
    }]);
    setEditingIndex(finalCos.length);
    setEditingText('Apply knowledge to solve complex computer science problems.');
    setEditingLevel(3);
    setEditingKeyword('Apply');
  };

  const handleFinalizeWork = async () => {
    if (finalCos.length === 0) {
      setError("Please select/create at least one Course Outcome.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/workflow/finalize-cos', { cos: finalCos });
      setSuccess("Official Course Outcomes approved and finalized successfully!");
      refreshState();
      setShowWizard(false);
    } catch (err) {
      setError("Failed to finalize Course Outcomes.");
    } finally {
      setLoading(false);
    }
  };

  // Helper
  const getBloomBadge = (lvl) => {
    if (lvl >= 5) return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    if (lvl === 4) return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded">
            CSE (Data Science) Sandbox
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white mt-2">
            Course Outcome Generation Workflow
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Redesigned outcome-based planning wizard leveraging multi-agent historical attainment analysis.
          </p>
        </div>
      </div>

      {/* Progress Wizard Bar — Phase 1 hidden since it is handled by Course Setup page */}
      {showWizard && (
        <div className="glass-panel p-4 flex flex-wrap items-center gap-3">
          {/* Step 0: Academic Setup (completed in Course Setup page) */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-600 text-white">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-slate-400 hidden md:block">Academic Setup</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

          {/* Steps 2–6 */}
          {[
            { step: 2, label: "Course Input" },
            { step: 3, label: "Historical COs" },
            { step: 4, label: "Attainment Analysis" },
            { step: 5, label: "AI Generation" },
            { step: 6, label: "Comparison" }
          ].map((item, idx, arr) => (
            <div key={item.step} className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (item.step < currentStep) setCurrentStep(item.step);
                }}
                disabled={item.step > currentStep}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === item.step 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-500/10' 
                    : currentStep > item.step 
                      ? 'bg-emerald-600 text-white cursor-pointer' 
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed'
                }`}
              >
                {currentStep > item.step ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </button>
              <span className={`text-xs font-semibold ${currentStep === item.step ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'}`}>
                {item.label}
              </span>
              {idx < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden md:block" />}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-500 rounded-xl p-4 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl p-4 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {showWizard ? (
        <>
          {/* PHASE 1 is handled by Course Setup page — active subject banner shown if subjectName is set */}
          {currentStep === 1 && (
            <div className="glass-panel p-6 lg:p-8 space-y-4 max-w-xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold">Course Configured</h3>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl space-y-1 text-sm">
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Subject: </span><span className="font-bold">{subjectName || '—'}</span></p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Year: </span><span className="font-bold">{getYearLabel(academicYear)}</span></p>
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/10"
              >
                <ArrowRight className="w-4 h-4" /> Continue to Course Input
              </button>
            </div>
          )}

          {/* PHASE 2: COURSE INPUT */}
          {currentStep === 2 && (
            <div className="glass-panel p-6 lg:p-8 space-y-6 max-w-xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-lg font-bold">Phase 1: Course Input</h3>
              </div>

          <form onSubmit={handleCourseInputSubmit} className="space-y-5">
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 rounded-xl">
              {[
                { id: 'typed', label: 'Type Description' },
                { id: 'pdf', label: 'Upload PDF' },
                { id: 'txt', label: 'Upload TXT' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDescOption(opt.id)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    descOption === opt.id 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {descOption === 'typed' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Syllabus / Course Description</label>
                <textarea
                  required
                  placeholder="Paste the course goals, outline, core requirements, topics, and practical guidelines here..."
                  value={typedDesc}
                  onChange={(e) => setTypedDesc(e.target.value)}
                  rows={6}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl text-sm focus:outline-none"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Upload Syllabus Document</label>
                <div className="border-2 border-dashed border-slate-350 dark:border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-500/5 relative cursor-pointer group">
                  <input
                    type="file"
                    required
                    accept={descOption === 'pdf' ? '.pdf' : '.txt'}
                    onChange={(e) => setDescFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-slate-400 mx-auto group-hover:text-blue-500 transition-colors" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                    {descFile ? descFile.name : "Select syllabus file to extract"}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/10"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyze Course Context
            </button>
          </form>
        </div>
      )}

      {/* PHASE 3: PREVIOUS YEAR COURSE OUTCOMES */}
      {currentStep === 3 && (
        <div className="glass-panel p-6 lg:p-8 space-y-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-lg font-bold">Phase 3: Previous Year COs</h3>
            <button onClick={() => setCurrentStep(2)} className="text-xs text-slate-450 hover:text-slate-650 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          <form onSubmit={handlePreviousCosSubmit} className="space-y-5">
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 rounded-xl">
              {[
                { id: 'skip', label: 'Skip (Unavailable)' },
                { id: 'paste', label: 'Paste manually' },
                { id: 'upload', label: 'Upload document' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPrevOption(opt.id)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    prevOption === opt.id 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {prevOption === 'skip' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-800 rounded-xl text-center text-xs text-slate-500">
                Proceeding without historical CO records. The AI will generate new outcomes without historical baseline continuity.
              </div>
            )}

            {prevOption === 'paste' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Paste Previous COs</label>
                <textarea
                  required
                  placeholder="CO1: Define data types...&#10;CO2: Apply algorithms..."
                  value={prevRawText}
                  onChange={(e) => setPrevRawText(e.target.value)}
                  rows={5}
                  className="w-full p-3 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                />
              </div>
            )}

            {prevOption === 'upload' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Upload CO Document (.pdf or .txt)</label>
                <div className="border-2 border-dashed border-slate-350 dark:border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-500/5 relative cursor-pointer group">
                  <input
                    type="file"
                    required
                    accept=".pdf,.txt"
                    onChange={(e) => setPrevFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-slate-400 mx-auto group-hover:text-blue-500" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                    {prevFile ? prevFile.name : "Select file"}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/10"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {prevOption === 'skip' ? 'Continue' : 'Process & Analyze Historical COs'}
            </button>
          </form>
        </div>
      )}

      {/* PHASE 4: PREVIOUS YEAR PERFORMANCE ANALYSIS */}
      {currentStep === 4 && (
        <div className="glass-panel p-6 lg:p-8 space-y-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-lg font-bold">Phase 4: Performance Analysis</h3>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Optional Step</span>
            </div>
            <button onClick={() => setCurrentStep(3)} className="text-xs text-slate-450 hover:text-slate-650 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          <p className="text-xs text-slate-455 leading-relaxed">
            Upload previous year question papers or student marks CSV to evaluate attainment levels. 
            This is processed in the background as generation context.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-dashed dark:border-slate-800 rounded-xl text-center relative cursor-pointer hover:bg-slate-500/5">
                <input
                  type="file"
                  onChange={(e) => handleAddAssessmentFile(e, 'ia_paper')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileText className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-350">Add Question Paper</span>
              </div>
              
              <div className="p-4 border border-dashed dark:border-slate-800 rounded-xl text-center relative cursor-pointer hover:bg-slate-500/5">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleAddAssessmentFile(e, 'student_marks')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Database className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-350">Add Student Marks (.csv)</span>
              </div>
            </div>

            {/* List of uploaded files */}
            {perfFiles.length > 0 && (
              <div className="space-y-2 border-t dark:border-slate-800 pt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Files</span>
                {perfFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded font-bold text-[9px] uppercase">
                        {perfTypes[i] === 'student_marks' ? 'Marks' : 'Paper'}
                      </span>
                      <span className="truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <button onClick={() => handleRemoveAssessmentFile(i)} className="text-slate-400 hover:text-rose-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {perfValidationErrors.length > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Consistency Warnings</span>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {perfValidationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {perfValidationErrors.length > 0 ? (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPerfFiles([]);
                    setPerfTypes([]);
                    setPerfValidationErrors([]);
                  }}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold rounded-xl text-xs transition-colors"
                >
                  Re-upload Corrected Files
                </button>
                <button
                  onClick={() => {
                    setPerfValidationErrors([]);
                    setCurrentStep(5);
                  }}
                  className="flex-1 py-3 bg-amber-650 hover:bg-amber-550 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/10 text-xs transition-colors"
                >
                  Proceed Anyway
                </button>
              </div>
            ) : (
              <button
                onClick={handlePreviousPerformanceSubmit}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/10"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {perfFiles.length === 0 ? "Skip / Continue" : "Analyze Attainment & Continue"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* PHASE 5: AI-ASSISTED CO GENERATION */}
      {currentStep === 5 && (
        <div className="glass-panel p-6 lg:p-8 space-y-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-lg font-bold">Phase 5: AI-Assisted CO Generation</h3>
            <button onClick={() => setCurrentStep(4)} className="text-xs text-slate-450 hover:text-slate-650 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          {generating ? (
            <div className="space-y-6 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                <h4 className="font-bold text-sm">Agentic AI Cooperating...</h4>
              </div>
              
              <div className="space-y-3.5 border-t dark:border-slate-800 pt-4">
                {[
                  "Course Context Agent: Structuring current syllabus topics...",
                  "Historical CO Analyst Agent: Compiling previous outcomes...",
                  "Assessment & Attainment Agents: Correlating past weak areas...",
                  "CO Generation Agent: Formulating compliant outcomes...",
                  "CO Validation Agent: Checking Bloom's taxonomy L3-L6 levels..."
                ].map((milestone, idx) => {
                  const isDone = idx < agentProgress;
                  const isCurrent = idx === agentProgress;
                  return (
                    <div key={idx} className="flex items-center gap-2.5 text-xs">
                      {isDone ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                          <Loader2 className="w-3 h-3 animate-spin" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center shrink-0 border dark:border-slate-850">
                          {idx + 1}
                        </div>
                      )}
                      <span className={isCurrent ? 'font-bold text-blue-500' : isDone ? 'text-slate-500' : 'text-slate-400'}>
                        {milestone}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs leading-relaxed space-y-2">
                <span className="font-bold text-blue-500 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Pipeline Input Synthesized
                </span>
                <p>The system will compile course context, previous CO benchmarks, past attainment indicators, and Bloom's taxonomy guidelines to generate optimized outcomes.</p>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Desired COs</label>
                  <select
                    value={numCos}
                    onChange={(e) => setNumCos(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border dark:bg-slate-950 dark:border-slate-850 rounded-xl text-sm"
                  >
                    <option value="4">4 COs</option>
                    <option value="6">6 COs (Recommended)</option>
                    <option value="8">8 COs</option>
                  </select>
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Critique / Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Focus on practical lab problems"
                    value={refineFeedback}
                    onChange={(e) => setRefineFeedback(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border dark:bg-slate-950 dark:border-slate-850 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleTriggerAIGeneration}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/10"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                Trigger CO Generation Agents
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHASE 6: CO COMPARISON & HYBRID BUILDER SCREEN */}
      {currentStep === 6 && (
        <div className="space-y-6">
          {/* Top Panel */}
          <div className="glass-panel p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold">Phase 6: Outcome Comparison Board</h3>
              <p className="text-xs text-slate-455 mt-0.5">Select statements from the previous syllabus or newly generated outcomes to create your final official course Outcomes.</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentStep(5)}
                className="px-3.5 py-2 border dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-500/5"
              >
                Back to Generation
              </button>
              <button
                onClick={handleFinalizeWork}
                disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve & Finalize Official outcomes
              </button>
            </div>
          </div>

          {/* Comparison columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: PREVIOUS YEAR COs */}
            <div className="glass-panel p-5 space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Previous Year Course Outcomes
              </h4>
              
              {parsedPrevCos.length === 0 ? (
                <div className="p-8 border border-dashed dark:border-slate-800 rounded-xl text-center text-xs text-slate-400">
                  No previous year outcomes provided/available.
                </div>
              ) : (
                <div className="space-y-3">
                  {parsedPrevCos.map((co) => (
                    <div key={co.co_id} className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-850 rounded-xl flex justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-400">{co.co_id}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getBloomBadge(co.blooms_level)}`}>
                            L{co.blooms_level} ({co.blooms_keyword})
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-650 dark:text-slate-350">{co.statement}</p>
                      </div>
                      <button
                        onClick={() => handleKeepOutcome(co)}
                        className="self-center p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors shrink-0"
                        title="Add to Final Official Set"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: NEWLY GENERATED COs */}
            <div className="glass-panel p-5 space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Newly Generated outcomes
              </h4>
              
              <div className="space-y-3">
                {newGeneratedCos.map((co) => (
                  <div key={co.co_id} className="p-4 bg-blue-500/[0.02] border border-blue-500/10 dark:border-blue-500/20 rounded-xl flex justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-blue-500">{co.co_id}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getBloomBadge(co.blooms_level)}`}>
                          L{co.blooms_level} ({co.blooms_keyword})
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400">Confidence: {(co.confidence_score*100).toFixed(0)}%</span>
                      </div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-350">{co.statement}</p>
                    </div>
                    <button
                      onClick={() => handleKeepOutcome(co)}
                      className="self-center p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors shrink-0"
                      title="Add to Final Official Set"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LOWER HALF: FINAL HYBRID SET BUILDER */}
          <div className="glass-panel p-6 space-y-5">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Your Final Approved outcomes Matrix ({finalCos.length} Selected)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Faculty can customize, rename, and add custom entries below to achieve perfect OBE alignment.</p>
              </div>
              <button
                onClick={handleAddCustomOutcome}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom outcome
              </button>
            </div>

            {finalCos.length === 0 ? (
              <div className="p-12 border border-dashed dark:border-slate-800 rounded-2xl text-center text-xs text-slate-500">
                The final outcomes list is currently empty. Click the plus icon on the columns above to add previous or generated outcomes, or create a custom outcome.
              </div>
            ) : (
              <div className="space-y-3">
                {finalCos.map((co, idx) => {
                  const isEditing = editingIndex === idx;
                  return (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl space-y-3">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <span className="font-bold text-xs text-blue-500 self-center">{co.co_id}</span>
                            <div className="flex-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Outcome Keyword</label>
                              <input
                                type="text"
                                value={editingKeyword}
                                onChange={(e) => setEditingKeyword(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border dark:bg-slate-950 dark:border-slate-800 rounded focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Blooms Level</label>
                              <select
                                value={editingLevel}
                                onChange={(e) => setEditingLevel(parseInt(e.target.value))}
                                className="px-2 py-1.5 text-xs bg-white border dark:bg-slate-950 dark:border-slate-800 rounded"
                              >
                                <option value={3}>L3 - Apply</option>
                                <option value={4}>L4 - Analyze</option>
                                <option value={5}>L5 - Evaluate</option>
                                <option value={6}>L6 - Create</option>
                              </select>
                            </div>
                          </div>
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={2}
                            className="w-full p-2.5 text-xs bg-white border dark:bg-slate-950 dark:border-slate-800 rounded focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingIndex(null)} className="px-2.5 py-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] rounded font-semibold">
                              Cancel
                            </button>
                            <button onClick={handleSaveEditFinal} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] rounded font-bold">
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-700 dark:text-slate-350">{co.co_id}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getBloomBadge(co.blooms_level)}`}>
                                L{co.blooms_level} ({co.blooms_keyword})
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-300">{co.statement}</p>
                          </div>
                          
                          <div className="flex gap-1 shrink-0 self-center">
                            <button
                              onClick={() => handleStartEditFinal(idx, co)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500"
                              title="Edit Statement"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveFinalOutcome(idx)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-rose-500"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  ) : (
    <div className="space-y-6 animate-fadeIn">
      {/* Active Course Overview Card */}
      <div className="glass-panel p-6 border-l-4 border-emerald-500 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-8 -mt-8 blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/10">
                Official Locked Syllabus
              </span>
              <span className="text-xs text-slate-400 font-medium">• Active Subject</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {subjectName || "Unconfigured Course"}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                {getYearLabel(academicYear)}
              </span>
              <span>•</span>
              <span>{semester}</span>
              <span>•</span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded font-semibold text-slate-650 dark:text-slate-350">
                CSE (Data Science)
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCustomOutcome}
              className="px-4 py-2 border dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-500/5 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5 text-blue-500" /> Add Custom CO
            </button>
            <button
              onClick={() => {
                setShowWizard(true);
                setCurrentStep(1);
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-engineer Syllabus (Rerun Wizard)
            </button>
          </div>
        </div>
      </div>

      {/* Locked outcomes card list */}
      <div className="glass-panel p-6 space-y-4">
        <h4 className="font-bold text-sm uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2 border-b dark:border-slate-800 pb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Locked Course Outcomes Matrix ({finalCos.length} Outcomes)
        </h4>

        {finalCos.length === 0 ? (
          <div className="p-12 border border-dashed dark:border-slate-800 rounded-2xl text-center text-xs text-slate-500">
            The final outcomes list is currently empty. Click "Re-engineer Syllabus" to generate new outcomes or add a custom outcome.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {finalCos.map((co, idx) => {
              const isEditing = editingIndex === idx;
              return (
                <div 
                  key={idx} 
                  className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-850 hover:border-blue-500/20 rounded-2xl transition-all duration-200 group"
                >
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4">
                        <span className="font-bold text-sm text-blue-500 self-center">{co.co_id}</span>
                        <div className="flex-1 min-w-[150px]">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Outcome Keyword</label>
                          <input
                            type="text"
                            value={editingKeyword}
                            onChange={(e) => setEditingKeyword(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div className="min-w-[150px]">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Bloom's Level</label>
                          <select
                            value={editingLevel}
                            onChange={(e) => setEditingLevel(parseInt(e.target.value))}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl focus:outline-none"
                          >
                            <option value={3}>L3 - Apply</option>
                            <option value={4}>L4 - Analyze</option>
                            <option value={5}>L5 - Evaluate</option>
                            <option value={6}>L6 - Create</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Outcome Statement</label>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          rows={3}
                          className="w-full p-3 text-xs bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingIndex(null)} 
                          className="px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] rounded-lg font-semibold"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSaveEditFinal} 
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] rounded-lg font-bold shadow-md shadow-blue-500/10"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs text-blue-500 dark:text-blue-400">{co.co_id}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold tracking-wide uppercase ${getBloomBadge(co.blooms_level)}`}>
                            L{co.blooms_level} ({co.blooms_keyword})
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">
                          {co.statement}
                        </p>
                      </div>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleStartEditFinal(idx, co)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-950/30 text-slate-500 hover:text-blue-500 transition-colors"
                          title="Edit Statement"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveFinalOutcome(idx)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-500 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  )}
</div>
  );
}
