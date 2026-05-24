import React, { useState, useEffect, useRef } from 'react';
import { mappingAPI, aiAPI } from '../api';
import {
  Sparkles,
  CheckCircle2,
  Save,
  RefreshCw,
  Info,
  Layers,
  HelpCircle,
  Loader2,
  UserCheck,
  ChevronDown,
  ChevronRight,
  X,
  Brain,
  BarChart3,
} from 'lucide-react';

// ─── Explanation Popup ──────────────────────────────────────────────────────
function ExplanationPopup({ cell, cos, pos, onClose, onStrengthChange, onSuggestMapping }) {
  const co = cos.find(c => c.co_id === cell.co_id);
  const po = pos.find(p => p.po_id === cell.po_id);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  const strengthColors = {
    3: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    2: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300',
    1: 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300',
    0: 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500',
  };

  const getBloomsReasoning = () => {
    if (!co) return '';
    const level = co.blooms_level || 1;
    const kw = co.blooms_keyword || 'Remember';
    const map = {
      1: `This CO operates at Bloom's L1 (Remember, verb: "${kw}"). Recall-level understanding builds foundational knowledge required for ${cell.po_id}.`,
      2: `This CO operates at Bloom's L2 (Understand, verb: "${kw}"). Conceptual comprehension enables students to explain ideas relevant to ${cell.po_id}.`,
      3: `This CO operates at Bloom's L3 (Apply, verb: "${kw}"). Applying principles to solve domain-specific problems directly supports ${cell.po_id}.`,
      4: `This CO operates at Bloom's L4 (Analyze, verb: "${kw}"). Deconstructing complex systems cultivates analytical depth required for ${cell.po_id}.`,
      5: `This CO operates at Bloom's L5 (Evaluate, verb: "${kw}"). Justifying decisions and comparing designs trains engineering trade-off skills needed for ${cell.po_id}.`,
      6: `This CO operates at Bloom's L6 (Create, verb: "${kw}"). Synthesizing components to build new systems directly aligns with design criteria of ${cell.po_id}.`,
    };
    return map[level] || map[1];
  };

  const getImprovementSuggestion = () => {
    const suggestions = {
      PO1: 'Incorporate fundamental mathematical derivations, physical laws, or domain-specific scientific principles into assignments and tutorials.',
      PO2: 'Include open-ended problems, troubleshooting exercises, or diagnostic questions where students must isolate root causes.',
      PO3: 'Introduce system design tasks, circuit synthesis, or interface design challenges in course projects.',
      PO4: 'Include experimental lab tasks, data collection and validation plots, or comparative reviews of standard literature.',
      PO5: 'Mandate usage of industry-standard tools (e.g. Git, MATLAB, CAD) in practical lab tasks and final projects.',
      PO6: 'Discuss societal impacts, safety standards, or building codes related to engineering design.',
      PO7: 'Introduce topics on energy efficiency, lifecycle carbon footprints, or waste management practices.',
      PO8: 'Hold discussions on software/hardware plagiarism, code of conduct, or safety responsibility.',
      PO9: 'Structure group laboratory projects with defined individual sub-tasks and peer assessment rubrics.',
      PO10: 'Require formal technical reports, code documentation, or visual presentations.',
      PO11: 'Include basic budget estimates, task schedules (Gantt charts), or feasibility calculations in project work.',
      PO12: 'Encourage self-study of advanced tools/methods not covered in class through online MOOCs or industry docs.',
    };
    return suggestions[cell.po_id] || 'Incorporate active learning assignments or project deliverables mapped specifically to this program outcome.';
  };

  const fetchAiSuggestion = async () => {
    setLoadingSuggestion(true);
    try {
      const res = await aiAPI.suggestMapping(cell.co_id, cell.po_id);
      setAiSuggestion(res.data.suggestion);
    } catch {
      setAiSuggestion('Failed to generate suggestion. Please try again.');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-extrabold border ${strengthColors[cell.strength] || strengthColors[0]}`}>
              {cell.strength > 0 ? cell.strength : '−'}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{cell.co_id} → {cell.po_id}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">CO-PO Articulation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* CO & PO Context */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Course Outcome</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{cell.co_id}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{co?.statement || '—'}</p>
            </div>
            <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-3">
              <p className="text-[10px] font-bold text-purple-500 uppercase mb-1">Program Outcome</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{cell.po_id}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{po?.statement || '—'}</p>
            </div>
          </div>

          {/* Strength selector */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Contribution Strength</p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map(val => (
                <button
                  key={val}
                  onClick={() => onStrengthChange(val)}
                  className={`py-2 rounded-xl font-extrabold border text-sm transition-all ${
                    cell.strength === val
                      ? val === 3 ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                        : val === 2 ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                        : val === 1 ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : 'bg-slate-500 text-white border-slate-600'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  {val === 0 ? '−' : val}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400" />3 = High</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" />2 = Medium</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-400" />1 = Low</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-300" />− = None</span>
            </div>
          </div>

          {/* AI Reasoning */}
          {cell.strength > 0 && (
            <>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">AI Reasoning</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border dark:border-slate-800 italic">
                  {cell.reasoning || 'No reasoning available.'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Bloom's Taxonomy Alignment</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 italic">
                  {getBloomsReasoning()}
                </p>
              </div>
            </>
          )}

          {/* No mapping — suggestions */}
          {cell.strength === 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Suggestions to Establish Alignment</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 italic">
                {getImprovementSuggestion()}
              </p>

              {/* AI Suggest button */}
              {!aiSuggestion && !loadingSuggestion && (
                <button
                  onClick={fetchAiSuggestion}
                  className="mt-3 w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Ask AI How to Map This
                </button>
              )}
              {loadingSuggestion && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  Generating AI suggestions...
                </div>
              )}
              {aiSuggestion && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-blue-500 uppercase">AI Alignment Guide</p>
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 leading-relaxed whitespace-pre-line">
                    {aiSuggestion}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PI Cell Popup ───────────────────────────────────────────────────────────
function PiCellPopup({ cell, cos, pis, onClose, onToggle, onFetchSuggestion, suggestion, loadingSuggestion }) {
  const co = cos.find(c => c.co_id === cell.co_id);
  const pi = pis.find(p => p.pi_id === cell.pi_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold border ${
              cell.mapped === 'Y'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}>
              {cell.mapped === 'Y' ? 'Y' : 'N'}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{cell.co_id} → {cell.pi_id}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">PI Alignment (Accreditation)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* CO context */}
          <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3">
            <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Course Outcome</p>
            <p className="text-xs font-semibold">{cell.co_id}: {co?.statement || '—'}</p>
          </div>
          {/* PI context */}
          {pi && (
            <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3">
              <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Performance Indicator</p>
              <p className="text-xs font-semibold">{pi.pi_id}: {pi.pi_statement}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Under {pi.po_id}</p>
            </div>
          )}

          {/* Toggle */}
          <div className="flex gap-2">
            {['Y', 'N'].map(val => (
              <button
                key={val}
                onClick={() => onToggle(cell.co_id, cell.pi_id)}
                className={`flex-1 py-2 rounded-xl font-bold border text-sm transition-all ${
                  cell.mapped === val
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/15'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                {val === 'Y' ? '✓ Mapped' : '✗ Unmapped'}
              </button>
            ))}
          </div>

          {/* Rationale or suggestions */}
          {cell.mapped === 'Y' ? (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Alignment Rationale</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border dark:border-slate-800 italic">
                {cell.reasoning || 'Mapped alignment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Current Status</p>
                <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border dark:border-slate-800">
                  {cell.suggestion || 'No specific NBA suggestion loaded yet.'}
                </p>
              </div>

              {!suggestion && !loadingSuggestion && (
                <button
                  onClick={onFetchSuggestion}
                  className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Ask AI How to Map This PI
                </button>
              )}
              {loadingSuggestion && (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  Generating NBA alignment guidelines...
                </div>
              )}
              {suggestion && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase">AI Alignment Guide</p>
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10 leading-relaxed whitespace-pre-line">
                    {suggestion}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Mapping Page ───────────────────────────────────────────────────────
export default function Mapping({ courseState, refreshState }) {
  const [pos, setPos] = useState([]);
  const [cos, setCos] = useState([]);
  const [localPiMappings, setLocalPiMappings] = useState([]);
  const [localMappings, setLocalMappings] = useState([]);

  // Loading states
  const [loadingCoPo, setLoadingCoPo] = useState(false);
  const [loadingPi, setLoadingPi] = useState(false);
  const [savingCoPo, setSavingCoPo] = useState(false);
  const [savingPi, setSavingPi] = useState(false);

  // Success banners
  const [coPoSuccess, setCoPoSuccess] = useState('');
  const [piSuccess, setPiSuccess] = useState('');

  // Popup state
  const [artPopupCell, setArtPopupCell] = useState(null);   // CO-PO popup
  const [piPopupCell, setPiPopupCell] = useState(null);     // PI popup
  const [piSuggestion, setPiSuggestion] = useState('');
  const [loadingPiSuggestion, setLoadingPiSuggestion] = useState(false);

  // PI table expand/collapse
  const [expandedPos, setExpandedPos] = useState({});

  const toggleExpandPo = (poId) => {
    setExpandedPos(prev => ({ ...prev, [poId]: !prev[poId] }));
  };

  useEffect(() => {
    if (courseState) {
      setCos(courseState.cos || []);
      setPos(courseState.pos || []);
      setLocalPiMappings(courseState.pi_mappings || []);
      setLocalMappings(courseState.mappings || []);
    }
  }, [courseState]);

  // Clear PI suggestion when popup changes
  useEffect(() => {
    setPiSuggestion('');
  }, [piPopupCell]);

  // ── CO-PO Matrix: Generate (LLM semantic) — first time only ──────────────
  const handleGenerateCoPo = async () => {
    setLoadingCoPo(true);
    setCoPoSuccess('');
    try {
      const res = await mappingAPI.generate();
      setLocalMappings(res.data.mappings || []);
      setCoPoSuccess('CO-PO Articulation Matrix generated by AI — review and save.');
      setTimeout(() => setCoPoSuccess(''), 6000);
      refreshState();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate CO-PO mappings.');
    } finally {
      setLoadingCoPo(false);
    }
  };

  // ── CO-PO Matrix: Save ─────────────────────────────────────────────────────
  const handleSaveCoPo = async () => {
    setSavingCoPo(true);
    try {
      await mappingAPI.update(localMappings);
      setCoPoSuccess('CO-PO Articulation Matrix saved successfully!');
      setTimeout(() => setCoPoSuccess(''), 4000);
      refreshState();
    } catch {
      alert('Failed to save CO-PO mapping changes.');
    } finally {
      setSavingCoPo(false);
    }
  };

  // ── CO-PO: cell click → open popup ────────────────────────────────────────
  const handleArtCellClick = (co_id, po_id) => {
    const m = localMappings.find(x => x.co_id === co_id && x.po_id === po_id) || {
      co_id, po_id, strength: 0, reasoning: ''
    };
    setArtPopupCell({ ...m });
    setPiPopupCell(null);
  };

  // Update strength from popup
  const handleStrengthChange = (val) => {
    const { co_id, po_id } = artPopupCell;
    let updated = [...localMappings];
    const idx = updated.findIndex(x => x.co_id === co_id && x.po_id === po_id);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], strength: val };
    } else {
      updated.push({ co_id, po_id, strength: val, reasoning: 'Manually set.' });
    }
    setLocalMappings(updated);
    setArtPopupCell(prev => ({ ...prev, strength: val }));
  };

  // ── PI Matrix: Generate — first time only ─────────────────────────────────
  const handleGeneratePi = async () => {
    setLoadingPi(true);
    setPiSuccess('');
    try {
      const res = await mappingAPI.generatePI();
      setLocalPiMappings(res.data.pi_mappings || []);
      setPiSuccess('PI Alignment Matrix generated by AI — review and save.');
      setTimeout(() => setPiSuccess(''), 6000);
      refreshState();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate PI mappings.');
    } finally {
      setLoadingPi(false);
    }
  };

  // ── PI Matrix: Save ────────────────────────────────────────────────────────
  const handleSavePi = async () => {
    setSavingPi(true);
    try {
      await mappingAPI.updatePI(localPiMappings);
      setPiSuccess('PI Alignment Matrix saved successfully!');
      setTimeout(() => setPiSuccess(''), 4000);
      refreshState();
    } catch {
      alert('Failed to save PI mapping changes.');
    } finally {
      setSavingPi(false);
    }
  };

  // ── PI Matrix: cell click → open popup ────────────────────────────────────
  const handlePiCellClick = (co_id, pi_id) => {
    const existing = localPiMappings.find(m => m.co_id === co_id && m.pi_id === pi_id) || {
      co_id, pi_id, mapped: 'N', reasoning: '', suggestion: ''
    };
    setPiPopupCell({ ...existing });
    setArtPopupCell(null);
    setPiSuggestion('');
  };

  // Toggle PI mapping (does NOT affect CO-PO matrix)
  const handlePiToggle = (co_id, pi_id) => {
    let updated = [...localPiMappings];
    const idx = updated.findIndex(m => m.co_id === co_id && m.pi_id === pi_id);
    const wasY = idx >= 0 && updated[idx].mapped === 'Y';
    const newMapped = wasY ? 'N' : 'Y';

    if (idx >= 0) {
      updated[idx] = {
        ...updated[idx],
        mapped: newMapped,
        reasoning: newMapped === 'Y' ? (updated[idx].reasoning || 'Manually mapped.') : '',
        suggestion: newMapped === 'N' ? (updated[idx].suggestion || 'Incorporate topics addressing this indicator.') : ''
      };
    } else {
      updated.push({
        co_id, pi_id, mapped: newMapped,
        reasoning: newMapped === 'Y' ? 'Manually mapped.' : '',
        suggestion: newMapped === 'N' ? 'Incorporate topics addressing this indicator.' : ''
      });
    }
    setLocalPiMappings(updated);
    const matched = updated.find(m => m.co_id === co_id && m.pi_id === pi_id);
    setPiPopupCell(matched ? { ...matched } : null);
    // NOTE: CO-PO matrix is NOT recalculated — it stays LLM-based
  };

  // Fetch AI suggestion for unmapped PI
  const fetchPiSuggestion = async () => {
    if (!piPopupCell) return;
    setLoadingPiSuggestion(true);
    setPiSuggestion('');
    try {
      const res = await mappingAPI.suggestPIMapping(piPopupCell.co_id, piPopupCell.pi_id);
      setPiSuggestion(res.data.suggestion);
    } catch {
      setPiSuggestion('Failed to generate suggestion. Please try again.');
    } finally {
      setLoadingPiSuggestion(false);
    }
  };

  // ── Strength cell style ────────────────────────────────────────────────────
  const getStrengthStyle = (strength, selected = false) => {
    let base = '';
    if (strength === 3) base = 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30';
    else if (strength === 2) base = 'bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30';
    else if (strength === 1) base = 'bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/30';
    else base = 'bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900';
    return `${base}${selected ? ' ring-2 ring-blue-500 ring-inset' : ''}`;
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (cos.length === 0) {
    return (
      <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-4 my-12">
        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 mx-auto">
          <Layers className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Incomplete Prerequisites</h3>
          <p className="text-sm text-slate-400 mt-1">
            You must configure your Course Setup and generate Course Outcomes (COs) before establishing mapping matrices.
          </p>
        </div>
      </div>
    );
  }

  const pisList = courseState?.performance_indicators || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: CO-PO ARTICULATION MATRIX (Primary - LLM Based)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                CO-PO Articulation Matrix
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Generated using LLM semantic reasoning · CO meaning · PO meaning · Bloom's taxonomy
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {localMappings.length === 0 && (
              <button
                onClick={handleGenerateCoPo}
                disabled={loadingCoPo}
                className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-xl shadow-md transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
              >
                {loadingCoPo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate with AI
              </button>
            )}
            <button
              onClick={handleSaveCoPo}
              disabled={savingCoPo}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              {savingCoPo ? 'Saving...' : 'Save Matrix'}
            </button>
          </div>
        </div>

        {/* CO-PO Success banner */}
        {coPoSuccess && (
          <div className="flex items-center gap-2.5 bg-blue-950/20 border border-blue-800/40 rounded-xl px-4 py-3 text-sm text-blue-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{coPoSuccess}</span>
          </div>
        )}

        {/* CO-PO Articulation Table */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <UserCheck className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Articulation Matrix</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any cell to inspect AI reasoning, Bloom's alignment, or manually adjust the contribution level.
              </p>
            </div>
          </div>

          {localMappings.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <Brain className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No CO-PO mapping generated yet.</p>
              <p className="text-xs text-slate-500">Click <strong>Generate with AI</strong> to create the articulation matrix using LLM semantic reasoning.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-center text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-left w-20">CO / PO</th>
                      {pos.map(po => (
                        <th
                          key={po.po_id}
                          className="p-3 border-r border-slate-200 dark:border-slate-800 w-16"
                          title={po.statement}
                        >
                          {po.po_id}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cos.map(co => (
                      <tr key={co.co_id} className="hover:bg-slate-500/5 transition-colors border-b border-slate-200 dark:border-slate-800">
                        <td
                          className="p-3 border-r border-slate-200 dark:border-slate-800 font-bold bg-slate-50 dark:bg-slate-900/40 text-left align-middle"
                          title={co.statement}
                        >
                          {co.co_id}
                        </td>
                        {pos.map(po => {
                          const m = localMappings.find(x => x.co_id === co.co_id && x.po_id === po.po_id) || { strength: 0 };
                          const isSelected = artPopupCell && artPopupCell.co_id === co.co_id && artPopupCell.po_id === po.po_id;
                          return (
                            <td
                              key={po.po_id}
                              onClick={() => handleArtCellClick(co.co_id, po.po_id)}
                              className={`p-3 border-r border-slate-200 dark:border-slate-800 text-sm font-extrabold cursor-pointer transition-all select-none ${getStrengthStyle(m.strength, isSelected)}`}
                              title="Click to inspect AI reasoning"
                            >
                              {m.strength > 0 ? m.strength : '−'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="text-[10px] text-slate-500 font-bold flex flex-wrap gap-4 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-400 rounded" />
                  3 = High (Substantial)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-amber-500/20 border border-amber-400 rounded" />
                  2 = Medium (Moderate)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-rose-500/20 border border-rose-400 rounded" />
                  1 = Low (Slight)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-slate-100 border border-slate-300 dark:border-slate-700 rounded" />
                  − = No Mapping
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: PI ALIGNMENT MATRIX (Supporting - Accreditation)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                PI Alignment Matrix
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Supporting accreditation layer · Competency coverage · NBA validation · Independent from CO-PO matrix
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {!localPiMappings.some(m => m.mapped === 'Y') && (
              <button
                onClick={handleGeneratePi}
                disabled={loadingPi}
                className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-xl shadow-md transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
              >
                {loadingPi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Auto-Map with AI
              </button>
            )}
            <button
              onClick={handleSavePi}
              disabled={savingPi}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              {savingPi ? 'Saving...' : 'Save PI Matrix'}
            </button>
          </div>
        </div>

        {/* PI Success banner */}
        {piSuccess && (
          <div className="flex items-center gap-2.5 bg-purple-950/20 border border-purple-800/40 rounded-xl px-4 py-3 text-sm text-purple-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{piSuccess}</span>
          </div>
        )}

        {/* Info notice */}
        <div className="flex items-start gap-2.5 bg-indigo-950/10 border border-indigo-800/20 rounded-xl px-4 py-3 text-xs text-indigo-400">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            The PI Alignment Matrix is a <strong>supporting accreditation tool</strong> used for competency analysis, PI coverage tracking, and NBA validation. 
            Changes here do <strong>not</strong> affect the CO-PO Articulation Matrix above — those values are determined solely by AI semantic reasoning.
          </span>
        </div>

        {/* PI Table */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Layers className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Performance Indicator Alignment</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any cell to inspect rationale or toggle alignment. Double-click to quickly toggle Y/N.
              </p>
            </div>
          </div>

          {pisList.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No Performance Indicators defined.</p>
              <p className="text-xs text-slate-500">Set up your department in the Setup page to generate PIs for accreditation support.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-center text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-left w-16">PO</th>
                      <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-left w-24">Competency</th>
                      <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-left min-w-[200px]">Performance Indicator (PI)</th>
                      {cos.map(co => (
                        <th
                          key={co.co_id}
                          className="p-3 border-r border-slate-200 dark:border-slate-800 w-16 font-bold"
                          title={co.statement}
                        >
                          {co.co_id}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const posList = Array.from({ length: 12 }, (_, i) => `PO${i + 1}`);
                      const rows = [];

                      posList.forEach(poId => {
                        const poPIs = pisList.filter(pi => pi.po_id === poId);
                        const totalPIs = poPIs.length;
                        const isExpanded = expandedPos[poId] !== false; // default expanded

                        if (totalPIs === 0) {
                          rows.push(
                            <tr key={`${poId}-none`} className="border-b border-slate-200 dark:border-slate-800">
                              <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-bold bg-slate-50 dark:bg-slate-900/40 text-left">{poId}</td>
                              <td className="p-3 border-r text-left text-slate-400 italic" colSpan={2}>No performance indicators defined.</td>
                              {cos.map(co => (
                                <td key={co.co_id} className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-400">—</td>
                              ))}
                            </tr>
                          );
                          return;
                        }

                        // Group by competency
                        const compGroups = {};
                        poPIs.forEach(pi => {
                          if (!compGroups[pi.competency_id]) {
                            compGroups[pi.competency_id] = { id: pi.competency_id, statement: pi.competency_statement, pis: [] };
                          }
                          compGroups[pi.competency_id].pis.push(pi);
                        });
                        const comps = Object.values(compGroups);

                        if (!isExpanded) {
                          // Collapsed row
                          rows.push(
                            <tr key={`${poId}-collapsed`} className="bg-purple-500/5 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-500/5 transition-colors">
                              <td
                                className="p-3 border-r border-slate-200 dark:border-slate-800 font-extrabold text-center bg-slate-50 dark:bg-slate-900/40 select-none cursor-pointer"
                                onClick={() => toggleExpandPo(poId)}
                              >
                                <ChevronRight className="w-3.5 h-3.5 text-purple-500 inline mr-1" />
                                {poId}
                              </td>
                              <td className="p-3 border-r text-left text-slate-400 italic font-normal" colSpan={2}>
                                {totalPIs} indicators — click to expand
                              </td>
                              {cos.map(co => {
                                const mapped = poPIs.filter(pi => {
                                  const m = localPiMappings.find(x => x.co_id === co.co_id && x.pi_id === pi.pi_id);
                                  return m && m.mapped === 'Y';
                                }).length;
                                return (
                                  <td key={co.co_id} className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                                    {mapped}/{totalPIs}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                          return;
                        }

                        // Expanded rows
                        let poRendered = false;
                        comps.forEach(comp => {
                          let compRendered = false;
                          comp.pis.forEach(pi => {
                            rows.push(
                              <tr key={pi.pi_id} className="hover:bg-slate-500/5 transition-colors border-b border-slate-200 dark:border-slate-800">
                                {!poRendered && (
                                  <td
                                    rowSpan={totalPIs + 1}
                                    className="p-3 border-r border-slate-200 dark:border-slate-800 font-extrabold text-slate-800 dark:text-slate-100 bg-slate-50/80 dark:bg-slate-900/60 align-middle text-center select-none cursor-pointer"
                                    onClick={() => toggleExpandPo(poId)}
                                  >
                                    <ChevronDown className="w-3 h-3 text-purple-500 block mx-auto mb-0.5" />
                                    <span className="text-sm">{poId}</span>
                                  </td>
                                )}
                                {!compRendered && (
                                  <td
                                    rowSpan={comp.pis.length}
                                    className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-left font-semibold align-middle bg-slate-50/30 dark:bg-slate-900/20"
                                    title={comp.statement}
                                  >
                                    {comp.id}
                                  </td>
                                )}
                                <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-left whitespace-normal">
                                  <span className="font-bold text-purple-500 mr-1">{pi.pi_id}</span>
                                  {pi.pi_statement}
                                </td>
                                {cos.map(co => {
                                  const m = localPiMappings.find(x => x.co_id === co.co_id && x.pi_id === pi.pi_id) || { mapped: 'N' };
                                  const isMapped = m.mapped === 'Y';
                                  const isSelected = piPopupCell && piPopupCell.co_id === co.co_id && piPopupCell.pi_id === pi.pi_id;
                                  return (
                                    <td
                                      key={co.co_id}
                                      onClick={() => handlePiCellClick(co.co_id, pi.pi_id)}
                                      onDoubleClick={() => handlePiToggle(co.co_id, pi.pi_id)}
                                      className={`p-2 border-r border-slate-200 dark:border-slate-800 text-sm font-bold select-none cursor-pointer transition-all ${
                                        isMapped
                                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30'
                                          : 'bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900'
                                      } ${isSelected ? 'ring-2 ring-purple-500 ring-inset' : ''}`}
                                      title="Click to inspect · Double-click to toggle"
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

                        // Coverage summary row
                        rows.push(
                          <tr key={`${poId}-summary`} className="bg-purple-500/5 border-b border-slate-200 dark:border-slate-800 font-bold">
                            <td className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-bold text-left" colSpan={3}>
                              PI Coverage for {poId} ({totalPIs} indicators)
                            </td>
                            {cos.map(co => {
                              const mapped = poPIs.filter(pi => {
                                const m = localPiMappings.find(x => x.co_id === co.co_id && x.pi_id === pi.pi_id);
                                return m && m.mapped === 'Y';
                              }).length;
                              const pct = Math.round((mapped / totalPIs) * 100);
                              return (
                                <td key={co.co_id} className="p-2.5 border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-300 text-xs font-bold">
                                  {mapped}/{totalPIs}
                                  <span className="block text-[9px] text-slate-400 font-normal">{pct}%</span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });

                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>

              {/* PI Legend */}
              <div className="text-[10px] text-slate-500 font-bold flex flex-wrap gap-4 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-400 rounded" />
                  Y = Mapped to this PI
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded" />
                  N = Not Mapped
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-purple-500/15 border border-purple-400/30 rounded" />
                  Coverage row shows PI count/% for accreditation
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Popups ─────────────────────────────────────────────────────────── */}
      {artPopupCell && (
        <ExplanationPopup
          cell={artPopupCell}
          cos={cos}
          pos={pos}
          onClose={() => setArtPopupCell(null)}
          onStrengthChange={handleStrengthChange}
          onSuggestMapping={() => {}}
        />
      )}

      {piPopupCell && (
        <PiCellPopup
          cell={piPopupCell}
          cos={cos}
          pis={pisList}
          onClose={() => { setPiPopupCell(null); setPiSuggestion(''); }}
          onToggle={handlePiToggle}
          onFetchSuggestion={fetchPiSuggestion}
          suggestion={piSuggestion}
          loadingSuggestion={loadingPiSuggestion}
        />
      )}
    </div>
  );
}
