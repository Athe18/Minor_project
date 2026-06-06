import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2, 
  Loader2, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ChevronRight, 
  BookOpen, 
  TrendingUp, 
  Activity,
  Award,
  Settings,
  Sparkles,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  Users,
  Terminal,
  Grid3X3,
  FileCode,
  ListFilter,
  Check,
  Target
} from 'lucide-react';
import { courseAPI, reportAPI } from '../api';

export default function SubjectWorkspace({ activeSubjectId, refreshAllState, setActiveTab, readOnly }) {
  const [courseState, setCourseState] = useState(null);
  const [loadingState, setLoadingState] = useState(true);
  const [error, setError] = useState('');
  
  // Pipeline Step State
  const [activeStep, setActiveStep] = useState(1);
  
  // Report downloads state
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const fetchSubjectData = async () => {
    if (!activeSubjectId) return;
    setLoadingState(true);
    setError('');
    try {
      const response = await courseAPI.getState();
      if (response && response.data) {
        setCourseState(response.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch subject state.');
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    fetchSubjectData();
  }, [activeSubjectId]);

  const downloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const response = await reportAPI.downloadExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeSubjectId.replace(/\s+/g, '_')}_OBE_Report.xlsx`);
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
      link.setAttribute('download', `${activeSubjectId.replace(/\s+/g, '_')}_OBE_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download PDF dossier.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // ─── Pipeline Configuration Steps ───────────────────────────────────────────
  const steps = [
    { id: 1, name: "Academic Parameters", phase: "Phase 1", desc: "Course setup and accreditation targets", icon: Settings },
    { id: 2, name: "Syllabus Context & Philosophy", phase: "Phase 2", desc: "Syllabus input and delivery design", icon: BookOpen },
    { id: 3, name: "Course Outcomes & Validation", phase: "Phase 3", desc: "AI CO statements and Bloom's levels", icon: Sparkles },
    { id: 4, name: "Correlation Matrix & Alignment", phase: "Phase 4", desc: "CO-PO strength mapping and validation", icon: Grid3X3 },
    { id: 5, name: "Assessment Marks & Roster", phase: "Phase 5", desc: "Student scores per Course Outcome", icon: Users },
    { id: 6, name: "Attainment Analytics", phase: "Phase 6", desc: "Direct achievement metrics and charts", icon: TrendingUp },
    { id: 7, name: "Accreditation Dossier & Logs", phase: "Phase 7", desc: "NBA exports and audit trail", icon: FileText }
  ];

  const getStepStatus = (stepId) => {
    if (!courseState) return 'pending';
    switch (stepId) {
      case 1:
        return 'completed'; // basic parameters always exist since subject exists
      case 2:
        return courseState.syllabus_text ? 'completed' : 'incomplete';
      case 3:
        return (courseState.cos && courseState.cos.length > 0) ? 'completed' : 'incomplete';
      case 4:
        return (courseState.mappings && courseState.mappings.length > 0) ? 'completed' : 'incomplete';
      case 5:
        const hasStudents = (courseState.students && courseState.students.length > 0) ||
                            (courseState.ia_students && courseState.ia_students.length > 0) ||
                            (courseState.mse_students && courseState.mse_students.length > 0) ||
                            (courseState.ese_students && courseState.ese_students.length > 0);
        return hasStudents ? 'completed' : 'incomplete';
      case 6:
        return (courseState.co_attainment && courseState.co_attainment.length > 0) ? 'completed' : 'incomplete';
      case 7:
        return 'completed'; // logs are always readable
      default:
        return 'pending';
    }
  };

  // ─── Computations ──────────────────────────────────────────────────────────
  const computedCoAttainments = useMemo(() => {
    return (courseState?.co_attainment || []).map(att => {
      if (!att) return null;
      return {
        ...att,
        overallPercentage: att.avg_percentage || 0,
        overallAttainmentLevel: att.achieved_level || 0
      };
    }).filter(Boolean);
  }, [courseState?.co_attainment]);

  const computedPoAttainments = useMemo(() => {
    const mappings = courseState?.mappings || [];
    const pos = courseState?.pos || Array.from({ length: 12 }, (_, i) => ({ po_id: `PO${i + 1}` }));

    return pos.map(po => {
      if (!po) return null;
      const poMappings = mappings.filter(m => m && m.po_id === po.po_id && parseFloat(m.strength) > 0);
      
      if (poMappings.length === 0) {
        return {
          po_id: po.po_id,
          weighted_attainment: 0.0,
          is_weak: true
        };
      }

      let numerator = 0.0;
      let denominator = 0.0;

      poMappings.forEach(mapping => {
        const co_att = computedCoAttainments.find(a => a && a.co_id === mapping.co_id);
        if (co_att) {
          const strength = parseFloat(mapping.strength) || 0;
          const level = parseFloat(co_att.overallAttainmentLevel) || 0;
          numerator += level * strength;
          denominator += strength;
        }
      });

      const weighted = denominator > 0 ? Math.round((numerator / denominator) * 100) / 100 : 0.0;
      return {
        po_id: po.po_id,
        weighted_attainment: weighted,
        is_weak: weighted < 1.5
      };
    }).filter(Boolean);
  }, [courseState?.mappings, courseState?.pos, computedCoAttainments]);

  // Chart Mappings
  const coChartData = computedCoAttainments.map(co => ({
    name: co.co_id || '',
    'Average %': Math.round((co.overallPercentage || 0) * 10) / 10
  }));

  const poChartData = computedPoAttainments.map(po => ({
    name: po.po_id || '',
    'Weighted Score': po.weighted_attainment || 0.0
  }));

  const bloomDistribution = useMemo(() => {
    if (!courseState?.cos) return {};
    const dist = {};
    courseState.cos.forEach(co => {
      const lvl = co.blooms_level;
      dist[lvl] = (dist[lvl] || 0) + 1;
    });
    return dist;
  }, [courseState?.cos]);

  const bloomTotal = courseState?.cos?.length || 0;

  // Roster analysis for step 5
  const rosterSummary = useMemo(() => {
    if (!courseState) return null;
    const rosters = [];
    if (courseState.students && courseState.students.length > 0) {
      rosters.push({ type: 'General Course Marks', count: courseState.students.length, max: courseState.max_marks });
    }
    if (courseState.ia_students && courseState.ia_students.length > 0) {
      rosters.push({ type: 'Internal Assessment (IA)', count: courseState.ia_students.length, max: courseState.ia_max_marks });
    }
    if (courseState.mse_students && courseState.mse_students.length > 0) {
      rosters.push({ type: 'Mid-Semester Exam (MSE)', count: courseState.mse_students.length, max: courseState.mse_max_marks });
    }
    if (courseState.ese_students && courseState.ese_students.length > 0) {
      rosters.push({ type: 'End-Semester Exam (ESE)', count: courseState.ese_students.length, max: courseState.ese_max_marks });
    }
    return rosters;
  }, [courseState]);

  const previewStudents = useMemo(() => {
    if (!courseState) return [];
    if (courseState.students && courseState.students.length > 0) return courseState.students.slice(0, 10);
    if (courseState.ia_students && courseState.ia_students.length > 0) return courseState.ia_students.slice(0, 10);
    if (courseState.mse_students && courseState.mse_students.length > 0) return courseState.mse_students.slice(0, 10);
    if (courseState.ese_students && courseState.ese_students.length > 0) return courseState.ese_students.slice(0, 10);
    return [];
  }, [courseState]);

  const previewMaxMarks = useMemo(() => {
    if (!courseState) return {};
    if (courseState.students && courseState.students.length > 0) return courseState.max_marks || {};
    if (courseState.ia_students && courseState.ia_students.length > 0) return courseState.ia_max_marks || {};
    if (courseState.mse_students && courseState.mse_students.length > 0) return courseState.mse_max_marks || {};
    if (courseState.ese_students && courseState.ese_students.length > 0) return courseState.ese_max_marks || {};
    return {};
  }, [courseState]);

  const getBloomBadge = (lvl) => {
    if (lvl >= 5) return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    if (lvl === 4) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  };

  const getAttainmentBadge = (lvl) => {
    if (lvl >= 2.5) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (lvl >= 1.5) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  };

  if (!activeSubjectId) {
    return (
      <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-4 my-12 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold">No Subject Selected</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Please choose a subject from the academic directory dashboard, or add a new subject to start mapping.
          </p>
        </div>
      </div>
    );
  }

  if (loadingState) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading Subject Workspace...</p>
      </div>
    );
  }

  // ─── RENDER HELPER FOR PHASE DETAILS ────────────────────────────────────────
  const renderPhaseDetails = () => {
    switch (activeStep) {
      // ──────────────────────────────────────────────────────────────────────────
      // PHASE 1: ACADEMIC PARAMETERS & TARGETS
      // ──────────────────────────────────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b dark:border-slate-850 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Phase 1: Academic Parameters</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Basic parameters and dynamic NBA attainment thresholds</p>
              </div>
             {!readOnly && (
               <button
                 onClick={() => setActiveTab('setup')}
                 className="mt-3 md:mt-0 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-bold"
               >
                 Change in Setup <ChevronRight className="w-4 h-4" />
               </button>
             )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Parameters Card */}
              <div className="glass-panel p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-blue-500" /> Subject Details & Thresholds
                </h4>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs border-b dark:border-slate-850 pb-2">
                    <span className="text-slate-400">Subject Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{courseState?.subject_name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b dark:border-slate-850 pb-2">
                    <span className="text-slate-400">Department</span>
                    <span className="font-semibold text-slate-850 dark:text-slate-200">{courseState?.department || 'Department of CSE'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b dark:border-slate-850 pb-2">
                    <span className="text-slate-400">Year & Semester</span>
                    <span className="font-semibold text-slate-850 dark:text-slate-200">{courseState?.year} · {courseState?.semester}</span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Accreditation Threshold Targets</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-center space-y-1">
                        <span className="text-[10px] text-rose-500 font-bold block">Level 1</span>
                        <span className="text-base font-black text-slate-800 dark:text-white">≥ {courseState?.level1_threshold || 55}%</span>
                      </div>
                      <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center space-y-1">
                        <span className="text-[10px] text-amber-500 font-bold block">Level 2</span>
                        <span className="text-base font-black text-slate-800 dark:text-white">≥ {courseState?.level2_threshold || 65}%</span>
                      </div>
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center space-y-1">
                        <span className="text-[10px] text-emerald-500 font-bold block">Level 3</span>
                        <span className="text-base font-black text-slate-800 dark:text-white">≥ {courseState?.level3_threshold || 75}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Program Outcomes Card */}
              <div className="glass-panel p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-purple-500" /> NBA Graduate Program Outcomes
                </h4>
                <div className="h-60 overflow-y-auto pr-1 space-y-2.5">
                  {(courseState?.pos || []).map(po => (
                    <div key={po.po_id} className="p-2.5 bg-slate-50/50 dark:bg-slate-950/20 border dark:border-slate-850 rounded-xl text-[11px] leading-relaxed">
                      <span className="font-bold text-purple-500 mr-1.5">{po.po_id}:</span>
                      <span className="text-slate-700 dark:text-slate-350">{po.statement}</span>
                    </div>
                  ))}
                  {(courseState?.pos || []).length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center pt-8">No PO definitions loaded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      // ──────────────────────────────────────────────────────────────────────────
      // PHASE 2: SYLLABUS TEXT & TEACHING PHILOSOPHY
      // ──────────────────────────────────────────────────────────────────────────
      case 2:
        if (!courseState?.syllabus_text) {
          return (
            <div className="glass-panel p-8 text-center space-y-4 animate-fadeIn">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Syllabus Text Missing</h4>
                <p className="text-xs text-slate-450 mt-1 max-w-md mx-auto">
                  Syllabus text input is required to map course topics, generate course outcomes, and align cognitive levels.
                </p>
              </div>
              {!readOnly && (
               <button
                 onClick={() => setActiveTab('setup')}
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
               >
                 Upload Syllabus <ArrowRight className="w-4 h-4" />
               </button>
             )}
            </div>
          );
        }

        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b dark:border-slate-850 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Phase 2: Syllabus & Context</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Syllabus specifications and generated teaching guidelines</p>
              </div>
             {!readOnly && (
               <div className="flex gap-2">
                 <button
                   onClick={() => setActiveTab('setup')}
                   className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-bold"
                 >
                   Edit Syllabus <ChevronRight className="w-4 h-4" />
                 </button>
                 <span className="text-slate-300 dark:text-slate-800">|</span>
                 <button
                   onClick={() => setActiveTab('philosophy')}
                   className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 font-bold"
                 >
                   Edit Philosophy <ChevronRight className="w-4 h-4" />
                 </button>
               </div>
             )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Syllabus Text block */}
              <div className="glass-panel p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><FileCode className="w-4 h-4 text-blue-500" /> Raw Syllabus Document</span>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-mono">
                    {courseState.syllabus_text.length} chars
                  </span>
                </h4>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border dark:border-slate-850 rounded-xl h-96 overflow-y-auto text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-mono whitespace-pre-line">
                  {courseState.syllabus_text}
                </div>
              </div>

              {/* Context Data & Philosophy */}
              <div className="space-y-6">
                {/* Teaching Philosophy */}
                <div className="glass-panel p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-500" /> Teaching Philosophy
                  </h4>
                  <div className="p-4 bg-purple-500/[0.02] border border-purple-500/10 rounded-xl text-xs text-slate-700 dark:text-slate-350 leading-relaxed italic h-[148px] overflow-y-auto whitespace-pre-line">
                    {courseState.teaching_philosophy || (
                      <span className="text-slate-400 italic">No custom philosophy generated. Generate one in the Teaching Philosophy page.</span>
                    )}
                  </div>
                </div>

                {/* Course Context Analysis */}
                <div className="glass-panel p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-500" /> Curriculum Context Analysis
                  </h4>
                  {courseState.course_context_data && Object.keys(courseState.course_context_data).length > 0 ? (
                    <div className="space-y-3 text-xs">
                      {courseState.course_context_data.prerequisites && (
                        <div>
                          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Prerequisites</span>
                          <p className="text-slate-650 dark:text-slate-350 mt-1 leading-relaxed">{courseState.course_context_data.prerequisites}</p>
                        </div>
                      )}
                      {courseState.course_context_data.skills && (
                        <div>
                          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Industry-Relevant Skills</span>
                          <p className="text-slate-650 dark:text-slate-350 mt-1 leading-relaxed">{courseState.course_context_data.skills}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-6 text-center">No structural context metadata generated yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      // ──────────────────────────────────────────────────────────────────────────
      // PHASE 3: COURSE OUTCOMES & AI VALIDATION
      // ──────────────────────────────────────────────────────────────────────────
      case 3:
        if (!courseState?.cos || courseState.cos.length === 0) {
          return (
            <div className="glass-panel p-8 text-center space-y-4 animate-fadeIn">
              <ShieldAlert className="w-12 h-12 text-blue-500 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Course Outcomes Pending</h4>
                <p className="text-xs text-slate-455 mt-1 max-w-md mx-auto">
                  Run the AI CO Generator and Validator wizard to extract outcomes conforming to Bloom's taxonomy.
                </p>
              </div>
              {!readOnly && (
               <button
                 onClick={() => setActiveTab('cos')}
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
               >
                 Launch CO Wizard <ArrowRight className="w-4 h-4" />
               </button>
             )}
            </div>
          );
        }

        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b dark:border-slate-850 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Phase 3: Course Outcomes (COs)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">AI-generated outcomes and dynamic Bloom's taxonomy evaluation</p>
              </div>
             {!readOnly && (
               <button
                 onClick={() => setActiveTab('cos')}
                 className="mt-3 md:mt-0 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-bold"
               >
                 Modify Outcomes <ChevronRight className="w-4 h-4" />
               </button>
             )}
            </div>

            {/* Bloom's Distribution and statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Stat block */}
              <div className="glass-panel p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Outcomes</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white">{bloomTotal}</span>
              </div>
              {/* Bloom's L3 */}
              <div className="glass-panel p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">L3 - Apply</span>
                <span className="text-3xl font-black text-slate-850 dark:text-emerald-400">{bloomDistribution[3] || 0}</span>
              </div>
              {/* Bloom's L4 */}
              <div className="glass-panel p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest block">L4 - Analyze</span>
                <span className="text-3xl font-black text-slate-850 dark:text-cyan-400">{bloomDistribution[4] || 0}</span>
              </div>
              {/* Bloom's L5/L6 */}
              <div className="glass-panel p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest block">L5/L6 - Higher</span>
                <span className="text-3xl font-black text-slate-850 dark:text-purple-400">
                  {((bloomDistribution[5] || 0) + (bloomDistribution[6] || 0))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Outcome list */}
              <div className="lg:col-span-2 space-y-3">
                <div className="glass-panel p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450">Official Course Outcomes Statements</h4>
                  <div className="space-y-3">
                    {courseState.cos.map(co => (
                      <div key={co.co_id} className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border dark:border-slate-850 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-blue-500">{co.co_id}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wide ${getBloomBadge(co.blooms_level)}`}>
                            Level {co.blooms_level} ({co.blooms_keyword})
                          </span>
                          {co.confidence_score && (
                            <span className="ml-auto text-[9px] font-mono text-slate-400">
                              Conf: {Math.round(co.confidence_score * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-750 dark:text-slate-300 leading-relaxed">
                          {co.statement}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Validator Logs */}
              <div className="lg:col-span-1 glass-panel p-5 space-y-3 flex flex-col">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-500" /> CO Validator Compliance Log
                </h4>
                <div className="flex-1 p-3 bg-slate-950 border border-slate-900 rounded-xl font-mono text-[10px] leading-relaxed text-slate-350 overflow-y-auto max-h-96">
                  <p className="text-emerald-500 font-bold mb-1">=== Initializing Verification Agent ===</p>
                  <p className="text-slate-550">[SYS] Checking verb taxonomies...</p>
                  <p className="text-slate-550">[SYS] Checking cognitive progression...</p>
                  
                  {courseState.co_validation_feedback ? (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-amber-500 font-bold">Feedback / Issues Registered:</p>
                      <p className="text-amber-455 whitespace-pre-wrap">{courseState.co_validation_feedback}</p>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1">
                      <p className="text-emerald-400 font-semibold">✓ Action Verbs conform to Bloom's guidelines.</p>
                      <p className="text-emerald-400 font-semibold">✓ No duplicates or empty outcome statements.</p>
                      <p className="text-emerald-400 font-semibold">✓ All targets align with program capabilities.</p>
                      <p className="text-emerald-500 font-bold mt-2">✓ STATUS: VALIDATION COMPLIANT</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      // ──────────────────────────────────────────────────────────────────────────
      // PHASE 4: CO-PO MAPPING MATRIX & COMPLIANCE
      // ──────────────────────────────────────────────────────────────────────────
      case 4:
        if (!courseState?.mappings || courseState.mappings.length === 0) {
          return (
            <div className="glass-panel p-8 text-center space-y-4 animate-fadeIn">
              <ShieldAlert className="w-12 h-12 text-purple-500 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">CO-PO Matrix Empty</h4>
                <p className="text-xs text-slate-450 mt-1 max-w-md mx-auto">
                  Mapping strengths (0-3) between Course Outcomes (COs) and Program Outcomes (POs) are required to measure direct attainment contribution.
                </p>
              </div>
              {!readOnly && (
               <button
                 onClick={() => setActiveTab('mapping')}
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
               >
                 Create Matrix <ArrowRight className="w-4 h-4" />
               </button>
             )}
            </div>
          );
        }

        const mappedCOs = Array.from(new Set(courseState.mappings.map(m => m.co_id)));
        const mappedPOs = Array.from(new Set(courseState.mappings.filter(m => m.strength > 0).map(m => m.po_id)));
        const totalStrengthsSum = courseState.mappings.reduce((sum, m) => sum + parseFloat(m.strength || 0), 0);
        const averageMappingStrength = (totalStrengthsSum / courseState.mappings.filter(m => m.strength > 0).length || 0).toFixed(2);

        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b dark:border-slate-850 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Phase 4: Articulation Matrix</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">CO-PO mapping correlation grid and NBA alignment auditing</p>
              </div>
             {!readOnly && (
               <button
                 onClick={() => setActiveTab('mapping')}
                 className="mt-3 md:mt-0 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-bold"
               >
                 Modify Correlations <ChevronRight className="w-4 h-4" />
               </button>
             )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Average Mapping Strength</span>
                <span className="text-3xl font-black text-slate-850 dark:text-white">{averageMappingStrength}</span>
              </div>
              <div className="glass-panel p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest block">Program Outcomes Addressed</span>
                <span className="text-3xl font-black text-slate-850 dark:text-purple-400">{mappedPOs.length} / 12</span>
              </div>
              <div className="glass-panel p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">Matrix Status</span>
                <span className={`text-xl font-bold block pt-1 ${courseState.mapping_locked ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {courseState.mapping_locked ? "✓ Finalized & Locked" : "⚠ Draft State"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Matrix Card */}
              <div className="lg:col-span-2 glass-panel p-5 space-y-4 overflow-x-auto">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450">Mapping Articulation Grid</h4>
                <div className="min-w-[500px]">
                  <div className="grid gap-1 border-b dark:border-slate-800 pb-2.5 font-bold uppercase tracking-widest text-[9px] text-slate-400 text-center" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
                    <div className="col-span-1 text-left">CO ID</div>
                    {Array.from({ length: 12 }, (_, i) => `PO${i+1}`).map(poId => (
                      <div key={poId} className="col-span-1">{poId}</div>
                    ))}
                  </div>
                  
                  <div className="space-y-2 pt-2.5">
                    {courseState.cos.map(co => (
                      <div key={co.co_id} className="grid gap-1 items-center text-center" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
                        <div className="col-span-1 text-left text-xs font-bold text-slate-700 dark:text-slate-350">{co.co_id}</div>
                        {Array.from({ length: 12 }, (_, i) => `PO${i+1}`).map(poId => {
                          const match = (courseState.mappings || []).find(m => m.co_id === co.co_id && m.po_id === poId);
                          const str = match ? match.strength : 0;
                          return (
                            <div 
                              key={poId} 
                              className={`col-span-1 py-1.5 rounded text-xs font-bold transition-all ${
                                str === 3 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                str === 2 ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                                str === 1 ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                                'text-slate-300 dark:text-slate-800 font-normal'
                              }`}
                              title={match?.reasoning || 'No connection'}
                            >
                              {str > 0 ? str : '–'}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compliance Auditor Logs */}
              <div className="lg:col-span-1 glass-panel p-5 space-y-3 flex flex-col">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-purple-500" /> Mapping Compliance Auditor
                </h4>
                <div className="flex-1 p-3 bg-slate-950 border border-slate-900 rounded-xl font-mono text-[10px] leading-relaxed text-slate-350 overflow-y-auto max-h-96">
                  <p className="text-purple-400 font-bold mb-1">=== Initializing Mapping Validator Agent ===</p>
                  <p className="text-slate-550">[SYS] Checking row mapping thresholds...</p>
                  <p className="text-slate-550">[SYS] Auditing curriculum mapping strength contradictions...</p>
                  
                  {courseState.mapping_validation_feedback ? (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-amber-500 font-bold">Suggestions / Compliance Warnings:</p>
                      <p className="text-amber-450 whitespace-pre-wrap">{courseState.mapping_validation_feedback}</p>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1">
                      <p className="text-emerald-400 font-semibold">✓ Attainment mapping complies with NBA guidelines.</p>
                      <p className="text-emerald-400 font-semibold">✓ No orphan PO columns (unaddressed POs).</p>
                      <p className="text-emerald-400 font-semibold">✓ Row mappings do not exceed local maximum limits.</p>
                      <p className="text-emerald-500 font-bold mt-2">✓ STATUS: MATRIX ALIGNED</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      // ──────────────────────────────────────────────────────────────────────────
      // PHASE 5: STUDENT MARKS & ASSESSMENT ROSTER PREVIEW
      // ──────────────────────────────────────────────────────────────────────────
      case 5:
        const hasMarks = rosterSummary && rosterSummary.length > 0;
        if (!hasMarks) {
          return (
            <div className="glass-panel p-8 text-center space-y-4 animate-fadeIn">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Assessment Marks Missing</h4>
                <p className="text-xs text-slate-450 mt-1 max-w-md mx-auto">
                  Please upload a student cohort marks spreadsheet (CSV/Excel) containing scores mapped by Course Outcome.
                </p>
              </div>
              {!readOnly && (
               <button
                 onClick={() => setActiveTab('attainment')}
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
               >
                 Upload Student Marks <ArrowRight className="w-4 h-4" />
               </button>
             )}
            </div>
          );
        }

        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b dark:border-slate-850 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Phase 5: Assessment Marks</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assessment components, student rosters, and question targets</p>
              </div>
             {!readOnly && (
               <button
                 onClick={() => setActiveTab('attainment')}
                 className="mt-3 md:mt-0 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-bold"
               >
                 Re-upload / Change Marks <ChevronRight className="w-4 h-4" />
               </button>
             )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Assessments Overview */}
              <div className="lg:col-span-1 space-y-4">
                <div className="glass-panel p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450">Assessment Structures</h4>
                  <div className="space-y-3 pt-1">
                    {rosterSummary.map((ros, idx) => (
                      <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border dark:border-slate-850 rounded-xl space-y-2 text-xs">
                        <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                          <span>{ros.type}</span>
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] rounded-full">
                            {ros.count} Students
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Max Marks per CO</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {Object.entries(ros.max || {}).map(([co, max]) => (
                              <span key={co} className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded font-semibold">
                                {co}: {max}m
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Roster preview */}
              <div className="lg:col-span-2 glass-panel p-5 space-y-4 overflow-x-auto">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450">
                  Student Marks Roster (Preview - First 10 Rows)
                </h4>
                
                <div className="min-w-[450px]">
                  <table className="w-full text-center text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-450 border-b dark:border-slate-850 font-bold uppercase tracking-wider">
                        <th className="p-2.5 text-left pl-2">Roll No</th>
                        {Object.keys(previewMaxMarks).map(coId => (
                          <th key={coId} className="p-2.5">{coId}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Max marks row */}
                      <tr className="bg-slate-100/50 dark:bg-slate-900/20 text-slate-850 dark:text-slate-200 font-bold border-b border-dashed dark:border-slate-800">
                        <td className="py-2 text-left pl-2 italic">MAX MARKS</td>
                        {Object.keys(previewMaxMarks).map(coId => (
                          <td key={coId} className="py-2">{previewMaxMarks[coId]}</td>
                        ))}
                      </tr>
                      {/* Preview students */}
                      {previewStudents.map((stud, idx) => (
                        <tr key={idx} className="hover:bg-slate-500/5 border-b dark:border-slate-850 last:border-0">
                          <td className="py-2.5 text-left pl-2 font-mono text-slate-500">{stud.roll_no}</td>
                          {Object.keys(previewMaxMarks).map(coId => {
                            const val = stud.marks?.[coId] ?? '—';
                            return (
                              <td key={coId} className="py-2.5 text-slate-700 dark:text-slate-300">
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );

      // ──────────────────────────────────────────────────────────────────────────
      // PHASE 6: ATTAINMENT ANALYTICS & CHARTS
      // ──────────────────────────────────────────────────────────────────────────
      case 6:
        if (!courseState?.co_attainment || courseState.co_attainment.length === 0) {
          return (
            <div className="glass-panel p-8 text-center space-y-4 animate-fadeIn">
              <ShieldAlert className="w-12 h-12 text-emerald-500 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Attainment Analytics Missing</h4>
                <p className="text-xs text-slate-455 mt-1 max-w-md mx-auto">
                  Student marks must be uploaded and direct attainment level calculations executed to render charts.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('attainment')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
              >
                Compute Attainments <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b dark:border-slate-850 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Phase 6: Attainment Analytics</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Direct Course Outcome achievement and weighted Program Outcomes contribution</p>
              </div>
             {!readOnly && (
               <button
                 onClick={() => setActiveTab('attainment')}
                 className="mt-3 md:mt-0 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-bold"
               >
                 Recalculate <ChevronRight className="w-4 h-4" />
               </button>
             )}
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CO Attainments Bar Chart */}
              <div className="glass-panel p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450">CO Average Achievement Score %</h4>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#0f172a', 
                          borderColor: '#1e293b', 
                          borderRadius: '8px', 
                          color: '#f8fafc',
                          fontSize: '11px' 
                        }} 
                      />
                      <Bar dataKey="Average %" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* PO Weighted Attainments Bar Chart */}
              <div className="glass-panel p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450">PO Weighted Attainment Indexes (0–3.0)</h4>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={poChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 3.0]} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          background: '#0f172a', 
                          borderColor: '#1e293b', 
                          borderRadius: '8px', 
                          color: '#f8fafc',
                          fontSize: '11px' 
                        }} 
                      />
                      <ReferenceLine y={1.5} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Weakness (1.5)', fill: '#f43f5e', fontSize: 8, position: 'top' }} />
                      <Bar dataKey="Weighted Score" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Direct Attainment grid */}
            <div className="glass-panel p-5 space-y-4 overflow-x-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450">Outcomes Attainment Level Breakdown</h4>
              <div className="min-w-[500px]">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-450 border-b dark:border-slate-850 font-bold uppercase tracking-wider">
                      <th className="p-2.5 pl-2 text-left">Outcome ID</th>
                      <th className="p-2.5">Target Threshold %</th>
                      <th className="p-2.5">IA Score %</th>
                      <th className="p-2.5">MSE Score %</th>
                      <th className="p-2.5">ESE Score %</th>
                      <th className="p-2.5">Average Score %</th>
                      <th className="p-2.5 pr-2">Accreditation Attainment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedCoAttainments.map(co => (
                      <tr key={co.co_id} className="hover:bg-slate-500/5 border-b dark:border-slate-850 last:border-0 transition-colors">
                        <td className="py-2.5 pl-2 font-bold text-left">{co.co_id}</td>
                        <td className="py-2.5 text-slate-500 font-semibold">{courseState.level1_threshold || 60}%</td>
                        <td className="py-2.5 text-slate-650 dark:text-slate-350">{co.iaScore ? co.iaScore.toFixed(1) : '—'}%</td>
                        <td className="py-2.5 text-slate-650 dark:text-slate-350">{co.mseScore ? co.mseScore.toFixed(1) : '—'}%</td>
                        <td className="py-2.5 text-slate-650 dark:text-slate-350">{co.eseScore ? co.eseScore.toFixed(1) : '—'}%</td>
                        <td className="py-2.5 font-bold text-slate-850 dark:text-slate-200">{co.overallPercentage.toFixed(1)}%</td>
                        <td className="py-2.5 pr-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getAttainmentBadge(co.overallAttainmentLevel)}`}>
                            Level {co.overallAttainmentLevel.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      // ──────────────────────────────────────────────────────────────────────────
      // PHASE 7: DOSSIER DOWNLOADS & AGENT LOGS
      // ──────────────────────────────────────────────────────────────────────────
      case 7:
        const hasOutcomes = courseState?.cos && courseState.cos.length > 0;
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b dark:border-slate-850 pb-4">
              <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">Phase 7: Reports & Execution Trace</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Accreditation downloads and real-time agent execution traces</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Report download cards */}
              <div className="lg:col-span-1 space-y-4">
                <div className="glass-panel p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450">NBA Dossier Downloads</h4>
                  
                  <div className="space-y-3">
                    <button
                      onClick={downloadPDF}
                      disabled={downloadingPDF || !hasOutcomes}
                      className="w-full p-4 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold rounded-xl flex items-center justify-between shadow-sm disabled:opacity-40 transition-all text-xs"
                    >
                      <span className="flex items-center gap-2">
                        {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-rose-500" />}
                        Accreditation Dossier (PDF)
                      </span>
                      <Download className="w-4 h-4 text-slate-400" />
                    </button>

                    <button
                      onClick={downloadExcel}
                      disabled={downloadingExcel || !hasOutcomes}
                      className="w-full p-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-between shadow-sm disabled:opacity-40 transition-all text-xs"
                    >
                      <span className="flex items-center gap-2">
                        {downloadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-white" />}
                        Attainment Sheets (Excel)
                      </span>
                      <Download className="w-4 h-4 text-emerald-200" />
                    </button>
                  </div>
                  
                  {!hasOutcomes && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Report generation requires finalized Course Outcomes (Phase 3) to compile. Please finalize setup steps.
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Recommendations list */}
                <div className="glass-panel p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> AI Curriculum Plans
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {(courseState?.recommendations || []).map((rec, i) => {
                      const priority = rec.priority || 'Low';
                      const color = priority.toLowerCase() === 'high' ? 'border-rose-500/30 bg-rose-500/[0.02] text-rose-600 dark:text-rose-400' :
                                    priority.toLowerCase() === 'medium' ? 'border-amber-500/30 bg-amber-500/[0.02] text-amber-600 dark:text-amber-400' :
                                    'border-blue-500/30 bg-blue-500/[0.02] text-blue-600 dark:text-blue-400';
                      return (
                        <div key={i} className={`p-3 border rounded-xl space-y-1 ${color} text-xs`}>
                          <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider">
                            <span>Target: {rec.target}</span>
                            <span>{priority} Priority</span>
                          </div>
                          <p className="font-semibold leading-relaxed">{rec.suggestion}</p>
                        </div>
                      );
                    })}
                    {(courseState?.recommendations || []).length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-6">No recommendations calculated.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Execution Trace */}
              <div className="lg:col-span-2 glass-panel p-5 space-y-3 flex flex-col">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-blue-500" /> Multi-Agent Execution Trace Log
                </h4>
                <div className="flex-1 p-4 bg-slate-950 border border-slate-900 rounded-xl font-mono text-[11px] leading-relaxed text-slate-350 overflow-y-auto h-[400px]">
                  <p className="text-blue-400 font-bold mb-1">=== Log Viewer Active ===</p>
                  {(courseState?.audit_trail || []).slice().reverse().map((log, i) => (
                    <div key={i} className="py-1 border-b border-slate-900 last:border-0">
                      <div className="flex justify-between items-center text-[9px] text-slate-500 mb-0.5">
                        <span className="font-bold text-blue-500 uppercase">{log.agent || 'System'} · {log.action || 'LOG'}</span>
                        <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
                      </div>
                      <p className="text-slate-300 font-semibold">{log.detail}</p>
                    </div>
                  ))}
                  {(courseState?.audit_trail || []).length === 0 && (
                    <p className="text-slate-500 italic py-8 text-center">No trace files recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Subject Information header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{activeSubjectId}</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/15 animate-pulse">
              {courseState?.year || 'SY'} · {courseState?.semester || 'Semester 3'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {courseState?.department || 'Department of Computer Engineering'}
          </p>
        </div>
        
         {/* Quick config link */}
        {!readOnly && (
          <button
            onClick={() => setActiveTab('setup')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-bold text-slate-750 dark:text-slate-200 rounded-xl transition-all border dark:border-slate-800 shadow-sm"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Setup Settings
          </button>
        )}
      </div>

      {/* Main pipeline visualization container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Visual Pipeline Stepper */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">OBE Accreditation Pipeline</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Follow and inspect each stage's inputs and outputs</p>
            </div>
            
            <div className="space-y-2">
              {steps.map((st) => {
                const Icon = st.icon;
                const status = getStepStatus(st.id);
                const isActive = activeStep === st.id;
                
                return (
                  <button
                    key={st.id}
                    onClick={() => setActiveStep(st.id)}
                    className={`w-full flex items-start text-left p-3 rounded-xl border transition-all duration-200 relative group cursor-pointer ${
                      isActive 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/15'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850/50 border-slate-100 dark:border-slate-850 text-slate-700 dark:text-slate-350'
                    }`}
                  >
                    {/* Visual Status Indicator Icon */}
                    <div className="mr-3 mt-0.5 shrink-0">
                      {status === 'completed' ? (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive ? 'bg-white text-blue-600' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        }`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : status === 'incomplete' ? (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive ? 'bg-white text-blue-600' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive ? 'bg-white text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-750'
                        }`}>
                          {st.id}
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                          {st.phase}
                        </span>
                        {/* Status Label badge */}
                        <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15'
                        }`}>
                          {status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold truncate pr-2">{st.name}</h4>
                      <p className={`text-[10px] truncate ${isActive ? 'text-blue-100/70' : 'text-slate-450 dark:text-slate-500'}`}>
                        {st.desc}
                      </p>
                    </div>

                    {/* Left border active highlight indicator */}
                    {isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-l-md" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Display details for selected active step */}
        <div className="lg:col-span-8">
          <div className="glass-panel p-6 min-h-[550px] flex flex-col">
            {renderPhaseDetails()}
          </div>
        </div>

      </div>

    </div>
  );
}
