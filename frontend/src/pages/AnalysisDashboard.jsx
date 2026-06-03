import React, { useMemo, useState } from 'react';
import { reportAPI } from '../api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend,
  PieChart,
  Pie
} from 'recharts';
import { 
  TrendingUp, 
  ArrowLeft, 
  ArrowRight,
  Award, 
  BarChart3, 
  BookOpen, 
  Activity, 
  Printer, 
  FileText, 
  Sparkles,
  Info,
  ShieldAlert,
  ArrowDownNarrowWide,
  Grid3X3,
  ListFilter
} from 'lucide-react';

export default function AnalysisDashboard({ courseState, activeSubjectId, setActiveTab }) {
  
  // ─── Status check: If no courseState or co_attainment is not configured ───
  const hasAttainment = useMemo(() => {
    return courseState?.co_attainment && courseState.co_attainment.length > 0;
  }, [courseState]);

  // ─── Direct Attainment data processing ─────────────────────────────────────
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

  // ─── Recharts Tooltip Styling Helper (fixes readability issues) ───────────
  const tooltipProps = {
    contentStyle: { 
      background: '#0f172a', 
      borderColor: '#1e293b', 
      borderRadius: '8px', 
      fontSize: '11px',
      padding: '8px 12px'
    },
    itemStyle: { color: '#f8fafc' },
    labelStyle: { color: '#94a3b8', fontWeight: 'bold' }
  };

  // ─── 1. CO Attainment vs Target ──────────────────────────────────────────
  const g1Data = useMemo(() => {
    if (!courseState?.cos) return [];
    return courseState.cos.map(co => {
      const co_att = computedCoAttainments.find(a => a.co_id === co.co_id);
      const achieved = co_att ? co_att.overallPercentage : 0;
      const target = co.target_attainment || courseState.level1_threshold || 60.0;
      return {
        name: co.co_id,
        Target: Math.round(target * 10) / 10,
        Achieved: Math.round(achieved * 10) / 10,
        isAchieved: achieved >= target
      };
    });
  }, [courseState?.cos, courseState?.level1_threshold, computedCoAttainments]);

  // ─── 2. CO Gap Analysis ──────────────────────────────────────────────────
  const g2Data = useMemo(() => {
    if (!courseState?.cos) return [];
    return courseState.cos.map(co => {
      const co_att = computedCoAttainments.find(a => a.co_id === co.co_id);
      const achieved = co_att ? co_att.overallPercentage : 0;
      const target = co.target_attainment || courseState.level1_threshold || 60.0;
      const gap = achieved - target;
      return {
        name: co.co_id,
        Gap: parseFloat(gap.toFixed(2)),
        isPositive: gap >= 0
      };
    }).sort((a, b) => b.Gap - a.Gap); // sorted descending by gap
  }, [courseState?.cos, courseState?.level1_threshold, computedCoAttainments]);

  // ─── 3. CIA vs ESE Performance Comparison ────────────────────────────────
  const g3Data = useMemo(() => {
    if (!courseState?.cos) return [];
    return courseState.cos.map(co => {
      const co_att = computedCoAttainments.find(a => a.co_id === co.co_id);
      const cia = co_att ? (co_att.cie_percentage ?? co_att.ia_percentage ?? 0) : 0;
      const ese = co_att ? (co_att.ese_percentage ?? 0) : 0;
      return {
        name: co.co_id,
        "CIA (Internal) %": Math.round(cia * 10) / 10,
        "ESE (External) %": Math.round(ese * 10) / 10
      };
    });
  }, [courseState?.cos, computedCoAttainments]);

  // ─── 4. CO Attainment Level Distribution ─────────────────────────────────
  const g4Data = useMemo(() => {
    const counts = { 'Level 3': 0, 'Level 2': 0, 'Level 1': 0, 'Level 0': 0 };
    const coAttList = courseState?.co_attainment || [];
    const total = coAttList.length;

    coAttList.forEach(att => {
      const lvl = att.achieved_level ?? 0;
      const roundedLvl = Math.max(0, Math.min(3, Math.round(lvl)));
      counts[`Level ${roundedLvl}`]++;
    });

    return [
      { name: 'Level 3', value: counts['Level 3'], pct: total > 0 ? (counts['Level 3'] / total) * 100 : 0 },
      { name: 'Level 2', value: counts['Level 2'], pct: total > 0 ? (counts['Level 2'] / total) * 100 : 0 },
      { name: 'Level 1', value: counts['Level 1'], pct: total > 0 ? (counts['Level 1'] / total) * 100 : 0 },
      { name: 'Level 0', value: counts['Level 0'], pct: total > 0 ? (counts['Level 0'] / total) * 100 : 0 },
    ];
  }, [courseState?.co_attainment]);

  const COLORS_DIST = {
    'Level 3': '#10b981', // emerald
    'Level 2': '#3b82f6', // blue
    'Level 1': '#f59e0b', // amber
    'Level 0': '#ef4444'  // rose
  };

  // ─── 5. Bloom Level vs Average Attainment ────────────────────────────────
  const g5Data = useMemo(() => {
    if (!courseState?.cos) return [];
    const bloomGroups = {};
    courseState.cos.forEach(co => {
      const co_att = computedCoAttainments.find(a => a.co_id === co.co_id);
      const achieved = co_att ? co_att.overallPercentage : 0;
      const lvl = `Level ${co.blooms_level}`;
      if (!bloomGroups[lvl]) {
        bloomGroups[lvl] = { sum: 0, count: 0 };
      }
      bloomGroups[lvl].sum += achieved;
      bloomGroups[lvl].count++;
    });

    return Object.entries(bloomGroups).map(([lvl, info]) => ({
      bloomLevel: lvl,
      "Average Achieved %": parseFloat((info.sum / info.count).toFixed(1))
    })).sort((a, b) => a.bloomLevel.localeCompare(b.bloomLevel));
  }, [courseState?.cos, computedCoAttainments]);

  // ─── 6. CO Achievement Ranking ───────────────────────────────────────────
  const g6Data = useMemo(() => {
    if (!courseState?.cos) return [];
    return courseState.cos.map(co => {
      const co_att = computedCoAttainments.find(a => a.co_id === co.co_id);
      const achieved = co_att ? co_att.overallPercentage : 0;
      return {
        name: co.co_id,
        "Average Achieved %": Math.round(achieved * 10) / 10,
        description: co.statement
      };
    }).sort((a, b) => b["Average Achieved %"] - a["Average Achieved %"]);
  }, [courseState?.cos, computedCoAttainments]);

  // ─── 7. PO Attainment vs Target ──────────────────────────────────────────
  const g7Data = useMemo(() => {
    return computedPoAttainments.map(po => ({
      name: po.po_id,
      "Actual Attainment": po.weighted_attainment,
      "Target PO": 2.0 // standard target PO value
    }));
  }, [computedPoAttainments]);

  // ─── 8. CO → PO Contribution Heatmap calculations ───────────────────────
  const [heatmapSort, setHeatmapSort] = useState('original'); // 'original', 'co', 'po'

  const rawHeatmapData = useMemo(() => {
    if (!courseState?.cos || !courseState?.mappings) return [];
    return courseState.cos.map(co => {
      const co_att = computedCoAttainments.find(a => a.co_id === co.co_id);
      const attainmentVal = co_att ? co_att.overallAttainmentLevel : 0;
      
      const posValues = Array.from({ length: 12 }, (_, i) => {
        const poId = `PO${i + 1}`;
        const mapping = (courseState.mappings || []).find(m => m.co_id === co.co_id && m.po_id === poId);
        const strength = mapping ? parseFloat(mapping.strength || 0) : 0;
        const indexVal = (attainmentVal * strength) / 3;
        
        return {
          poId,
          strength,
          index: parseFloat(indexVal.toFixed(2))
        };
      });

      return {
        coId: co.co_id,
        attainmentVal,
        pos: posValues
      };
    });
  }, [courseState?.cos, courseState?.mappings, computedCoAttainments]);

  // ─── Heatmap Analytics, Insights, & Sorting ─────────────────────────────────
  const heatmapMetrics = useMemo(() => {
    if (!courseState?.cos || !courseState?.mappings || rawHeatmapData.length === 0) return null;
    
    let activeLinks = 0;
    let highestVal = -1;
    let highestLink = "";
    let sumContribution = 0;
    let weakContributionsCount = 0;
    
    const poSums = {};
    const coSums = {};
    
    rawHeatmapData.forEach(row => {
      coSums[row.coId] = 0;
      row.pos.forEach(col => {
        if (!poSums[col.poId]) poSums[col.poId] = 0;
        
        if (col.strength > 0) {
          activeLinks++;
          sumContribution += col.index;
          poSums[col.poId] += col.index;
          coSums[row.coId] += col.index;
          
          if (col.index < 1.0) {
            weakContributionsCount++;
          }
          
          if (col.index > highestVal) {
            highestVal = col.index;
            highestLink = `${row.coId} → ${col.poId}`;
          }
        }
      });
    });
    
    const avgContribution = activeLinks > 0 ? (sumContribution / activeLinks).toFixed(1) : '0.0';
    
    // Strongest PO
    let strongestPo = "None";
    let maxPoVal = -1;
    Object.entries(poSums).forEach(([po, val]) => {
      if (val > maxPoVal) {
        maxPoVal = val;
        strongestPo = po;
      }
    });
    
    // Weakest PO (lowest sum)
    let weakestPo = "None";
    let minPoVal = 9999;
    Object.entries(poSums).forEach(([po, val]) => {
      if (val < minPoVal) {
        minPoVal = val;
        weakestPo = po;
      }
    });
    
    // Weakest CO
    let weakestCo = "None";
    let minCoVal = 9999;
    Object.entries(coSums).forEach(([co, val]) => {
      if (val < minCoVal) {
        minCoVal = val;
        weakestCo = co;
      }
    });

    return {
      activeLinks,
      highestContribution: highestLink || 'N/A',
      highestVal: highestVal >= 0 ? highestVal.toFixed(1) : '0.0',
      averageContribution: avgContribution,
      weakContributionsCount,
      strongestPo,
      weakestPo,
      weakestCo,
      poSums,
      coSums
    };
  }, [courseState?.cos, courseState?.mappings, rawHeatmapData]);

  // Sort rows based on CO contribution sums
  const sortedRows = useMemo(() => {
    if (rawHeatmapData.length === 0) return [];
    if (heatmapSort === 'co' && heatmapMetrics) {
      return [...rawHeatmapData].sort((a, b) => {
        const aSum = heatmapMetrics.coSums[a.coId] || 0;
        const bSum = heatmapMetrics.coSums[b.coId] || 0;
        return bSum - aSum;
      });
    }
    return rawHeatmapData;
  }, [rawHeatmapData, heatmapSort, heatmapMetrics]);

  // Sort columns based on PO contribution sums
  const sortedColumns = useMemo(() => {
    const defaultCols = Array.from({ length: 12 }, (_, i) => `PO${i + 1}`);
    if (heatmapSort === 'po' && heatmapMetrics) {
      return [...defaultCols].sort((a, b) => {
        const aSum = heatmapMetrics.poSums[a] || 0;
        const bSum = heatmapMetrics.poSums[b] || 0;
        return bSum - aSum;
      });
    }
    return defaultCols;
  }, [heatmapSort, heatmapMetrics]);

  // Color cell formatting rules
  const getCellColorStyles = (index, strength) => {
    if (strength === 0) {
      // Cell must remain empty
      return {
        bgClass: 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-transparent pointer-events-none select-none',
        textColor: 'text-transparent'
      };
    }
    // Improved Color Scale: 0 -> white, 0-1 -> light blue, 1-2 -> medium blue, 2-3 -> dark blue
    if (index === 0) return { bgClass: 'bg-slate-50 dark:bg-slate-950/20 text-slate-400 border-slate-200 dark:border-slate-800', textColor: 'text-slate-400' };
    if (index <= 1.0) return { bgClass: 'bg-blue-50/70 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/20', textColor: 'text-blue-700 dark:text-blue-300' };
    if (index <= 2.0) return { bgClass: 'bg-blue-200 dark:bg-blue-800/40 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700/40', textColor: 'text-blue-900 dark:text-blue-100' };
    return { bgClass: 'bg-blue-600 dark:bg-blue-700 text-white border-blue-700 dark:border-blue-600', textColor: 'text-white' };
  };

  // ─── PRINT DOSSIER TRIGGER ─────────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await reportAPI.downloadAnalysisPDF();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const subjectName = (courseState?.subject_name || 'Subject').replace(/\s+/g, '_');
      link.setAttribute('download', `${subjectName}_AnalysisDossier.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download Analysis Dossier PDF.');
    } finally {
      setDownloading(false);
    }
  };

  // Render Missing Attainment alert if no marks data exists
  if (!hasAttainment) {
    return (
      <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-5 my-12 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Attainment Analysis Unavailable</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            The graphical analysis dashboard requires student marks roster files to be uploaded and outcome calculations computed first.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('attainment')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
        >
          Go to Marks & Attainment <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Dynamic CSS styles loaded locally for clean print dossier layout */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          aside, header, nav, .no-print, button, .chatbot-widget {
            display: none !important;
          }
          .glass-panel {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin-bottom: 2.5rem !important;
            page-break-inside: avoid !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
          }
          h2, h3 {
            color: black !important;
            page-break-after: avoid !important;
          }
          .recharts-responsive-container {
            width: 100% !important;
            height: 300px !important;
          }
        }
      `}</style>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-5 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Outcome Analysis Dashboard</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/15">
              Attainment Complete
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Accreditation graphical statistics and curriculum performance audits for <strong className="text-slate-700 dark:text-slate-350">{activeSubjectId}</strong>
          </p>
        </div>

        <div className="flex gap-2">
          {/* Back button */}
          <button
            onClick={() => setActiveTab('workspace')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-880 text-xs font-bold text-slate-750 dark:text-slate-200 rounded-xl transition-all border dark:border-slate-800 shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Workspace Overview
          </button>
          
          {/* Print Dossier */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" /> {downloading ? 'Generating PDF...' : 'Print Analysis Dossier'}
          </button>
        </div>
      </div>

      {/* Print-only title */}
      <div className="hidden print:block border-b border-slate-900 pb-3 mb-6">
        <h1 className="text-2xl font-black uppercase tracking-wide">MIT ACADEMY OF ENGINEERING, ALANDI</h1>
        <h2 className="text-lg font-bold mt-1">Accreditation Dossier: Outcome Analysis Report</h2>
        <div className="flex justify-between text-xs mt-3 text-slate-600">
          <span><strong>Subject:</strong> {courseState?.subject_name}</span>
          <span><strong>Department:</strong> {courseState?.department}</span>
          <span><strong>Year & Sem:</strong> {courseState?.year} · {courseState?.semester}</span>
        </div>
      </div>

      {/* Main Charts grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-full-width">

        {/* 1. CO Attainment vs Target */}
        <div className="glass-panel p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5 border-b dark:border-slate-850 pb-2">
              <Award className="w-4 h-4 text-blue-500 shrink-0" /> 1. Course Outcomes (CO) Attainment vs Target
            </h3>
            <p className="text-[10px] text-slate-400">Direct attainment score relative to target thresholds</p>
          </div>
          
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={g1Data} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Legend verticalAlign="top" height={32} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Target" fill="#64748b" name="Target CO %" radius={[4, 4, 0, 0]} barSize={15} />
                <Bar dataKey="Achieved" name="Average Achieved %" radius={[4, 4, 0, 0]} barSize={15}>
                  {g1Data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isAchieved ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p>
              <strong>Interpretation:</strong> This grouped bar chart compares the target attainment threshold of each Course Outcome against the actual average scores achieved by the cohort. <span className="text-emerald-500 font-bold">Green bars</span> highlight COs that met or exceeded targets, while <span className="text-rose-500 font-bold">Red bars</span> indicate COs falling below the benchmark.
            </p>
          </div>
        </div>

        {/* 2. CO Gap Analysis */}
        <div className="glass-panel p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5 border-b dark:border-slate-850 pb-2">
              <ArrowDownNarrowWide className="w-4 h-4 text-purple-500 shrink-0" /> 2. Course Outcomes Gap Analysis
            </h3>
            <p className="text-[10px] text-slate-400">Deviation calculation (Achieved − Target) in descending order</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={g2Data} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="Gap" name="Gap Score %" radius={[0, 4, 4, 0]} barSize={14}>
                  {g2Data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isPositive ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
            <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
            <p>
              <strong>Interpretation:</strong> This horizontal chart ranks Course Outcomes by their performance gap relative to their target levels. Positive values indicate target achievement, while negative values represent negative gaps where student cohorts failed to meet NBA standards, signaling areas requiring pedagogical intervention.
            </p>
          </div>
        </div>

        {/* 3. CIA vs ESE Performance Comparison */}
        <div className="glass-panel p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5 border-b dark:border-slate-850 pb-2">
              <Activity className="w-4 h-4 text-indigo-500 shrink-0" /> 3. CIA vs ESE Performance Comparison
            </h3>
            <p className="text-[10px] text-slate-400">Continuous Internal Assessments (CIA) vs End Semester Exam (ESE) scores</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={g3Data} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Legend verticalAlign="top" height={32} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="CIA (Internal) %" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="ESE (External) %" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p>
              <strong>Interpretation:</strong> This clustered chart compares continuous internal assessments (CIA/midterms/quizzes) against end-semester exams (ESE) per CO. Significant deviations indicate mismatches between internal testing rigors and external evaluation benchmarks.
            </p>
          </div>
        </div>

        {/* 4. CO Attainment Level Distribution */}
        <div className="glass-panel p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5 border-b dark:border-slate-850 pb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" /> 4. CO Attainment Level Distribution
            </h3>
            <p className="text-[10px] text-slate-400">Total outcomes count and proportion grouped by NBA level (0–3)</p>
          </div>

          <div className="h-64 w-full pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="h-48 w-48 shrink-0 flex items-center justify-center relative">
              {g4Data.some(d => d.value > 0) ? (
                <PieChart width={192} height={192}>
                  <Pie
                    data={g4Data}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    isAnimationActive={false}
                  >
                    {g4Data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_DIST[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipProps} />
                </PieChart>
              ) : (
                <div className="text-[10px] text-slate-400 font-semibold">No Attainment Data</div>
              )}
            </div>
            
            <div className="space-y-2 text-xs w-full sm:w-auto">
              {g4Data.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS_DIST[entry.name] }} />
                  <span className="font-bold text-slate-700 dark:text-slate-350">{entry.name}</span>
                  <span className="text-slate-500 font-semibold">→ {entry.value} ({entry.pct.toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
            <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong>Interpretation:</strong> This distribution illustrates the counts and percentages of COs grouped by their achieved NBA Attainment levels (0 to 3). Ideally, a high percentage of outcomes should cluster in Level 3, representing comprehensive mastery of subject syllabus modules.
            </p>
          </div>
        </div>

        {/* 5. Bloom Level vs Average Attainment */}
        <div className="glass-panel p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5 border-b dark:border-slate-850 pb-2">
              <Sparkles className="w-4 h-4 text-cyan-500 shrink-0" /> 5. Bloom Level vs Average Attainment
            </h3>
            <p className="text-[10px] text-slate-400">Average attainment score grouped by cognitive mastery levels</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={g5Data} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                <XAxis dataKey="bloomLevel" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="Average Achieved %" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
            <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
            <p>
              <strong>Interpretation:</strong> This chart illustrates the average student attainment across different cognitive levels of Bloom's Taxonomy. It helps audit if higher-order levels (e.g., L5-Evaluate, L6-Design) show lower attainment rates, indicating a need for more application-oriented instructional scaffolding.
            </p>
          </div>
        </div>

        {/* 6. CO Achievement Ranking */}
        <div className="glass-panel p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5 border-b dark:border-slate-850 pb-2">
              <Award className="w-4 h-4 text-amber-500 shrink-0" /> 6. Course Outcomes Achievement Ranking
            </h3>
            <p className="text-[10px] text-slate-400">Course Outcome scores sorted from highest to lowest</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={g6Data} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip 
                  {...tooltipProps}
                  formatter={(value, name, props) => [value + '%', name, `Description: ${props.payload.description}`]}
                />
                <Bar dataKey="Average Achieved %" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>Interpretation:</strong> This chart ranks all Course Outcomes in descending order of student average achievement, providing a clear list of the strongest-performing outcomes down to the weakest-performing modules.
            </p>
          </div>
        </div>

        {/* 7. PO Attainment vs Target */}
        <div className="glass-panel p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5 border-b dark:border-slate-850 pb-2">
              <Grid3X3 className="w-4 h-4 text-emerald-500 shrink-0" /> 7. PO Attainment vs Target
            </h3>
            <p className="text-[10px] text-slate-400">Weighted Program Outcome scores compared to NBA standard benchmark (2.0)</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={g7Data} margin={{ top: 10, right: 10, left: -30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 3.0]} tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Legend verticalAlign="top" height={32} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Target PO" fill="#94a3b8" name="Target PO Benchmark" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="Actual Attainment" name="Weighted PO Score" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
            <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong>Interpretation:</strong> This chart evaluates the direct, weighted contribution of Course Outcomes to the 12 Graduate Program Outcomes (POs) against a standard NBA target score of 2.0. It exposes which program outcomes remain weak across the syllabus delivery.
            </p>
          </div>
        </div>

      </div>

      {/* 8. CO → PO Contribution Heatmap (Full Width for improved readability) */}
      <div className="glass-panel p-5 space-y-4 flex flex-col justify-between mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-slate-850 pb-3">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
              <Grid3X3 className="w-4 h-4 text-blue-500 shrink-0" /> 8. CO → PO Contribution Heatmap
            </h3>
            <p className="text-[10px] text-slate-400">
              Cell index represents direct curriculum impact = <code>(Final CO Attainment × Mapping Strength) / 3</code>
            </p>
          </div>
          
          {/* Sorting controls */}
          <div className="flex items-center gap-2 no-print">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <ListFilter className="w-3.5 h-3.5" /> Sort Order:
            </span>
            <div className="inline-flex rounded-lg border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-0.5 text-[10px] font-bold">
              <button
                onClick={() => setHeatmapSort('original')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  heatmapSort === 'original' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setHeatmapSort('co')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  heatmapSort === 'co' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                By CO Contribution
              </button>
              <button
                onClick={() => setHeatmapSort('po')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  heatmapSort === 'po' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                By PO Contribution
              </button>
            </div>
          </div>
        </div>

        {/* Heatmap KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Active CO–PO Links</span>
            <span className="text-lg font-black text-slate-850 dark:text-white">{heatmapMetrics?.activeLinks}</span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Highest Contribution</span>
            <span className="text-xs font-bold text-blue-500 block truncate">{heatmapMetrics?.highestContribution}</span>
            <span className="text-[9px] text-slate-400 block font-semibold">Index: {heatmapMetrics?.highestVal}</span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Average Contribution</span>
            <span className="text-lg font-black text-slate-850 dark:text-white">{heatmapMetrics?.averageContribution}</span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Weak Contributions (&lt;1)</span>
            <span className="text-lg font-black text-rose-500">{heatmapMetrics?.weakContributionsCount}</span>
          </div>
        </div>

        {/* Faculty Insight Banner */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-2 text-[11px] leading-relaxed">
          <span className="font-bold text-blue-500 uppercase tracking-wider text-[9px] block">Faculty OBE Insights</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Strongest PO Target:</span>
              <p className="text-slate-650 dark:text-slate-350">
                <strong className="text-blue-500">{heatmapMetrics?.strongestPo}</strong> receives the strongest contribution from course outcomes, indicating solid syllabus coverage.
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Weakest PO Target:</span>
              <p className="text-slate-650 dark:text-slate-350">
                <strong className="text-rose-550">{heatmapMetrics?.weakestPo}</strong> receives little/no mapping contribution, representing a potential accreditation gap.
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Weak Outcome Contribution:</span>
              <p className="text-slate-650 dark:text-slate-350">
                <strong className="text-amber-500">{heatmapMetrics?.weakestCo}</strong> contributes minimally to POs, indicating opportunities to strengthen mapping correlation.
              </p>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Table container */}
        <div className="pt-2 overflow-x-auto">
          <div className="min-w-[700px] border dark:border-slate-800 rounded-xl overflow-hidden text-center text-xs">
            {/* Header row */}
            <div className="grid bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 font-bold py-2.5 text-[10px] text-slate-450 uppercase tracking-wider" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
              <div>CO \ PO</div>
              {sortedColumns.map(poId => (
                <div key={poId}>{poId}</div>
              ))}
            </div>
            
            {/* Heatmap cells */}
            <div className="divide-y dark:divide-slate-800">
              {sortedRows.map((row) => {
                const roundedAttLvl = Math.max(0, Math.min(3, Math.round(row.attainmentVal)));
                // Row Label: compact format COx [Llvl]
                const compactLabel = `${row.coId} [L${roundedAttLvl}]`;

                return (
                  <div key={row.coId} className="grid items-center" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
                    {/* Row Header */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/20 font-bold py-4 border-r dark:border-slate-800 text-slate-750 dark:text-slate-350 font-mono">
                      {compactLabel}
                    </div>
                    
                    {/* Columns */}
                    {sortedColumns.map((poId) => {
                      const col = row.pos.find(p => p.poId === poId) || { poId, strength: 0, index: 0 };
                      const { bgClass, textColor } = getCellColorStyles(col.index, col.strength);
                      
                      // Cell value rounded to 1 decimal place only
                      const displayVal = col.index.toFixed(1);
                      const expectedTooltipVal = col.index.toFixed(1);
                      
                      // 10. Validation Rules: Assertions check
                      if (displayVal !== expectedTooltipVal) {
                        throw new Error(`Assertion failed: Displayed value (${displayVal}) does not match tooltip (${expectedTooltipVal})`);
                      }
                      if (col.index < 0 || col.index > 3) {
                        throw new Error(`Assertion failed: Contribution index (${col.index}) is out of bounds [0, 3]`);
                      }

                      return (
                        <div
                          key={poId}
                          className={`py-4 font-bold transition-all relative group flex flex-col items-center justify-center border-r dark:border-slate-800 last:border-r-0 h-full ${bgClass}`}
                        >
                          {col.strength > 0 ? (
                            <>
                              <span>{displayVal}</span>
                              
                              {/* 2. Tooltip Fix (Hovered cell data only, never display unrelated data) */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:block z-50 bg-slate-950 dark:bg-slate-900 border dark:border-slate-800 text-white font-sans text-[10px] p-3 rounded-lg shadow-xl w-44 text-left pointer-events-none leading-relaxed">
                                <span className="font-bold block border-b dark:border-slate-800 pb-1 mb-1 text-blue-400">Contribution Focus</span>
                                <span className="block"><strong>CO:</strong> {row.coId}</span>
                                <span className="block"><strong>Attainment Level:</strong> {roundedAttLvl}</span>
                                <span className="block"><strong>PO:</strong> {col.poId}</span>
                                <span className="block"><strong>Mapping Strength:</strong> {col.strength}</span>
                                <span className="block font-semibold text-emerald-400"><strong>Contribution Index:</strong> {displayVal}</span>
                                <span className="block border-t border-slate-800 dark:border-slate-850 mt-1.5 pt-1.5 text-[9px] text-slate-400">
                                  <strong>Formula:</strong><br/>
                                  ({roundedAttLvl} × {col.strength}) / 3 = {displayVal}
                                </span>
                              </div>
                            </>
                          ) : (
                            // Render empty space for unmapped (strength == 0) cells
                            <span></span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t dark:border-slate-850 pt-4 mt-4 text-[10px] text-slate-450 no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold">Cell contribution scale index color key:</span>
            <div className="flex border dark:border-slate-800 rounded-lg overflow-hidden font-bold">
              <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border-r dark:border-slate-800 text-slate-400">0.0 (Unmapped / Empty)</span>
              <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/20 border-r dark:border-slate-800 text-blue-700">0.1 - 1.0 (Low Contribution)</span>
              <span className="px-2.5 py-1 bg-blue-300 dark:bg-blue-800/50 border-r dark:border-slate-800 text-blue-900">1.1 - 2.0 (Medium Contribution)</span>
              <span className="px-2.5 py-1 bg-blue-600 dark:bg-blue-700 text-white">2.1 - 3.0 (High Contribution)</span>
            </div>
          </div>
          <span className="italic">Low Contribution ← Blue Shade Intensity → High Contribution</span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-850 rounded-xl flex items-start gap-2 text-[10px] leading-relaxed text-slate-500 mt-4">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p>
            <strong>Interpretation:</strong> This heatmap represents the normalized contribution of each Course Outcome (CO) to the overall Program Outcomes (POs), computed as <code>(Final CO Attainment × Mapping Strength) / 3</code>. Darker cells identify high-impact combinations where student outcomes strongly support program criteria.
          </p>
        </div>
      </div>

    </div>
  );
}
