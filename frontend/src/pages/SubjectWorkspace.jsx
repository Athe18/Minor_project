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
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Loader2, 
  Save, 
  RefreshCw, 
  Edit3, 
  ArrowRight, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Check, 
  Settings, 
  Sparkles, 
  AlertCircle, 
  Info,
  ChevronRight,
  BookOpen,
  TrendingUp,
  FileQuestion
} from 'lucide-react';
import { 
  courseAPI, 
  subjectAPI, 
  coAPI, 
  mappingAPI, 
  philosophyAPI, 
  reportAPI,
  assignmentAPI
} from '../api';

export default function SubjectWorkspace({ activeSubjectId, refreshAllState }) {
  const [courseState, setCourseState] = useState(null);
  const [loadingState, setLoadingState] = useState(true);
  const [error, setError] = useState('');
  
  // Phase Tab state
  const [activePhase, setActivePhase] = useState(1); // 1 = Phase 1 (Syllabus/CO/Mapping), 2 = Phase 2 (Marks/Attainment/Report)
  const [p1Tab, setP1Tab] = useState('cos'); // 'cos', 'matrix', 'philosophy'
  const [p2Tab, setP2Tab] = useState('attainments'); // 'attainments', 'roster', 'recommendations'
  
  // Setup fields state
  const [year, setYear] = useState('SY');
  const [lvl1, setLvl1] = useState(60);
  const [lvl2, setLvl2] = useState(65);
  const [lvl3, setLvl3] = useState(70);
  const [showThresholds, setShowThresholds] = useState(false);
  const [syllabusFile, setSyllabusFile] = useState(null);
  
  // Pipeline loading state & active milestone
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [activeMilestone, setActiveMilestone] = useState(0);
  
  // Phase 1 Milestones
  const p1Milestones = [
    "Initializing course benchmarks and settings...",
    "Extracting syllabus curriculum nodes...",
    "AI Bloom's taxonomy outcomes generator running...",
    "Loading Program Outcomes dictionary...",
    "Mapping CO-PO matrix correlations...",
    "Drafting teaching philosophy methodology...",
    "Running multi-agent sanity audits..."
  ];

  // Phase 2 Milestones
  const p2Milestones = [
    "Uploading student score spreadsheet...",
    "Extracting academic maximum marks row...",
    "Processing student cohort scores...",
    "Calculating direct Course Outcome (CO) attainment indexes...",
    "Evolving Program Outcome (PO) mapping metrics...",
    "Running evaluation checks...",
    "Synthesizing curriculum adjustment recommendations..."
  ];

  // Editing state for COs
  const [editCoIndex, setEditCoIndex] = useState(null);
  const [editCoText, setEditCoText] = useState('');
  const [editCoLevel, setEditCoLevel] = useState(3);
  const [editCoKeyword, setEditCoKeyword] = useState('');
  const [savingCos, setSavingCos] = useState(false);
  
  // Regenerate COs State
  const [feedback, setFeedback] = useState('');
  const [numCos, setNumCos] = useState(6);
  const [regeneratingCos, setRegeneratingCos] = useState(false);

  // Editing state for mapping cells
  const [localMappings, setLocalMappings] = useState([]);
  const [selectedMappingCell, setSelectedMappingCell] = useState(null);
  const [savingMatrix, setSavingMatrix] = useState(false);

  // PI Mapping State
  const [localPiMappings, setLocalPiMappings] = useState([]);
  const [selectedPiCell, setSelectedPiCell] = useState(null);
  const [loadingPiSuggestion, setLoadingPiSuggestion] = useState(false);
  const [piSuggestion, setPiSuggestion] = useState('');
  
  const [expandedPos, setExpandedPos] = useState({});
  
  const toggleExpandPo = (poId) => {
    setExpandedPos(prev => ({
      ...prev,
      [poId]: prev[poId] === false ? true : false
    }));
  };
  
  // Teaching philosophy editing state
  const [philText, setPhilText] = useState('');
  const [savingPhil, setSavingPhil] = useState(false);
  const [generatingPhil, setGeneratingPhil] = useState(false);
  
  // Phase 2 Marks upload file
  const [marksFile, setMarksFile] = useState(null);
  const [marksSubmitting, setMarksSubmitting] = useState(false);
  
  // Report downloads state
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  
  // Assignment Generator states
  const [assignDifficulty, setAssignDifficulty] = useState('Medium');
  const [assignType, setAssignType] = useState('Theory');
  const [assignQCount, setAssignQCount] = useState(3);
  const [assignAnswerKey, setAssignAnswerKey] = useState(false);
  const [assignRubric, setAssignRubric] = useState(false);
  const [generatingAssignment, setGeneratingAssignment] = useState(false);
  const [downloadingAssignmentPDF, setDownloadingAssignmentPDF] = useState(false);

  // Component checkboxes checklist for attainment matrix
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

  const getAttainmentLevelBadge = (level) => {
    if (level === 3) return <span className="badge-green">Level 3</span>;
    if (level === 2) return <span className="badge-blue">Level 2</span>;
    if (level === 1) return <span className="badge-orange">Level 1</span>;
    return <span className="badge-red">Not Achieved</span>;
  };

  const fetchSubjectData = async () => {
    if (!activeSubjectId) return;
    setLoadingState(true);
    setError('');
    try {
      const response = await courseAPI.getState();
      if (response && response.data) {
        setCourseState(response.data);
        
        // Auto presets if syllabus is already parsed
        if (response.data.year) {
          setYear(response.data.year);
          setLvl1(response.data.level1_threshold || 55);
          setLvl2(response.data.level2_threshold || 65);
          setLvl3(response.data.level3_threshold || 75);
        }
        
        if (response.data.mappings) {
          setLocalMappings(response.data.mappings);
        }
        if (response.data.pi_mappings) {
          setLocalPiMappings(response.data.pi_mappings);
        }
        
        if (response.data.teaching_philosophy) {
          setPhilText(response.data.teaching_philosophy);
        }

        // Automatically advance to Phase 2 if Phase 1 has already been run
        if (response.data.cos?.length > 0 && response.data.mappings?.length > 0) {
          setActivePhase(2);
        } else {
          setActivePhase(1);
        }
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
    // Default tabs
    setP1Tab('cos');
    setP2Tab('attainments');
  }, [activeSubjectId]);

  const handleYearChange = (selectedYear) => {
    setYear(selectedYear);
    if (selectedYear === 'FY') {
      setLvl1(50); setLvl2(55); setLvl3(60);
    } else if (selectedYear === 'SY') {
      setLvl1(60); setLvl2(65); setLvl3(70);
    } else if (selectedYear === 'TY') {
      setLvl1(65); setLvl2(75); setLvl3(80);
    } else {
      setLvl1(55); setLvl2(65); setLvl3(75);
    }
  };

  const handleRunPhase1 = async (e) => {
    e.preventDefault();
    if (!syllabusFile) {
      alert("Please upload a syllabus file to begin parsing!");
      return;
    }
    
    setPipelineRunning(true);
    setActiveMilestone(0);
    setError('');

    // Animate milestones
    const interval = setInterval(() => {
      setActiveMilestone(prev => (prev < p1Milestones.length - 1 ? prev + 1 : prev));
    }, 1500);

    const formData = new FormData();
    formData.append('subject_name', activeSubjectId);
    formData.append('year', year);
    formData.append('level1_threshold', lvl1);
    formData.append('level2_threshold', lvl2);
    formData.append('level3_threshold', lvl3);
    formData.append('syllabus_file', syllabusFile);
    formData.append('num_cos', numCos);

    try {
      const res = await subjectAPI.runPhase1(formData);
      if (res.data.success) {
        clearInterval(interval);
        setActiveMilestone(p1Milestones.length);
        setTimeout(async () => {
          setPipelineRunning(false);
          await fetchSubjectData();
          if (refreshAllState) refreshAllState();
        }, 800);
      }
    } catch (err) {
      clearInterval(interval);
      setPipelineRunning(false);
      setError(err.response?.data?.detail || 'An error occurred during Phase 1 execution.');
    }
  };

  const handleRunPhase2 = async (e) => {
    e.preventDefault();
    if (!marksFile) {
      alert("Please upload a marks CSV file!");
      return;
    }
    
    setPipelineRunning(true);
    setActiveMilestone(0);
    setError('');

    // Animate milestones
    const interval = setInterval(() => {
      setActiveMilestone(prev => (prev < p2Milestones.length - 1 ? prev + 1 : prev));
    }, 1400);

    try {
      const res = await subjectAPI.runPhase2(marksFile);
      if (res.data.success) {
        clearInterval(interval);
        setActiveMilestone(p2Milestones.length);
        setTimeout(async () => {
          setPipelineRunning(false);
          await fetchSubjectData();
          if (refreshAllState) refreshAllState();
        }, 800);
      }
    } catch (err) {
      clearInterval(interval);
      setPipelineRunning(false);
      setError(err.response?.data?.detail || 'An error occurred during attainment calculation.');
    }
  };

  // COs actions
  const handleStartCoEdit = (index, co) => {
    setEditCoIndex(index);
    setEditCoText(co.statement);
    setEditCoLevel(co.blooms_level);
    setEditCoKeyword(co.blooms_keyword);
  };

  const handleSaveCoEdit = async (index) => {
    setSavingCos(true);
    const updated = [...(courseState.cos || [])];
    updated[index] = {
      ...updated[index],
      statement: editCoText,
      blooms_level: parseInt(editCoLevel),
      blooms_keyword: editCoKeyword
    };
    
    try {
      const res = await coAPI.update(updated);
      if (res.data.success) {
        setEditCoIndex(null);
        await fetchSubjectData();
      }
    } catch (err) {
      alert("Failed to save Course Outcome.");
    } finally {
      setSavingCos(false);
    }
  };

  const handleRegenerateCos = async () => {
    if (!feedback.trim()) return;
    setRegeneratingCos(true);
    try {
      const res = await coAPI.regenerate(feedback, numCos);
      setFeedback('');
      await fetchSubjectData();
    } catch (err) {
      alert("Failed to regenerate Course Outcomes.");
    } finally {
      setRegeneratingCos(false);
    }
  };

  const handleApproveCos = async () => {
    try {
      await coAPI.approve();
      alert("Course outcomes finalized and approved.");
      await fetchSubjectData();
    } catch (err) {
      alert("Failed to approve Course Outcomes.");
    }
  };

  // Helper to recalculate PO-CO strengths based on PI mappings in local memory
  const recalculateStrengths = (updatedPiMappings) => {
    const newMappings = [];
    const posList = courseState?.pos || Array.from({ length: 12 }, (_, i) => ({ po_id: `PO${i + 1}` }));
    const cosList = courseState?.cos || [];
    const pisList = courseState?.performance_indicators || [];
    
    posList.forEach(po => {
      const poId = po.po_id;
      const poPIs = pisList.filter(pi => pi.po_id === poId);
      const totalPIs = poPIs.length;
      
      cosList.forEach(co => {
        if (totalPIs === 0) {
          newMappings.push({ co_id: co.co_id, po_id: poId, strength: 0, reasoning: "No indicators defined." });
          return;
        }
        
        const mappedCount = poPIs.filter(pi => {
          const m = updatedPiMappings.find(x => x.co_id === co.co_id && x.pi_id === pi.pi_id);
          return m && m.mapped === 'Y';
        }).length;
        
        const percentage = (mappedCount / totalPIs) * 100;
        let strength = 0;
        if (percentage >= 67) strength = 3;
        else if (percentage >= 34) strength = 2;
        else if (percentage >= 1) strength = 1;
        
        newMappings.push({
          co_id: co.co_id,
          po_id: poId,
          strength: strength,
          reasoning: `Calculated from ${mappedCount}/${totalPIs} mapped indicators.`
        });
      });
    });
    return newMappings;
  };

  // Matrix mappings actions
  const handlePiCellClick = (co_id, pi_id) => {
    const existing = localPiMappings.find(m => m.co_id === co_id && m.pi_id === pi_id) || {
      co_id,
      pi_id,
      mapped: 'N',
      reasoning: 'No linkage rationale configured.',
      suggestion: 'To map, add activities testing this PI.'
    };
    setSelectedPiCell(existing);
    setPiSuggestion('');
  };

  const handlePiCellToggle = (co_id, pi_id) => {
    let updated = [...localPiMappings];
    const idx = updated.findIndex(m => m.co_id === co_id && m.pi_id === pi_id);
    const isCurrentlyMapped = idx >= 0 && updated[idx].mapped === 'Y';
    const newMapped = isCurrentlyMapped ? 'N' : 'Y';
    
    if (idx >= 0) {
      updated[idx] = {
        ...updated[idx],
        mapped: newMapped,
        reasoning: newMapped === 'Y' ? (updated[idx].reasoning || 'Manually mapped alignment.') : '',
        suggestion: newMapped === 'N' ? (updated[idx].suggestion || 'To map this, incorporate topics addressing this indicator.') : ''
      };
    } else {
      updated.push({
        co_id,
        pi_id,
        mapped: newMapped,
        reasoning: newMapped === 'Y' ? 'Manually mapped alignment.' : '',
        suggestion: newMapped === 'N' ? 'To map this, incorporate topics addressing this indicator.' : ''
      });
    }
    
    setLocalPiMappings(updated);
    
    // Update selected cell details
    const matched = updated.find(m => m.co_id === co_id && m.pi_id === pi_id);
    setSelectedPiCell(matched);
    
    // Recalculate strengths in UI instantly
    const recalculated = recalculateStrengths(updated);
    setCourseState(prev => ({
      ...prev,
      mappings: recalculated
    }));
  };

  const handleSaveMatrix = async () => {
    setSavingMatrix(true);
    try {
      const res = await mappingAPI.updatePI(localPiMappings);
      if (res.data.success) {
        alert("PI Competency Mapping Matrix updated and strengths calculated successfully!");
        await fetchSubjectData();
      }
    } catch (err) {
      alert("Failed to save mapping adjustments.");
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleGenerate = async () => {
    setPipelineRunning(true);
    setActiveMilestone(4); // Milestone "Mapping CO-PO matrix correlations..."
    try {
      const response = await mappingAPI.generatePI();
      if (response.data.success) {
        setLocalPiMappings(response.data.pi_mappings);
        setCourseState(prev => ({
          ...prev,
          mappings: response.data.mappings,
          pi_mappings: response.data.pi_mappings
        }));
        alert("AI Competency mapping generated successfully!");
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to auto-map COs to PIs.");
    } finally {
      setPipelineRunning(false);
    }
  };

  const fetchPiSuggestion = async () => {
    if (!selectedPiCell) return;
    setLoadingPiSuggestion(true);
    setPiSuggestion('');
    try {
      const response = await mappingAPI.suggestPIMapping(selectedPiCell.co_id, selectedPiCell.pi_id);
      setPiSuggestion(response.data.suggestion);
    } catch (err) {
      alert("Failed to generate AI mapping suggestion.");
    } finally {
      setLoadingPiSuggestion(false);
    }
  };

  const getMappingStrength = (co_id, po_id) => {
    const found = localMappings.find(m => m.co_id === co_id && m.po_id === po_id);
    return found ? found.strength : 0;
  };

  const getStrengthBg = (strength) => {
    if (strength === 3) return 'bg-indigo-600 text-white font-bold cursor-pointer transition-all hover:opacity-90';
    if (strength === 2) return 'bg-indigo-400 text-white font-semibold cursor-pointer transition-all hover:opacity-90';
    if (strength === 1) return 'bg-indigo-200 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium cursor-pointer transition-all hover:opacity-90';
    return 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700';
  };

  // Teaching Philosophy saving
  const handleSavePhilosophy = async () => {
    setSavingPhil(true);
    try {
      // Direct state mutate (teaching philosophy is saved on backend subject state via mutate calls)
      courseState.teaching_philosophy = philText;
      await subjectAPI.setActive(activeSubjectId); // forces update of session
      alert("Teaching philosophy saved successfully.");
      await fetchSubjectData();
    } catch (err) {
      alert("Failed to save philosophy adjustments.");
    } finally {
      setSavingPhil(false);
    }
  };

  const handleGeneratePhilosophy = async () => {
    setGeneratingPhil(true);
    try {
      const res = await philosophyAPI.generate();
      setPhilText(res.data.philosophy);
      await fetchSubjectData();
    } catch (err) {
      alert("Failed to regenerate teaching philosophy.");
    } finally {
      setGeneratingPhil(false);
    }
  };

  // Downloads
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

  const handleGenerateAssignment = async () => {
    setGeneratingAssignment(true);
    setError('');
    try {
      const payload = {
        difficulty: assignDifficulty,
        assignment_type: assignType,
        num_questions_per_co: assignQCount,
        generate_answer_key: assignAnswerKey,
        generate_rubric: assignRubric
      };
      await assignmentAPI.generate(payload);
      await fetchSubjectData();
      if (refreshAllState) refreshAllState();
      alert("Assignment generated successfully!");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to generate assignment.');
    } finally {
      setGeneratingAssignment(false);
    }
  };

  const handleDownloadAssignmentPDF = async () => {
    setDownloadingAssignmentPDF(true);
    try {
      const response = await assignmentAPI.downloadPDF();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeSubjectId.replace(/\s+/g, '_')}_Assignment.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download assignment PDF.');
    } finally {
      setDownloadingAssignmentPDF(false);
    }
  };

  // Determine stage flags
  const hasSyllabus = !!courseState?.syllabus_text;
  const hasCOs = (courseState?.cos || []).length > 0;
  const hasMappings = (courseState?.mappings || []).length > 0;
  const hasAttainment = (courseState?.co_attainment || []).length > 0;
  const allCosApproved = React.useMemo(() => {
    return (courseState?.cos || []).length > 0 && (courseState?.cos || []).every(co => co.validation_status === 'approved');
  }, [courseState?.cos]);

  // Helper for dynamic attainment calculations
  const lvl1Val = courseState?.level1_threshold || lvl1 || 55;
  const lvl2Val = courseState?.level2_threshold || lvl2 || 65;
  const lvl3Val = courseState?.level3_threshold || lvl3 || 75;

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
      if (!att) return null;
      const checks = checkedComponents[att.co_id] || { IA: true, MSE: true, CIE: true, ESE: true };
      
      const iaMax = 30;
      const mseMax = 20;
      const eseMaxVal = 50;

      const avgPct = parseFloat(att.avg_percentage) || 0;

      // Simulated raw scores
      const iaScore = checks.IA ? (avgPct * iaMax / 100) : 0;
      const mseScore = checks.MSE ? (avgPct * mseMax / 100) : 0;
      const cieScore = checks.CIE ? (iaScore + mseScore) : 0;
      
      const currentCieMax = (checks.IA ? iaMax : 0) + (checks.MSE ? mseMax : 0);
      const ciePercentage = currentCieMax > 0 ? (cieScore / currentCieMax * 100) : 0;

      const eseScore = checks.ESE ? (avgPct * eseMaxVal / 100) : 0;
      const currentEseMax = checks.ESE ? eseMaxVal : 0;
      const esePercentage = currentEseMax > 0 ? (eseScore / currentEseMax * 100) : 0;

      const getLevel = (pct) => {
        if (isNaN(pct)) return 0;
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
    }).filter(Boolean);
  }, [courseState?.co_attainment, checkedComponents, lvl1Val, lvl2Val, lvl3Val]);

  const computedPoAttainments = React.useMemo(() => {
    const mappings = courseState?.mappings || [];
    const pos = courseState?.pos || Array.from({ length: 12 }, (_, i) => ({ po_id: `PO${i + 1}`, statement: `Program Outcome ${i + 1}` }));

    return pos.map(po => {
      if (!po) return null;
      const poMappings = mappings.filter(m => m && m.po_id === po.po_id && parseFloat(m.strength) > 0);
      
      if (poMappings.length === 0) {
        return {
          po_id: po.po_id,
          weighted_attainment: 0.0,
          contributing_cos: [],
          is_weak: true,
          weakness_reason: "No CO maps to this PO"
        };
      }

      let numerator = 0.0;
      let denominator = 0.0;
      const contributing = [];

      poMappings.forEach(mapping => {
        if (!mapping) return;
        const co_att = computedCoAttainments.find(a => a && a.co_id === mapping.co_id);
        if (co_att) {
          const strength = parseFloat(mapping.strength) || 0;
          const level = parseFloat(co_att.overallAttainmentLevel) || 0;
          numerator += level * strength;
          denominator += strength;
          contributing.push(mapping.co_id);
        }
      });

      const weighted = denominator > 0 ? Math.round((numerator / denominator) * 1000) / 1000 : 0.0;
      const is_weak = weighted < 1.5;

      return {
        po_id: po.po_id,
        weighted_attainment: isNaN(weighted) ? 0.0 : weighted,
        contributing_cos: contributing,
        is_weak,
        weakness_reason: is_weak ? "Weighted attainment below 1.5" : null
      };
    }).filter(Boolean);
  }, [courseState?.mappings, courseState?.pos, computedCoAttainments]);

  // Chart Mappings
  const coChartData = computedCoAttainments.map(co => {
    if (!co) return null;
    const overallPct = parseFloat(co.overallPercentage);
    const validPct = isNaN(overallPct) ? 0 : Math.round(overallPct * 100) / 100;
    const achievedLvl = parseFloat(co.overallAttainmentLevel) || 0;
    return {
      name: co.co_id || '',
      'Average %': validPct,
      'Achieved Level': achievedLvl * 25 // Scaled representation (L1=25, L2=50, L3=75)
    };
  }).filter(Boolean);

  const poChartData = computedPoAttainments.map(po => {
    if (!po) return null;
    const weightedScore = parseFloat(po.weighted_attainment);
    const validScore = isNaN(weightedScore) ? 0.0 : weightedScore;
    return {
      name: po.po_id || '',
      'Weighted Score': validScore
    };
  }).filter(Boolean);

  if (!activeSubjectId) {
    return (
      <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-4 my-12">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold">No Subject Selected</h3>
          <p className="text-sm text-slate-455 mt-1">
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Subject Information banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{activeSubjectId}</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-500 rounded border border-blue-500/20">
              Year Level: {year}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Course threshold benchmarks: Level 1 = <strong className="text-blue-500">{lvl1}%</strong>, Level 2 = <strong className="text-blue-500">{lvl2}%</strong>, Level 3 = <strong className="text-blue-500">{lvl3}%</strong>
          </p>
        </div>
        
        {/* Phase Toggle switch */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActivePhase(1)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activePhase === 1 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Phase 1: Syllabus to Matrix
          </button>
          
          <button
            onClick={() => setActivePhase(2)}
            disabled={!hasCOs}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
              activePhase === 2 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Phase 2: Marks to Attainment
          </button>
        </div>
      </div>

      {/* Pipeline Loader overlay */}
      {pipelineRunning && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="glass-panel max-w-lg w-full p-6 space-y-6 bg-slate-900 border-slate-800 text-slate-100">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <h3 className="font-bold text-lg">Running OBE Agentic Pipeline...</h3>
            </div>
            
            <p className="text-xs text-slate-400">
              Multiple specialized AI agents are cooperating in the background to execute and validate calculations.
            </p>
            
            <div className="space-y-3.5 border-t border-slate-800 pt-4">
              {(activePhase === 1 ? p1Milestones : p2Milestones).map((milestone, idx) => {
                const isDone = idx < activeMilestone;
                const isCurrent = idx === activeMilestone;
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    {isDone ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center shrink-0 border border-slate-700">
                        {idx + 1}
                      </div>
                    )}
                    <span className={isCurrent ? 'font-bold text-blue-400' : isDone ? 'text-slate-350' : 'text-slate-500'}>
                      {milestone}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 1 WORKSPACE */}
      {activePhase === 1 && (
        <div className="space-y-6">
          {!hasSyllabus ? (
            /* Syllabus upload and setup */
            <div className="glass-panel p-6 max-w-2xl mx-auto space-y-6">
              <div className="space-y-1">
                <h3 className="font-bold text-lg flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  Phase 1 Auto-Accreditation Wizard
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-455">
                  Generate Course Outcomes, align competence targets, map standard PO mappings, and formulate the teaching syllabus in one automated run.
                </p>
              </div>
              
              <form onSubmit={handleRunPhase1} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Year Level</label>
                    <select
                      value={year}
                      onChange={(e) => handleYearChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm focus:outline-none text-slate-800 dark:text-slate-100"
                    >
                      <option value="FY">First Year (FY)</option>
                      <option value="SY">Second Year (SY)</option>
                      <option value="TY">Third Year (TY)</option>
                      <option value="BTech">B.Tech (Final)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Desired CO Count</label>
                    <select
                      value={numCos}
                      onChange={(e) => setNumCos(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm focus:outline-none text-slate-800 dark:text-slate-100"
                    >
                      <option value={4}>4 Course Outcomes</option>
                      <option value={5}>5 Course Outcomes</option>
                      <option value={6}>6 Course Outcomes</option>
                      <option value={8}>8 Course Outcomes</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-850 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowThresholds(!showThresholds)}
                    className="text-xs text-blue-500 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    {showThresholds ? "Hide Attainment Thresholds" : "Customize Attainment Thresholds"}
                  </button>
                  
                  {showThresholds && (
                    <div className="grid grid-cols-3 gap-4 mt-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border dark:border-slate-850">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Level 1 (%)</label>
                        <input
                          type="number"
                          value={lvl1}
                          onChange={(e) => setLvl1(parseFloat(e.target.value))}
                          className="w-full px-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Level 2 (%)</label>
                        <input
                          type="number"
                          value={lvl2}
                          onChange={(e) => setLvl2(parseFloat(e.target.value))}
                          className="w-full px-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Level 3 (%)</label>
                        <input
                          type="number"
                          value={lvl3}
                          onChange={(e) => setLvl3(parseFloat(e.target.value))}
                          className="w-full px-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Syllabus File (PDF/TXT/DOCX)</label>
                  <div className="border-2 border-dashed border-slate-350 dark:border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-500/5 cursor-pointer relative group">
                    <input
                      type="file"
                      required
                      accept=".pdf,.txt,.docx"
                      onChange={(e) => setSyllabusFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto group-hover:text-blue-500 transition-colors" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                      {syllabusFile ? syllabusFile.name : "Drag & drop files or click to browse"}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1">Accepts syllabus reports up to 25MB</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/10 transition-all hover:translate-y-[-1px]"
                >
                  <Sparkles className="w-4 h-4" />
                  Run Phase 1 Auto-Pipeline
                </button>
              </form>
            </div>
          ) : (
            /* Phase 1 Output display panels */
            <div className="space-y-6">
              
              {/* Tab Navigation */}
              <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
                <button
                  onClick={() => setP1Tab('cos')}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    p1Tab === 'cos' 
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                      : 'border-transparent text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Course Outcomes (COs)
                </button>
                
                <button
                  onClick={() => setP1Tab('matrix')}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    p1Tab === 'matrix' 
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                      : 'border-transparent text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Competency Mapping Matrix
                </button>
                
                <button
                  onClick={() => setP1Tab('philosophy')}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    p1Tab === 'philosophy' 
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                      : 'border-transparent text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Teaching Philosophy
                </button>

                <button
                  onClick={() => setP1Tab('assignment')}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    p1Tab === 'assignment' 
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                      : 'border-transparent text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <FileQuestion className="w-4 h-4" />
                  Assignment Generator
                </button>
              </div>

              {/* COs VIEW */}
              {p1Tab === 'cos' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* CO Lists */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="glass-panel p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm uppercase tracking-wider">Generated Course Outcomes</h4>
                        <button
                          onClick={handleApproveCos}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-500/10"
                        >
                          Approve & Finalize COs
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(courseState?.cos || []).map((co, idx) => {
                          if (!co) return null;
                          const isEditing = editCoIndex === idx;
                          return (
                            <div key={co.co_id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border dark:border-slate-850 flex flex-col gap-3">
                              <div className="flex justify-between items-center">
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 font-bold text-[10px] rounded border border-blue-500/20">
                                  {co.co_id}
                                </span>
                                
                                <div className="flex gap-2">
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Bloom's Keyword: <strong className="text-slate-600 dark:text-slate-300">{co.blooms_keyword}</strong> (Level {co.blooms_level})
                                  </span>
                                  {co.validation_status === 'approved' && (
                                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                                      <CheckCircle2 className="w-3 h-3" /> Approved
                                    </span>
                                  )}
                                </div>
                              </div>

                              {isEditing ? (
                                <div className="space-y-3">
                                  <textarea
                                    value={editCoText}
                                    onChange={(e) => setEditCoText(e.target.value)}
                                    className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                                    rows={2}
                                  />
                                  <div className="flex gap-4">
                                    <div className="flex-1 space-y-1">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase">Blooms Keyword</label>
                                      <input
                                        type="text"
                                        value={editCoKeyword}
                                        onChange={(e) => setEditCoKeyword(e.target.value)}
                                        className="w-full px-2.5 py-1 text-xs rounded border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                      />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase">Blooms Level</label>
                                      <select
                                        value={editCoLevel}
                                        onChange={(e) => setEditCoLevel(parseInt(e.target.value))}
                                        className="w-full px-2 py-1 text-xs rounded border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                      >
                                        <option value={1}>L1 - Remember</option>
                                        <option value={2}>L2 - Understand</option>
                                        <option value={3}>L3 - Apply</option>
                                        <option value={4}>L4 - Analyze</option>
                                        <option value={5}>L5 - Evaluate</option>
                                        <option value={6}>L6 - Create</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => setEditCoIndex(null)}
                                      className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px]"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSaveCoEdit(idx)}
                                      disabled={savingCos}
                                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold"
                                    >
                                      {savingCos ? "Saving..." : "Save Changes"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-between items-start gap-4">
                                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-350">
                                    {co.statement}
                                  </p>
                                  <button
                                    onClick={() => handleStartCoEdit(idx, co)}
                                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-450 hover:text-blue-500"
                                    title="Edit Outcome"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Reflection / Regenerator Feedback */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="glass-panel p-5 space-y-4">
                      <h4 className="font-bold text-sm uppercase tracking-wider">Regenerate CO Outcomes</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        To fine-tune or improve outcomes, specify prompt adjustments. The validation agent will verify criteria before finalizing.
                      </p>
                      
                      <div className="space-y-3">
                        <textarea
                          placeholder="e.g. Focus more on web services in CO4 and integrate cloud databases in CO5."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="w-full p-3 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none"
                          rows={4}
                        />
                        
                        <button
                          onClick={handleRegenerateCos}
                          disabled={regeneratingCos || !feedback.trim()}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                        >
                          {regeneratingCos ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          AI Refine Outcomes
                        </button>
                      </div>
                    </div>
                    
                    {courseState?.co_validation_feedback && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Sanity Check Findings
                        </div>
                        <p className="leading-relaxed font-semibold">
                          {courseState.co_validation_feedback}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CO-PO COMPETENCY MATRIX VIEW */}
              {p1Tab === 'matrix' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
                  
                  {/* Grid Matrix Table */}
                  <div className="lg:col-span-3 space-y-4">
                    <div className="glass-panel p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm uppercase tracking-wider">PI-to-CO Competency Alignment Matrix</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={handleGenerate}
                            disabled={pipelineRunning}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg text-[11px] shadow-md transition-all duration-200"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Auto-Map with AI
                          </button>
                          <button
                            onClick={handleSaveMatrix}
                            disabled={savingMatrix}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-md shadow-emerald-500/10"
                          >
                            <Save className="w-3 h-3" />
                            {savingMatrix ? "Saving..." : "Save Matrix Changes"}
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-center text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-900 text-slate-450 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                              <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-left w-16">PO</th>
                              <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-left w-20">Competency</th>
                              <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-left min-w-[200px]">Performance Indicator (PI)</th>
                              {(courseState?.cos || []).map(co => (
                                <th key={co.co_id} className="p-3 border-r border-slate-200 dark:border-slate-800 w-16 font-bold" title={co.statement}>
                                  {co.co_id}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const posList = Array.from({ length: 12 }, (_, i) => `PO${i + 1}`);
                              const cosList = courseState?.cos || [];
                              const pisList = courseState?.performance_indicators || [];
                              
                              const rows = [];
                              
                              posList.forEach(poId => {
                                const poPIs = pisList.filter(pi => pi.po_id === poId);
                                const totalPIs = poPIs.length;
                                const isPoExpanded = expandedPos[poId] !== false;
                                
                                // Group PIs of this PO by competency_id
                                const compGroups = {};
                                poPIs.forEach(pi => {
                                  if (!compGroups[pi.competency_id]) {
                                    compGroups[pi.competency_id] = {
                                      id: pi.competency_id,
                                      statement: pi.competency_statement,
                                      pis: []
                                    };
                                  }
                                  compGroups[pi.competency_id].pis.push(pi);
                                });
                                
                                const comps = Object.values(compGroups);
                                
                                if (totalPIs === 0) {
                                  // Fallback if no PIs exist for this PO
                                  rows.push(
                                    <tr key={`${poId}-none`} className="border-b border-slate-200 dark:border-slate-800">
                                      <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-bold bg-slate-50 dark:bg-slate-900/40 text-left align-middle">{poId}</td>
                                      <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-left text-slate-400 italic" colSpan={2}>No performance indicators defined.</td>
                                      {cosList.map(co => (
                                        <td key={co.co_id} className="p-3 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/10 text-slate-400">-</td>
                                      ))}
                                    </tr>
                                  );
                                  return;
                                }
                                
                                if (!isPoExpanded) {
                                  const collapsedRow = (
                                    <tr key={`${poId}-collapsed`} className="bg-blue-500/5 dark:bg-blue-950/15 border-b border-slate-200 dark:border-slate-855 font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-500/5 transition-colors">
                                      <td className="p-3 border-r border-slate-200 dark:border-slate-850 text-center font-extrabold bg-slate-50 dark:bg-slate-900/40 w-16 select-none cursor-pointer" onClick={() => toggleExpandPo(poId)}>
                                        <span className="text-blue-500 mr-1">▶</span> {poId}
                                      </td>
                                      <td className="p-3 border-r border-slate-200 dark:border-slate-850 text-left text-slate-400 italic font-normal" colSpan={2}>
                                        Performance indicators collapsed ({totalPIs} indicators) - Click to expand
                                      </td>
                                      {cosList.map(co => {
                                        const poCoMapping = (courseState?.mappings || []).find(m => m.co_id === co.co_id && m.po_id === poId) || { strength: 0 };
                                        const strength = poCoMapping.strength;
                                        return (
                                          <td 
                                            key={co.co_id} 
                                            className={`p-3 border-r border-slate-200 dark:border-slate-850 text-[14px] font-extrabold ${
                                              strength === 3 
                                                ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' 
                                                : strength === 2 
                                                  ? 'bg-indigo-400/10 text-indigo-600 dark:text-indigo-400' 
                                                  : strength === 1 
                                                    ? 'bg-indigo-200/10 text-indigo-500 dark:text-indigo-400' 
                                                    : 'text-slate-400 dark:text-slate-600'
                                            }`}
                                          >
                                            {strength > 0 ? strength : '-'}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                  rows.push(collapsedRow);
                                  return;
                                }
                                
                                let poRendered = false;
                                
                                comps.forEach((comp, compIdx) => {
                                  let compRendered = false;
                                  
                                  comp.pis.forEach((pi, piIdx) => {
                                    rows.push(
                                      <tr key={pi.pi_id} className="hover:bg-slate-500/5 transition-colors border-b border-slate-200 dark:border-slate-800">
                                        {!poRendered && (
                                          <td 
                                            rowSpan={totalPIs + 1} 
                                            className="p-3 border-r border-slate-200 dark:border-slate-850 font-extrabold text-slate-800 dark:text-slate-100 bg-slate-50/80 dark:bg-slate-900/60 align-middle text-center w-16 select-none cursor-pointer"
                                            onClick={() => toggleExpandPo(poId)}
                                          >
                                            <span className="text-blue-500 block text-[9px] font-semibold">▼ Collapse</span>
                                            <span className="text-sm">{poId}</span>
                                          </td>
                                        )}
                                        {!compRendered && (
                                          <td 
                                            rowSpan={comp.pis.length} 
                                            className="p-3 border-r border-slate-200 dark:border-slate-850 text-slate-650 dark:text-slate-350 text-left font-semibold align-middle bg-slate-50/30 dark:bg-slate-900/20 w-24"
                                            title={comp.statement}
                                          >
                                            {comp.id}
                                          </td>
                                        )}
                                        <td className="p-3 border-r border-slate-200 dark:border-slate-850 text-left text-slate-655 dark:text-slate-300 w-80 font-medium whitespace-normal">
                                          <span className="font-bold text-blue-500 dark:text-blue-400 mr-1">{pi.pi_id}</span> {pi.pi_statement}
                                        </td>
                                        
                                        {cosList.map(co => {
                                          const mapping = localPiMappings.find(m => m.co_id === co.co_id && m.pi_id === pi.pi_id) || { mapped: 'N' };
                                          const isMapped = mapping.mapped === 'Y';
                                          const isSelected = selectedPiCell && selectedPiCell.co_id === co.co_id && selectedPiCell.pi_id === pi.pi_id;
                                          
                                          return (
                                            <td 
                                              key={co.co_id}
                                              onClick={() => handlePiCellClick(co.co_id, pi.pi_id)}
                                              onDoubleClick={() => handlePiCellToggle(co.co_id, pi.pi_id)}
                                              className={`p-2 border-r border-slate-200 dark:border-slate-850 text-[13px] font-bold select-none cursor-pointer transition-all ${
                                                isMapped 
                                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 font-extrabold' 
                                                  : 'bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900'
                                              } ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                                              title="Double-click to toggle mapped (Y/N)"
                                            >
                                              {isMapped ? 'Y' : 'N'}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                    
                                    compRendered = true;
                                    poRendered = true;
                                  });
                                });
                                
                                // Render summary strength row for this PO
                                const mappingStrengthRow = (
                                  <tr key={`${poId}-strength`} className="bg-blue-500/5 dark:bg-blue-950/15 border-b border-slate-200 dark:border-slate-850 font-bold text-slate-800 dark:text-slate-200">
                                    <td className="p-3 border-r border-slate-200 dark:border-slate-850 text-left font-bold text-blue-700 dark:text-blue-400" colSpan={2}>
                                      PO to CO Mapping for {poId}
                                    </td>
                                    {cosList.map(co => {
                                      const poCoMapping = (courseState?.mappings || []).find(m => m.co_id === co.co_id && m.po_id === poId) || { strength: 0 };
                                      const strength = poCoMapping.strength;
                                      return (
                                        <td 
                                          key={co.co_id} 
                                          className={`p-3 border-r border-slate-200 dark:border-slate-850 text-[14px] font-extrabold ${
                                            strength === 3 
                                              ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' 
                                              : strength === 2 
                                                ? 'bg-indigo-400/10 text-indigo-600 dark:text-indigo-400' 
                                                : strength === 1 
                                                  ? 'bg-indigo-200/10 text-indigo-500 dark:text-indigo-400' 
                                                  : 'text-slate-400 dark:text-slate-600'
                                          }`}
                                        >
                                          {strength > 0 ? strength : '-'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                                rows.push(mappingStrengthRow);
                              });
                              
                              return rows;
                            })()}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="text-[10px] text-slate-455 font-bold flex gap-4 mt-2">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500/20 border border-emerald-400 rounded" /> Y = Mapped</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-100 dark:bg-slate-900 border rounded" /> N = Unmapped</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500/20 rounded" /> Summary PO Strength: 1, 2, 3</span>
                      </div>
                    </div>
                  </div>
 
                  {/* Mapping Reasoning Detail panel */}
                  <div className="lg:col-span-1 space-y-4">
                    {selectedPiCell ? (
                      <div className="glass-panel p-5 space-y-4 border-l-4 border-l-blue-500 animate-fadeIn">
                        <div className="space-y-0.5 border-b border-slate-100 dark:border-slate-850 pb-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mapping Node Inspector</span>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                            {selectedPiCell.co_id} ➔ {selectedPiCell.pi_id}
                          </h4>
                        </div>
                        
                        <div className="space-y-3.5 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Mapped Status</span>
                            <div className="flex gap-2 mt-1.5">
                              {['Y', 'N'].map(val => (
                                <button
                                  key={val}
                                  onClick={() => handlePiCellToggle(selectedPiCell.co_id, selectedPiCell.pi_id)}
                                  className={`flex-1 py-1.5 rounded-lg font-bold border transition-colors ${
                                    selectedPiCell.mapped === val 
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10' 
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-450 hover:bg-slate-100'
                                  }`}
                                >
                                  {val === 'Y' ? 'Mapped (Y)' : 'Unmapped (N)'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {selectedPiCell.mapped === 'Y' ? (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase">Link Alignment Rationale</span>
                              <p className="mt-1 text-slate-650 dark:text-slate-300 leading-relaxed max-h-40 overflow-y-auto italic bg-slate-50 dark:bg-slate-955 p-2.5 rounded-xl border dark:border-slate-850">
                                {selectedPiCell.reasoning || "No rationale loaded."}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">NBA Suggestion to Map</span>
                                <p className="mt-1 text-slate-650 dark:text-slate-300 leading-relaxed max-h-40 overflow-y-auto italic bg-slate-50 dark:bg-slate-955 p-2.5 rounded-xl border dark:border-slate-850">
                                  {selectedPiCell.suggestion || "No specific suggestion loaded yet."}
                                </p>
                              </div>
                              
                              <div className="pt-2 border-t border-slate-250 dark:border-slate-850">
                                {loadingPiSuggestion ? (
                                  <div className="flex items-center gap-2 text-slate-500 py-1">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                    <span>Generating NBA alignment guidelines...</span>
                                  </div>
                                ) : piSuggestion ? (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-blue-500 block uppercase">AI Alignment Guide</span>
                                    <div className="text-slate-700 dark:text-slate-350 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 leading-relaxed max-h-60 overflow-y-auto font-sans font-medium whitespace-pre-line">
                                      {piSuggestion}
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={fetchPiSuggestion}
                                    className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-blue-500/10"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Ask AI How to Map
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel p-5 text-center text-slate-450 text-xs py-10 flex flex-col items-center justify-center h-full">
                        <Info className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                        <span>Select a matrix cell to inspect alignment reasoning, double-click cells directly to toggle mapping, or click 'Ask AI How to Map' for unmapped cells.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TEACHING PHILOSOPHY VIEW */}
              {p1Tab === 'philosophy' && (
                <div className="glass-panel p-6 max-w-4xl mx-auto space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm uppercase tracking-wider">AI Teaching Philosophy</h4>
                      <p className="text-xs text-slate-500">
                        Agentic evaluation matching Bloom's levels to recommended classroom methodologies and delivery modules.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleGeneratePhilosophy}
                        disabled={generatingPhil}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-250 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 text-[11px] font-bold border dark:border-slate-800 flex items-center gap-1"
                      >
                        {generatingPhil ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Regenerate
                      </button>
                      <button
                        onClick={handleSavePhilosophy}
                        disabled={savingPhil}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-500/10 flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        {savingPhil ? "Saving..." : "Save Philosophy"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={philText}
                    onChange={(e) => setPhilText(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs font-mono leading-relaxed focus:outline-none"
                    rows={15}
                  />
                </div>
              )}

              {/* ASSIGNMENT GENERATOR VIEW */}
              {p1Tab === 'assignment' && (
                <div className="space-y-6 animate-fadeIn">
                  {!hasCOs ? (
                    <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-4">
                      <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">Course Outcomes Required</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-455 mt-1">
                          You must generate Course Outcomes (COs) before generating assignments mapping to them.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setP1Tab('cos')}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"
                      >
                        Go to Course Outcomes Tab
                      </button>
                    </div>
                  ) : !allCosApproved ? (
                    <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-4">
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">Course Outcomes Approval Pending</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-455 mt-1">
                          Assignments can only be generated after all Course Outcomes have been finalized and approved to ensure curriculum compliance.
                        </p>
                      </div>
                      <div className="flex gap-3 justify-center">
                        <button
                          type="button"
                          onClick={handleApproveCos}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
                        >
                          Approve All COs Now
                        </button>
                        <button
                          type="button"
                          onClick={() => setP1Tab('cos')}
                          className="px-5 py-2.5 bg-slate-200 hover:bg-slate-350 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs"
                        >
                          Review COs
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* Configuration Panel */}
                      <div className="lg:col-span-1 space-y-4">
                        <div className="glass-panel p-5 space-y-5">
                          <h4 className="font-bold text-sm uppercase tracking-wider">Assignment Config</h4>
                          
                          <div className="space-y-4">
                            {/* Difficulty */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-400 uppercase">Difficulty Level</label>
                              <select
                                value={assignDifficulty}
                                onChange={(e) => setAssignDifficulty(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm focus:outline-none text-slate-800 dark:text-slate-100"
                              >
                                <option value="Easy">Easy (Conceptual / Direct)</option>
                                <option value="Medium">Medium (Analytical / Standard)</option>
                                <option value="Hard">Hard (Problem Solving / Advanced)</option>
                              </select>
                            </div>
                            
                            {/* Type */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-400 uppercase">Assignment Type</label>
                              <select
                                value={assignType}
                                onChange={(e) => setAssignType(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm focus:outline-none text-slate-800 dark:text-slate-100"
                              >
                                <option value="Theory">Theory-Based</option>
                                <option value="Practical">Practical-Based</option>
                                <option value="Mixed">Mixed Mode</option>
                              </select>
                            </div>

                            {/* Question Count */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-400 uppercase">Questions Per CO</label>
                              <select
                                value={assignQCount}
                                onChange={(e) => setAssignQCount(parseInt(e.target.value))}
                                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm focus:outline-none text-slate-800 dark:text-slate-100"
                              >
                                <option value={1}>1 Question</option>
                                <option value={2}>2 Questions</option>
                                <option value={3}>3 Questions</option>
                                <option value={4}>4 Questions</option>
                              </select>
                            </div>

                            {/* Answer Key Toggle */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border dark:border-slate-850 text-xs">
                              <span className="font-semibold text-slate-550">Generate Answer Key</span>
                              <input
                                type="checkbox"
                                checked={assignAnswerKey}
                                onChange={(e) => setAssignAnswerKey(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded bg-slate-100 border-slate-300 focus:ring-blue-500 focus:ring-2"
                              />
                            </div>

                            {/* Rubrics Toggle */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border dark:border-slate-850 text-xs">
                              <span className="font-semibold text-slate-550">Generate Grading Rubrics</span>
                              <input
                                type="checkbox"
                                checked={assignRubric}
                                onChange={(e) => setAssignRubric(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded bg-slate-100 border-slate-300 focus:ring-blue-500 focus:ring-2"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={handleGenerateAssignment}
                              disabled={generatingAssignment}
                              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/10 transition-all hover:translate-y-[-1px] disabled:opacity-50"
                            >
                              {generatingAssignment ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                              {generatingAssignment ? "Generating..." : "Generate Sheet"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Preview Pane */}
                      <div className="lg:col-span-3 space-y-4">
                        {!courseState?.assignment ? (
                          <div className="glass-panel p-10 text-center py-20 flex flex-col items-center justify-center h-full">
                            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">No Assignment Sheet Yet</h4>
                            <p className="text-xs text-slate-455 mt-1 max-w-sm">
                              Select your grading constraints and click "Generate Sheet" to run the dedicated AI Assignment Generator.
                            </p>
                          </div>
                        ) : (
                          <div className="glass-panel p-6 space-y-6">
                            {/* Actions Header */}
                            <div className="flex justify-between items-center border-b dark:border-slate-850 pb-4">
                              <div>
                                <h4 className="font-bold text-sm uppercase tracking-wider">Assignment Preview</h4>
                                <p className="text-[10px] text-slate-455">University Assessment Draft</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleDownloadAssignmentPDF}
                                disabled={downloadingAssignmentPDF}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                              >
                                {downloadingAssignmentPDF ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                Download Official PDF
                              </button>
                            </div>

                            {/* Render Assignment Template Box */}
                            <div className="p-6 bg-white dark:bg-slate-900 border dark:border-slate-850 rounded-2xl shadow-inner text-slate-800 dark:text-slate-100 max-h-[70vh] overflow-y-auto space-y-6 font-sans">
                              {/* Header college letterhead */}
                              <div className="text-center space-y-1">
                                <h2 className="text-lg font-extrabold text-blue-900 dark:text-blue-400 tracking-wide">
                                  {courseState.assignment.college_header}
                                </h2>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                  DEPARTMENT OF COMPUTER ENGINEERING
                                </h4>
                                <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase pt-2">
                                  {courseState.assignment.title}
                                </h3>
                              </div>

                              {/* Metadata Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-955 p-4 rounded-xl border dark:border-slate-850 text-xs">
                                <div>
                                  <span className="text-slate-450 block font-semibold">Course Subject</span>
                                  <strong className="text-slate-800 dark:text-slate-200">{courseState.assignment.subject_name}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-455 block font-semibold">Academic Year</span>
                                  <strong className="text-slate-800 dark:text-slate-200">{courseState.assignment.academic_year}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-455 block font-semibold">Difficulty Level</span>
                                  <strong className="text-slate-800 dark:text-slate-200">{courseState.assignment.difficulty}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-455 block font-semibold">Assessment Type</span>
                                  <strong className="text-slate-800 dark:text-slate-200">{courseState.assignment.assignment_type}</strong>
                                </div>
                              </div>

                              {/* Instructions */}
                              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                                <h5 className="text-xs font-bold text-blue-600 dark:text-blue-400">General Instructions:</h5>
                                <ul className="list-decimal pl-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                                  {(courseState.assignment.instructions || []).map((inst, i) => (
                                    <li key={i}>{inst}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Student Details placeholder block */}
                              <div className="border border-dashed border-slate-300 dark:border-slate-700 p-3 rounded-lg flex flex-wrap gap-4 text-xs font-semibold text-slate-400 justify-between">
                                <span>Roll No: __________________</span>
                                <span>Name: _____________________________________________</span>
                                <span>Batch: _________</span>
                              </div>

                              {/* Question sections */}
                              <div className="space-y-6">
                                {(courseState.assignment.sections || []).map((sec, secIdx) => (
                                  <div key={secIdx} className="space-y-3">
                                    <div className="px-3 py-1.5 bg-blue-900 text-white rounded-lg font-bold text-[11px] uppercase tracking-wider flex justify-between items-center">
                                      <span>{sec.section_name}: Course Outcome {sec.co_id}</span>
                                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Bloom: L{sec.blooms_level}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-455 font-medium italic pl-1">
                                      CO Target: {sec.co_statement}
                                    </p>

                                    {/* Questions Table */}
                                    <div className="overflow-x-auto border dark:border-slate-850 rounded-xl">
                                      <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                          <tr className="bg-slate-50 dark:bg-slate-955 border-b dark:border-slate-850 text-slate-500 font-bold">
                                            <th className="p-3 w-16 text-center">Q.No</th>
                                            <th className="p-3">Question Statement</th>
                                            <th className="p-3 w-20 text-center">CO Mapping</th>
                                            <th className="p-3 w-24 text-center">Bloom Level</th>
                                            <th className="p-3 w-16 text-center">Marks</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(sec.questions || []).map((q, qIdx) => (
                                            <React.Fragment key={qIdx}>
                                              <tr className="border-b dark:border-slate-850 hover:bg-slate-500/5 transition-colors">
                                                <td className="p-3 text-center font-bold text-slate-500">{q.id}</td>
                                                <td className="p-3 font-semibold text-slate-700 dark:text-slate-350">{q.question_text}</td>
                                                <td className="p-3 text-center">
                                                  <span className="badge-blue text-[9px]">{q.co_id}</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                  <span className="badge-orange text-[9px]">L{q.blooms_level}</span>
                                                </td>
                                                <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-100">{q.marks}M</td>
                                              </tr>
                                              {(q.answer_key || q.rubric) && (
                                                <tr>
                                                  <td colSpan="5" className="p-3 bg-slate-50/50 dark:bg-slate-950/30">
                                                    <div className="pl-4 border-l-2 border-indigo-500 space-y-2 py-1">
                                                      {q.answer_key && (
                                                        <div className="text-[11px]">
                                                          <strong className="text-emerald-500 block">Sample Solution:</strong>
                                                          <p className="text-slate-500 mt-0.5 whitespace-pre-line leading-relaxed">{q.answer_key}</p>
                                                        </div>
                                                      )}
                                                      {q.rubric && (
                                                        <div className="text-[11px]">
                                                          <strong className="text-amber-500 block">Marking Rubric:</strong>
                                                          <p className="text-slate-500 mt-0.5 whitespace-pre-line leading-relaxed">{q.rubric}</p>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transition to Phase 2 at the bottom */}
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setActivePhase(2)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/10"
                >
                  Proceed to Phase 2: Marks Upload & Reports
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* PHASE 2 WORKSPACE */}
      {activePhase === 2 && (
        <div className="space-y-6 animate-fadeIn">
          {!hasAttainment ? (
            /* Upload CSV Student Marks page */
            <div className="glass-panel p-6 max-w-xl mx-auto space-y-6">
              <div className="space-y-1">
                <h3 className="font-bold text-lg flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Phase 2 Outcome Attainments Calculations
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-455">
                  Upload your student marks sheet. The system will automatically parse maximum score benchmarks and aggregate attainment parameters.
                </p>
              </div>

              <form onSubmit={handleRunPhase2} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Student Marks spreadsheet (CSV)</label>
                  <div className="border-2 border-dashed border-slate-350 dark:border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-500/5 cursor-pointer relative group">
                    <input
                      type="file"
                      required
                      accept=".csv"
                      onChange={(e) => setMarksFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto group-hover:text-blue-500 transition-colors" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                      {marksFile ? marksFile.name : "Drag & drop marks CSV or click to browse"}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1">Spreadsheet headers should map columns exactly like CO1, CO2, ... CO6</span>
                  </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900 p-3.5 rounded-xl border dark:border-slate-850 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-slate-500">Need a formatting template?</span>
                  </div>
                  <a
                    href="http://localhost:8000/api/report/excel" // dummy download placeholder or local file
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-500 hover:underline"
                  >
                    Download Sample Marks.csv
                  </a>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/10 transition-all hover:translate-y-[-1px]"
                >
                  <TrendingUp className="w-4 h-4" />
                  Calculate Attainment & Recommendations
                </button>
              </form>
            </div>
          ) : (
            /* Phase 2 Output visualization tabs */
            <div className="space-y-6">
              
              {/* Tab Navigation */}
              <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
                <button
                  onClick={() => setP2Tab('attainments')}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    p2Tab === 'attainments' 
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                      : 'border-transparent text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Attainments Analytics
                </button>
                
                <button
                  onClick={() => setP2Tab('roster')}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    p2Tab === 'roster' 
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                      : 'border-transparent text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Student Marks Roster
                </button>
                
                <button
                  onClick={() => setP2Tab('recommendations')}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    p2Tab === 'recommendations' 
                      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                      : 'border-transparent text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  AI Improvement Recommendations
                </button>
              </div>

              {/* ATTAINMENT VIEW */}
              {p2Tab === 'attainments' && (
                <div className="space-y-6">
                  
                  {/* Recharts Plots Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* CO Attainments Bar Chart */}
                    <div className="glass-panel p-5 space-y-4">
                      <h4 className="font-bold text-sm uppercase tracking-wider">CO Attainment Analysis</h4>
                      
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={coChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ 
                                background: '#0f172a', 
                                borderColor: '#1e293b', 
                                borderRadius: '8px', 
                                color: '#f8fafc',
                                fontSize: '11px' 
                              }} 
                            />
                            <Bar dataKey="Average %" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* PO Attainments Bar Chart */}
                    <div className="glass-panel p-5 space-y-4">
                      <h4 className="font-bold text-sm uppercase tracking-wider">PO Weighted Attainment Indexes</h4>
                      
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={poChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 3.0]} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ 
                                background: '#0f172a', 
                                borderColor: '#1e293b', 
                                borderRadius: '8px', 
                                color: '#f8fafc',
                                fontSize: '11px' 
                              }} 
                            />
                            <ReferenceLine y={1.5} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Weakness Limit (1.5)', fill: '#f43f5e', fontSize: 9, position: 'top' }} />
                            <Bar dataKey="Weighted Score" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>                  {/* Course Outcomes Attainment Matrix */}
                  <div className="glass-panel p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm uppercase tracking-wider">Course Outcomes Attainment Matrix</h4>
                      <span className="text-[10px] text-slate-400 font-medium">Interactive component weights & real-time recalculation</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-xs border-collapse border border-slate-200 dark:border-slate-800">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900 text-slate-450 font-bold uppercase tracking-wider">
                            <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle text-left min-w-[200px]">Course Outcome</th>
                            <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Revised Bloom's Level</th>
                            <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle min-w-[150px]">Assessment Components</th>
                            <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Target (%)</th>
                            <th colSpan={4} className="p-2 border border-slate-200 dark:border-slate-800 align-middle">CIE Assessment</th>
                            <th colSpan={2} className="p-2 border border-slate-200 dark:border-slate-800 align-middle">ESE Assessment</th>
                            <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Average Achieved</th>
                            <th rowSpan={2} className="p-3 border border-slate-200 dark:border-slate-800 align-middle">Attainment Level</th>
                          </tr>
                          <tr className="bg-slate-50 dark:bg-slate-850 text-slate-450 font-bold uppercase tracking-wider">
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
                                <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-medium text-slate-660 dark:text-slate-350">
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
                                      <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400">IA</span>
                                    </label>
                                    <label className="flex items-center gap-0.5 cursor-pointer select-none">
                                      <input 
                                        type="checkbox" 
                                        checked={co.checks.MSE} 
                                        onChange={() => handleCheckboxChange(co.co_id, 'MSE')} 
                                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900"
                                      />
                                      <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400">MSE</span>
                                    </label>
                                    <label className="flex items-center gap-0.5 cursor-pointer select-none">
                                      <input 
                                        type="checkbox" 
                                        checked={co.checks.CIE} 
                                        onChange={() => handleCheckboxChange(co.co_id, 'CIE')} 
                                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-900"
                                      />
                                      <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400">CIE</span>
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
                                <td className="p-3 border border-slate-200 dark:border-slate-800 align-middle font-semibold text-slate-705 dark:text-slate-300">
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
                  </div>

                  {/* PO Status breakdown table */}
                  <div className="glass-panel p-5 space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider">Program Outcomes Attainment Registry</h4>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                            <th className="pb-3 pl-2">Outcome ID</th>
                            <th className="pb-3">Attainment Score (0 - 3)</th>
                            <th className="pb-3">Status Badge</th>
                            <th className="pb-3 pr-2">Alignment Assessment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                          {computedPoAttainments.map(po => (
                            <tr key={po.po_id} className="hover:bg-slate-500/5 transition-colors">
                              <td className="py-3 pl-2 font-bold text-slate-800 dark:text-slate-200">{po.po_id}</td>
                              <td className="py-3 font-semibold">{po.weighted_attainment.toFixed(2)}</td>
                              <td className="py-3">
                                {po.is_weak ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">
                                    WEAK
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                                    GOOD
                                  </span>
                                )}
                              </td>
                              <td className="py-3 pr-2 text-slate-500 leading-relaxed italic max-w-md truncate" title={po.weakness_reason}>
                                {po.weakness_reason || "Attainment benchmark successfully reached."}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* MARKS ROSTER VIEW */}
              {p2Tab === 'roster' && (
                <div className="glass-panel p-5 space-y-4">
                  <h4 className="font-bold text-sm uppercase tracking-wider">Student Cohort Score Matrix</h4>
                  <p className="text-xs text-slate-500">
                    A checklist of student performance mapped row-by-row to the parsed Course Outcomes.
                  </p>
                  
                  {/* Standard roster table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-center text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900 text-slate-450 font-bold uppercase tracking-wider">
                          <th className="p-3 border border-slate-200 dark:border-slate-800 text-left">Roll No</th>
                          <th className="p-3 border border-slate-200 dark:border-slate-800 text-left">Student Name</th>
                          {Array.from({ length: 6 }, (_, i) => `CO${i + 1}`).map(coId => (
                            <th key={coId} className="p-3 border border-slate-200 dark:border-slate-800 w-20">
                              {coId}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Iterate student details */}
                        {courseState?.students?.length > 0 ? (
                          courseState.students.map(stud => {
                            if (!stud) return null;
                            return (
                              <tr key={stud.roll_no} className="hover:bg-slate-500/5 transition-colors">
                                <td className="p-3 border border-slate-200 dark:border-slate-800 text-left font-semibold">{stud.roll_no}</td>
                                <td className="p-3 border border-slate-200 dark:border-slate-800 text-left">{stud.name}</td>
                                {Array.from({ length: 6 }, (_, i) => `CO${i + 1}`).map(coId => (
                                  <td key={coId} className="p-3 border border-slate-200 dark:border-slate-800 font-medium">
                                    {stud.marks?.[coId] !== undefined ? stud.marks[coId] : '-'}
                                  </td>
                                ))}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-455 italic">
                              No student marks loaded. Please upload marks CSV.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* RECOMMENDATIONS & DOWNLOADS VIEW */}
              {p2Tab === 'recommendations' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* AI Recommendations Cards */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="glass-panel p-5 space-y-4">
                      <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        AI Curriculum Improvement Plans
                      </h4>
                      
                      <div className="space-y-4">
                        {(courseState?.recommendations || []).map((rec, i) => {
                          if (!rec) return null;
                          const priority = rec.priority || 'Low';
                          const priorityColor = priority.toLowerCase() === 'high' 
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                            : priority.toLowerCase() === 'medium'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                          return (
                            <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 flex gap-4">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                <Sparkles className="w-5 h-5" />
                              </div>
                              
                              <div className="text-xs space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">Recommendation #{i + 1}</span>
                                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded text-[9px] font-bold border border-indigo-500/20">
                                    Target: {rec.target || ''}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${priorityColor}`}>
                                    {priority} Priority
                                  </span>
                                </div>
                                
                                <p className="text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                                  {rec.suggestion || ''}
                                </p>
                                
                                <div className="text-[10px] text-slate-455 border-t border-slate-200 dark:border-slate-850 pt-2 space-y-1">
                                  <p><strong>Issue Identified:</strong> {rec.issue || ''}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Reports & Dossiers Download Sidebar */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="glass-panel p-5 space-y-4">
                      <h4 className="font-bold text-sm uppercase tracking-wider">Accreditation Report Dossiers</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Download fully-compiled audit trace logs and competency maps for NBA committee file preparations.
                      </p>
                      
                      <div className="space-y-3.5 pt-2">
                        {/* Excel Button */}
                        <button
                          onClick={downloadExcel}
                          disabled={downloadingExcel}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 disabled:opacity-50 transition-all hover:scale-[1.01]"
                        >
                          {downloadingExcel ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4" />
                          )}
                          Download Excel Dossier (6A - 6F)
                        </button>
                        
                        {/* PDF Button */}
                        <button
                          onClick={downloadPDF}
                          disabled={downloadingPDF}
                          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-red-500/10 disabled:opacity-50 transition-all hover:scale-[1.01]"
                        >
                          {downloadingPDF ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          Download PDF Report Dossier
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-850 rounded-xl text-xs space-y-2">
                      <span className="font-bold uppercase text-[10px] text-slate-400 block">Agent Execution Trace</span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {(courseState?.audit_trail || []).slice(-4).reverse().map((log, i) => {
                          if (!log) return null;
                          return (
                            <div key={i} className="flex gap-1.5 text-[10px] border-b dark:border-slate-800 pb-1.5 last:border-0 last:pb-0">
                              <span className="font-bold text-blue-500">{log.agent || 'System'}:</span>
                              <span className="text-slate-500">{log.detail || ''}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
}
