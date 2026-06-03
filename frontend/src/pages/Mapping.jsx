import React, { useState, useEffect, useRef } from 'react';
import { mappingAPI, aiAPI, courseAPI } from '../api';
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
  Database,
  BookOpen,
  Target,
} from 'lucide-react';

// ─── Explanation Popup ───�// ─── Explanation Popup ────────────────
function ExplanationPopup({ cell, cos, pos, piMappings = [], pis = [], onClose, onStrengthChange, onSuggestMapping }) {
  const co = cos.find(c => c.co_id === cell.co_id);
  const po = pos.find(p => p.po_id === cell.po_id);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  // Find all PIs under the PO
  const poPis = pis.filter(pi => pi.po_id === cell.po_id);
  const totalPis = poPis.length;
  // Find mapped PIs under the PO for this CO
  const mappedPis = poPis.filter(pi => {
    const pm = piMappings.find(x => x.co_id === cell.co_id && x.pi_id === pi.pi_id);
    return pm && pm.mapped === 'Y';
  });
  const mappedCount = mappedPis.length;
  const coveragePct = totalPis > 0 ? Math.round((mappedCount / totalPis) * 100) : 0;
  
  // Cap at 100% just in case
  const displayCoveragePct = coveragePct > 100 ? 100 : coveragePct;

  let thresholdApplied = '';
  if (mappedCount === 0) {
    thresholdApplied = 'Coverage = 0% (No Mapping)';
  } else if (displayCoveragePct <= 33) {
    thresholdApplied = '1%–33% (Level 1)';
  } else if (displayCoveragePct <= 66) {
    thresholdApplied = '34%–66% (Level 2)';
  } else {
    thresholdApplied = '67%–100% (Level 3)';
  }

  const parseStructuredReasoning = (text) => {
    if (!text) return [];
    
    const lines = text.split('\n');
    const sections = [];
    
    lines.forEach(line => {
      const cleanLine = line.trim().replace(/^-\s+/, '');
      if (!cleanLine) return;
      
      const match = cleanLine.match(/^\*\*(.*?)\*\*:\s*(.*)/);
      if (match) {
        sections.push({
          title: match[1],
          content: match[2]
        });
      } else {
        if (sections.length > 0) {
          sections[sections.length - 1].content += ' ' + cleanLine;
        } else {
          sections.push({
            title: 'General Analysis',
            content: cleanLine
          });
        }
      }
    });
    
    return sections;
  };

  const getSectionIcon = (title) => {
    const t = title.toLowerCase();
    if (t.includes('semantic') || t.includes('alignment')) return <Brain className="w-3.5 h-3.5 text-blue-500" />;
    if (t.includes('competency') || t.includes('pi')) return <Layers className="w-3.5 h-3.5 text-purple-500" />;
    if (t.includes('evidence') || t.includes('academic') || t.includes('attainment')) return <Database className="w-3.5 h-3.5 text-emerald-500" />;
    if (t.includes('bloom') || t.includes('compatibility') || t.includes('level')) return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
    if (t.includes('reason') || t.includes('no mapping')) return <Info className="w-3.5 h-3.5 text-slate-400" />;
    return <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />;
  };

  const getSectionBg = (title) => {
    const t = title.toLowerCase();
    if (t.includes('semantic')) return 'bg-blue-500/5 border-blue-500/10';
    if (t.includes('competency')) return 'bg-purple-500/5 border-purple-500/10';
    if (t.includes('evidence') || t.includes('attainment')) return 'bg-emerald-500/5 border-emerald-500/10';
    if (t.includes('bloom') || t.includes('level')) return 'bg-amber-500/5 border-amber-500/10';
    return 'bg-slate-500/5 border-slate-500/10';
  };

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
    setAiSuggestion(null);
    try {
      const res = await aiAPI.suggestMapping(cell.co_id, cell.po_id);
      setAiSuggestion(res.data);
    } catch {
      setAiSuggestion({ error: 'Failed to generate suggestions. Please try again.' });
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
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors"
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
                  disabled={true}
                  className={`py-2 rounded-xl font-extrabold border text-sm cursor-not-allowed opacity-80 ${
                    cell.strength === val
                      ? val === 3 ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                        : val === 2 ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                        : val === 1 ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : 'bg-slate-500 text-white border-slate-600'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  {val === 0 ? '−' : val}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 italic leading-normal">
              This value is mathematically derived from PI Coverage. To change this, modify the corresponding PI mappings in the Alignment Matrix below.
            </p>
            <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400" />3 = High</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" />2 = Medium</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-400" />1 = Low</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-300" />− = None</span>
            </div>
          </div>

          {/* PI Coverage & Accreditation Metrics Card for Mapped Cells */}
          {cell.strength > 0 && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <h4 className="font-bold text-slate-850 dark:text-slate-250 text-xs">PI Coverage & Accreditation Metrics</h4>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total PIs under {cell.po_id}:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{totalPis}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mapped PIs:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{mappedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coverage:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{mappedCount}/{totalPis} = {displayCoveragePct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Threshold Applied:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{thresholdApplied}</span>
                </div>
                <div className="col-span-2 flex justify-between border-t dark:border-slate-800 pt-2 mt-1">
                  <span className="text-slate-400 font-semibold text-xs">Final Articulation:</span>
                  <span className="font-bold text-emerald-500 text-xs">Level {cell.strength}</span>
                </div>
              </div>
              
              {mappedPis.length > 0 && (
                <div className="pt-2 border-t dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mapped PIs:</span>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-650 dark:text-slate-350">
                    {mappedPis.map(pi => (
                      <li key={pi.pi_id} className="leading-snug">
                        <span className="font-bold text-purple-500 mr-1">{pi.pi_id}</span>
                        {pi.pi_statement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* PI Coverage & Accreditation Metrics Card for Unmapped Cells */}
          {cell.strength === 0 && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-2">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                <h4 className="font-bold text-slate-850 dark:text-slate-250 text-xs">PI Coverage & Accreditation Metrics</h4>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mapped PIs:</span>
                  <span className="font-semibold text-rose-500">No PI mapped</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coverage:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">0%</span>
                </div>
              </div>
            </div>
          )}

          {/* Structured Explainability Log */}
          {cell.strength > 0 && (
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                OBE Alignment & Explainability Log
              </p>
              
              {(() => {
                const sections = parseStructuredReasoning(cell.reasoning);
                if (sections.length === 0) {
                  return (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border dark:border-slate-800">
                        {cell.reasoning || "No detailed alignment reasoning available."}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Bloom's Taxonomy Alignment</p>
                        <p className="text-xs text-slate-600 dark:text-slate-305 leading-relaxed bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 italic">
                          {getBloomsReasoning()}
                        </p>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {sections.map((sec, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 border rounded-xl space-y-1 transition-all hover:shadow-sm ${getSectionBg(sec.title)}`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {getSectionIcon(sec.title)}
                          <span>{sec.title}</span>
                        </div>
                        <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed pl-5 whitespace-pre-wrap">
                          {sec.content}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Suggestions or Structured Explanation for Unmapped Cells */}
          {cell.strength === 0 && (
            <div className="space-y-4">
              {(() => {
                const sections = parseStructuredReasoning(cell.reasoning);
                const getSectionContent = (titleName) => {
                  const found = sections.find(s => s.title.toLowerCase().trim() === titleName.toLowerCase().trim());
                  return found ? found.content : '';
                };

                const reasonForNoMapping = aiSuggestion?.reason_for_no_mapping || getSectionContent('Reason for No Mapping') || (typeof cell.reasoning === 'string' && !cell.reasoning.includes('**') ? cell.reasoning : '') || 'No direct performance indicators mapped between this CO and PO.';
                const suggestedActivities = aiSuggestion?.activity_suggestions || getSectionContent('Suggested Activities');
                const suggestedAssignments = aiSuggestion?.assignment_suggestions || getSectionContent('Suggested Assignments');
                const suggestedAssessments = aiSuggestion?.assessment_suggestions || getSectionContent('Suggested Assessments');
                const syllabusRecommendations = aiSuggestion?.target_pi || getSectionContent('Syllabus Recommendations');

                return (
                  <div className="space-y-4">
                    {/* Reason for No Mapping */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reason for No Mapping</span>
                      </div>
                      <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed pl-5 whitespace-pre-wrap">
                        {reasonForNoMapping}
                      </p>
                    </div>

                    {/* AI Suggestions Header */}
                    <div className="border-t dark:border-slate-850 pt-3">
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Suggestions to Improve Future Coverage
                      </p>
                      
                      <div className="space-y-3">
                        {/* Target PI / Syllabus Recommendations */}
                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-200 text-xs">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            <span>Target PI & Syllabus Recommendations</span>
                          </div>
                          <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed pl-5 whitespace-pre-wrap">
                            {syllabusRecommendations || getImprovementSuggestion()}
                          </p>
                        </div>

                        {/* Suggested Activities */}
                        {(suggestedActivities) && (
                          <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-200 text-xs">
                              <Brain className="w-3.5 h-3.5 text-purple-500" />
                              <span>Pedagogical & Activity Suggestions</span>
                            </div>
                            <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed pl-5 whitespace-pre-wrap">
                              {suggestedActivities}
                            </p>
                          </div>
                        )}

                        {/* Suggested Assignments */}
                        {(suggestedAssignments) && (
                          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200 text-xs">
                              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                              <span>Assignment Suggestions</span>
                            </div>
                            <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed pl-5 whitespace-pre-wrap">
                              {suggestedAssignments}
                            </p>
                          </div>
                        )}

                        {/* Suggested Assessments */}
                        {(suggestedAssessments) && (
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Assessment & Exam Suggestions</span>
                            </div>
                            <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed pl-5 whitespace-pre-wrap">
                              {suggestedAssessments}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

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
              {aiSuggestion?.error && (
                <div className="mt-3 text-xs text-rose-550 font-semibold bg-rose-50 dark:bg-rose-950/20 p-3 border border-rose-200 dark:border-rose-800 rounded-xl">
                  {aiSuggestion.error}
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

const DEPT_VM_PRESETS = {
  "Department of Computer Engineering": {
    vision: "To be a premier center of excellence in computer engineering education, producing industry-ready graduates with strong research and ethical values.",
    mission: "1. To provide state-of-the-art infrastructure and education in hardware and software design.\n2. To encourage innovative research and collaborations with industry.\n3. To instill ethical behavior, leadership, and lifelong learning skills."
  },
  "Department of CSE (Data Science)": {
    vision: "To be a nationally recognized center of excellence in Data Science education, producing graduates who create data-driven solutions for societal and industry challenges.",
    mission: "1. To provide rigorous, industry-relevant training in data engineering, machine learning, and analytics.\n2. To foster research, ethical reasoning, and lifelong learning skills.\n3. To build collaborations with industry and research bodies for experiential education."
  },
  "Department of CSE (AIML)": {
    vision: "To produce globally competent artificial intelligence and machine learning professionals who can design cognitive systems to automate processes and solve real-world problems.",
    mission: "1. To offer robust theoretical and practical foundations in AI, machine learning, and deep learning.\n2. To promote interdisciplinary research and design projects.\n3. To cultivate professional ethics, social awareness, and continuous self-learning."
  },
  "Department of Software Engineering": {
    vision: "To lead in software engineering education and research, developing software professionals capable of building secure, robust, and scalable software solutions.",
    mission: "1. To deliver high-quality instruction in software architectures, modern tools, and DevOps practices.\n2. To promote industry collaboration and hands-on coding labs.\n3. To foster academic integrity, teamwork, and adaptiveness to tech changes."
  },
  "Department of Information Technology": {
    vision: "To be a hub of quality education in Information Technology, preparing graduates to manage complex digital infrastructures and systems.",
    mission: "1. To offer extensive training in web technologies, databases, cloud computing, and cyber security.\n2. To support innovative student projects and internship programs.\n3. To build strong foundations in professional ethics and lifelong learning."
  },
  "Department of Mechanical Engineering": {
    vision: "To develop mechanical engineers who design innovative thermal and mechanical systems for sustainable industrial progress.",
    mission: "1. To provide sound engineering knowledge in thermodynamics, robotics, and CAD design.\n2. To encourage practical hands-on workshop training.\n3. To promote safety standards and green engineering principles."
  },
  "Department of Chemical Engineering": {
    vision: "To nurture chemical engineers who create eco-friendly process technologies and material solutions for global sustainability.",
    mission: "1. To teach thermodynamics, transport phenomena, and reactor kinetics comprehensively.\n2. To foster research in material science and process safety.\n3. To develop professional ethics and project management skills."
  },
  "Department of Civil Engineering": {
    vision: "To build engineering leaders who design safe, resilient, and sustainable infrastructure for societal development.",
    mission: "1. To impart engineering principles in structural mechanics, hydraulics, and geotechnical design.\n2. To integrate safety and environmental impact analysis in civil designs.\n3. To cultivate teamwork, project management, and life-long learning."
  }
};

// ─── Main Mapping Page ───────────────────────────────────────────────────────
export default function Mapping({ courseState, refreshState, activeSubjectId }) {
  const [pos, setPos] = useState([]);
  const [cos, setCos] = useState([]);
  const [localPiMappings, setLocalPiMappings] = useState([]);
  const [localMappings, setLocalMappings] = useState([]);

  // Loading states
  const [loadingCoPo, setLoadingCoPo] = useState(false);
  const [loadingPi, setLoadingPi] = useState(false);
  const [savingCoPo, setSavingCoPo] = useState(false);
  const [savingPi, setSavingPi] = useState(false);
  const [recalculatingCoPo, setRecalculatingCoPo] = useState(false);

  // Success banners
  const [coPoSuccess, setCoPoSuccess] = useState('');
  const [piSuccess, setPiSuccess] = useState('');

  // Popup state
  const [artPopupCell, setArtPopupCell] = useState(null);   // CO-PO popup
  const [piPopupCell, setPiPopupCell] = useState(null);     // PI popup
  const [piSuggestion, setPiSuggestion] = useState('');
  const [loadingPiSuggestion, setLoadingPiSuggestion] = useState(false);

  // Vision & Mission setup states
  const [isEditingVM, setIsEditingVM] = useState(false);
  const [vmDept, setVmDept] = useState(courseState?.department || localStorage.getItem('department') || 'Department of Computer Engineering');
  const [vmVision, setVmVision] = useState('');
  const [vmMission, setVmMission] = useState('');
  const [vmFile, setVmFile] = useState(null);
  const [vmSubmitting, setVmSubmitting] = useState(false);
  const [vmError, setVmError] = useState('');

  // PI table expand/collapse
  const [expandedPos, setExpandedPos] = useState({});

  const toggleExpandPo = (poId) => {
    setExpandedPos(prev => ({ ...prev, [poId]: !prev[poId] }));
  };

  useEffect(() => {
    if (courseState && courseState.subject_name === activeSubjectId) {
      setCos(courseState.cos || []);
      setPos(courseState.pos || []);
      setLocalPiMappings(courseState.pi_mappings || []);
      setLocalMappings(courseState.mappings || []);

      const dept = courseState.department || localStorage.getItem('department') || 'Department of Computer Engineering';
      setVmDept(dept);

      if (courseState.vision_mission) {
        const text = courseState.vision_mission;
        const visionIndex = text.indexOf('Vision:');
        const missionIndex = text.indexOf('Mission:');

        if (visionIndex !== -1 && missionIndex !== -1) {
          const vText = text.substring(visionIndex + 7, missionIndex).trim();
          const mText = text.substring(missionIndex + 8).trim();
          setVmVision(vText);
          setVmMission(mText);
        } else {
          setVmVision(text);
          setVmMission('');
        }
      } else {
        const preset = DEPT_VM_PRESETS[dept] || DEPT_VM_PRESETS["Department of Computer Engineering"];
        setVmVision(preset.vision);
        setVmMission(preset.mission);
      }
    }
  }, [courseState]);

  // Auto-initialize Vision & Mission if missing in backend but stored in localStorage
  useEffect(() => {
    if (courseState && courseState.subject_name === activeSubjectId && !courseState.vision_mission && !vmSubmitting) {
      const autoInit = async () => {
        const dept = courseState.department || localStorage.getItem('department') || 'Department of Computer Engineering';
        let vm = localStorage.getItem('vision_mission');
        if (!vm) {
          const preset = DEPT_VM_PRESETS[dept] || DEPT_VM_PRESETS["Department of Computer Engineering"];
          vm = `Vision: ${preset.vision}\n\nMission:\n${preset.mission}`;
        }
        
        setVmSubmitting(true);
        try {
          const deptFormData = new FormData();
          deptFormData.append('department', dept);
          deptFormData.append('vision_mission', vm);
          await courseAPI.setupDepartment(deptFormData);
          refreshState();
        } catch (err) {
          console.error("Failed to auto-initialize Vision & Mission:", err);
        } finally {
          setVmSubmitting(false);
        }
      };
      autoInit();
    }
  }, [courseState, activeSubjectId]);

  const handleDeptChange = (e) => {
    const selected = e.target.value;
    setVmDept(selected);
    const preset = DEPT_VM_PRESETS[selected];
    if (preset) {
      setVmVision(preset.vision);
      setVmMission(preset.mission);
    }
  };

  const handleVMSubmit = async (e) => {
    e.preventDefault();

    const hasExistingVM = courseState?.vision_mission && courseState.vision_mission.trim().length > 0;
    if (hasExistingVM && !window.confirm('Regenerating Performance Indicators will reset all current CO-PI and CO-PO mappings. Are you sure you want to proceed?')) {
      return;
    }

    setVmSubmitting(true);
    setVmError('');

    try {
      const deptFormData = new FormData();
      deptFormData.append('department', vmDept);
      deptFormData.append('vision_mission', `Vision: ${vmVision}\n\nMission:\n${vmMission}`);
      if (vmFile) {
        deptFormData.append('vision_file', vmFile);
      }

      await courseAPI.setupDepartment(deptFormData);

      setIsEditingVM(false);
      refreshState();
    } catch (err) {
      setVmError(err.response?.data?.detail || 'Failed to configure Vision & Mission.');
    } finally {
      setVmSubmitting(false);
    }
  };

  // Clear PI suggestion when popup changes
  useEffect(() => {
    setPiSuggestion('');
  }, [piPopupCell]);

  const calculatePiCoverage = () => {
    const coverage = {};
    pos.forEach(po => {
      const poPis = pisList.filter(pi => pi.po_id === po.po_id);
      const total = poPis.length;
      if (total === 0) {
        coverage[po.po_id] = { percentage: 0, mapped: 0, total: 0, level: 'No Coverage' };
        return;
      }
      
      const mappedIds = new Set();
      localPiMappings.forEach(m => {
        if (m.mapped === 'Y' && poPis.some(p => p.pi_id === m.pi_id)) {
          mappedIds.add(m.pi_id);
        }
      });
      
      const mappedCount = mappedIds.size;
      const pct = Math.round((mappedCount / total) * 100);
      let level = 'No Coverage';
      if (mappedCount > 0) {
        if (pct >= 67) level = 'Level 3';
        else if (pct >= 34) level = 'Level 2';
        else level = 'Level 1';
      }
      coverage[po.po_id] = { percentage: pct, mapped: mappedCount, total: total, level };
    });
    return coverage;
  };

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
      const res = await mappingAPI.updatePI(localPiMappings);
      // The backend recalculates CO-PO strengths mathematically from the new PI data.
      // Immediately sync localMappings so the articulation matrix reflects the updated values.
      if (res.data.mappings) {
        setLocalMappings(res.data.mappings);
      }
      setPiSuccess('PI Alignment Matrix saved! CO-PO Articulation Matrix recalculated from PI coverage.');
      setTimeout(() => setPiSuccess(''), 5000);
      refreshState();
    } catch {
      alert('Failed to save PI mapping changes.');
    } finally {
      setSavingPi(false);
    }
  };

  // ── Helper: recalculate CO-PO strengths client-side from a given PI mapping list ──
  const recalculateCoPoFromPi = (updatedPiMappings) => {
    const updated = [...localMappings];
    const allPIs = courseState?.performance_indicators || [];
    pos.forEach(po => {
      const poPIs = allPIs.filter(pi => pi.po_id === po.po_id);
      const total = poPIs.length;
      cos.forEach(co => {
        if (total === 0) return;
        const mappedCount = poPIs.filter(pi => {
          const m = updatedPiMappings.find(x => x.co_id === co.co_id && x.pi_id === pi.pi_id);
          return m && m.mapped === 'Y';
        }).length;
        const pct = Math.round((mappedCount / total) * 100);
        let newStrength = 0;
        if (mappedCount > 0) {
          if (pct >= 67) newStrength = 3;
          else if (pct >= 34) newStrength = 2;
          else newStrength = 1;
        }
        const idx = updated.findIndex(x => x.co_id === co.co_id && x.po_id === po.po_id);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], strength: newStrength };
        } else {
          updated.push({ co_id: co.co_id, po_id: po.po_id, strength: newStrength, reasoning: '' });
        }
      });
    });
    return updated;
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

  // Toggle PI mapping — also recalculates CO-PO articulation strengths client-side
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
    // Recalculate CO-PO articulation matrix client-side to stay in sync with PI changes
    setLocalMappings(recalculateCoPoFromPi(updated));
  };

  // Force-recalculate CO-PO articulation matrix from PI coverage via backend
  const handleRecalculateCoPo = async () => {
    setRecalculatingCoPo(true);
    setCoPoSuccess('');
    try {
      const res = await mappingAPI.recalculate();
      if (res.data.mappings) {
        setLocalMappings(res.data.mappings);
      }
      const count = res.data.corrections || 0;
      setCoPoSuccess(
        count > 0
          ? `✓ Recalculated from PI coverage. ${count} cell(s) corrected to match mathematical thresholds.`
          : '✓ All CO-PO strengths are already consistent with PI coverage. No corrections needed.'
      );
      setTimeout(() => setCoPoSuccess(''), 6000);
      refreshState();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to recalculate CO-PO mappings.');
    } finally {
      setRecalculatingCoPo(false);
    }
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
  const hasVisionMission = courseState?.vision_mission && courseState.vision_mission.trim().length > 0;

  if (vmSubmitting && !hasVisionMission) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-650 dark:text-slate-400">
          Auto-configuring Performance Indicators for {courseState?.department || 'Department'}...
        </p>
      </div>
    );
  }

  if (!hasVisionMission || isEditingVM) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 my-6 animate-fadeIn">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-500" />
            Department Vision & Mission Setup
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure your academic department and define its Vision & Mission statement. This context will be used to generate/customize the Performance Indicators (PIs) for NBA accreditation.
          </p>
        </div>

        <div className="glass-panel p-6 lg:p-8 space-y-6">
          <form onSubmit={handleVMSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Academic Department
                </label>
                <select
                  value={vmDept}
                  onChange={handleDeptChange}
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 font-medium"
                >
                  {Object.keys(DEPT_VM_PRESETS).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Upload Vision & Mission PDF / TXT (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center relative cursor-pointer hover:border-purple-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setVmFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-500 block truncate">
                    {vmFile ? vmFile.name : 'Choose Vision & Mission File'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Vision Statement
                </label>
                <textarea
                  required
                  placeholder="Vision: To produce globally competent engineers..."
                  value={vmVision}
                  onChange={(e) => setVmVision(e.target.value)}
                  rows={6}
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 transition-all text-slate-800 dark:text-slate-100 leading-relaxed resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Mission Statement
                </label>
                <textarea
                  required
                  placeholder="Mission: 1. To provide infrastructure..."
                  value={vmMission}
                  onChange={(e) => setVmMission(e.target.value)}
                  rows={6}
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 transition-all text-slate-800 dark:text-slate-100 leading-relaxed resize-none"
                />
              </div>
            </div>

            {vmError && (
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 text-sm text-rose-400 flex items-center gap-2">
                <span>{vmError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-4">
              {isEditingVM && (
                <button
                  type="button"
                  onClick={() => setIsEditingVM(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-sm font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
              )}
              
              <button
                type="submit"
                disabled={vmSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-650 hover:bg-purple-500 text-white text-sm font-bold rounded-xl shadow-md shadow-purple-600/10 transition-all disabled:opacity-50"
              >
                {vmSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate PIs & Enable Mapping
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Accreditation Mapping Board
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Establish performance indicator alignments and inspect mathematically derived CO-PO articulation levels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Active Context</span>
            <span className="text-xs font-semibold text-purple-500">{courseState?.department}</span>
          </div>
          <button
            onClick={() => setIsEditingVM(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-sm font-semibold rounded-xl transition-all border border-slate-200 dark:border-slate-800"
          >
            <Target className="w-4 h-4 text-purple-500" />
            Edit Vision & Mission
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: OBE EVIDENCE BOARD + PI COVERAGE DASHBOARD
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-2">
            <Database className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">OBE Academic Evidence Board</h3>
              <p className="text-[10px] text-slate-400">Context gathered from previous-year records</p>
            </div>
          </div>
          
          {courseState?.previous_attainment_analysis ? (
            <div className="space-y-3.5 text-xs">
              {/* Attainment Strengths / Weaknesses */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CO Attainment Profile</span>
                <div className="flex flex-wrap gap-1.5">
                  {courseState.previous_attainment_analysis.strong_cos?.length > 0 ? (
                    courseState.previous_attainment_analysis.strong_cos.map(co => (
                      <span key={co} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-555 border border-emerald-500/10 rounded font-bold text-[10px]" title="Strong outcome attainment">
                        {co} (Strong)
                      </span>
                    ))
                  ) : null}
                  {courseState.previous_attainment_analysis.weak_cos?.length > 0 ? (
                    courseState.previous_attainment_analysis.weak_cos.map(co => (
                      <span key={co} className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/10 rounded font-bold text-[10px]" title="Weak outcome attainment - target area">
                        {co} (Weak)
                      </span>
                    ))
                  ) : null}
                  {!courseState.previous_attainment_analysis.strong_cos?.length && !courseState.previous_attainment_analysis.weak_cos?.length && (
                    <span className="text-slate-400 italic">No attainment history.</span>
                  )}
                </div>
              </div>

              {/* Assessment Coverage Gaps */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Assessment Coverage Gaps</span>
                {courseState.previous_attainment_analysis.gaps?.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1 text-slate-500 dark:text-slate-400">
                    {courseState.previous_attainment_analysis.gaps.map((gap, i) => (
                      <li key={i} className="leading-snug">{gap}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> No critical coverage gaps detected.
                  </p>
                )}
              </div>

              {/* Attainment Levels */}
              {courseState.previous_attainment_analysis.co_attainment && Object.keys(courseState.previous_attainment_analysis.co_attainment).length > 0 && (
                <div className="border-t dark:border-slate-800 pt-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Historical Attainment Scores</span>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(courseState.previous_attainment_analysis.co_attainment).slice(0, 6).map(([coId, info]) => (
                      <div key={coId} className="p-1.5 bg-slate-100 dark:bg-slate-900 border dark:border-slate-855 rounded text-center">
                        <span className="font-bold block text-[10px] text-slate-500">{coId}</span>
                        <span className="text-xs font-bold text-slate-750 dark:text-slate-350">{info.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs italic">
              No previous year attainment evidence analysis available. Click "Generate with AI" to parse evidence.
            </div>
          )}
        </div>

        {/* Right Column: PI Coverage Analytics Grid */}
        <div className="lg:col-span-2 glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-2">
            <Layers className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">PI Coverage Evidence Dashboard</h3>
              <p className="text-[10px] text-slate-400">PO Competency mapping compliance validation (Source of Truth for Articulation)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[220px] overflow-y-auto pr-1">
            {(() => {
              const coverage = calculatePiCoverage();
              const levelColors = {
                'Level 3': 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
                'Level 2': 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
                'Level 1': 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
                'No Coverage': 'bg-slate-500/10 text-slate-400 border border-slate-500/15'
              };
              
              return pos.map(po => {
                const cov = coverage[po.po_id] || { percentage: 0, mapped: 0, total: 0, level: 'No Coverage' };
                return (
                  <div 
                    key={po.po_id} 
                    className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-850 hover:border-purple-500/20 rounded-xl transition-all duration-200 group relative cursor-pointer"
                    title={`${po.po_id}: ${po.statement}`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-extrabold text-xs text-slate-700 dark:text-slate-350">{po.po_id}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${levelColors[cov.level]}`}>
                        {cov.level}
                      </span>
                    </div>
                    <div className="space-y-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-2">
                      <div>Total PIs: <span className="text-slate-700 dark:text-slate-300 font-bold">{cov.total}</span></div>
                      <div>Mapped PIs: <span className="text-slate-700 dark:text-slate-300 font-bold">{cov.mapped}</span></div>
                      <div>Coverage %: <span className="text-slate-700 dark:text-slate-300 font-bold">{cov.percentage}%</span></div>
                    </div>
                    {/* Linear progress bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          cov.percentage >= 67 ? 'bg-emerald-500' : cov.percentage >= 34 ? 'bg-amber-500' : cov.percentage > 0 ? 'bg-rose-500' : 'bg-slate-300'
                        }`} 
                        style={{ width: `${cov.percentage}%` }} 
                      />
                    </div>
                    <span className="absolute right-3 bottom-1.5 text-[9px] font-extrabold text-slate-400">{cov.percentage}%</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: PI ALIGNMENT MATRIX
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
            The PI Alignment Matrix is the <strong>source of truth</strong> for the CO-PO Articulation Matrix. 
            Toggling or saving PI mappings here <strong>directly recalculates</strong> the CO-PO articulation strengths based on PI coverage percentages.
          </span>
        </div>

        {/* PI Table */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Layers className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-105">Performance Indicator Alignment</h3>
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
                                    <ChevronDown className="w-3.5 h-3.5 text-purple-500 block mx-auto mb-0.5" />
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

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: CO-PO ARTICULATION MATRIX
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
                PI-driven · Strength derived from Performance Indicator coverage · NBA/NAAC compliant
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
            {localMappings.length > 0 && (
              <button
                onClick={handleRecalculateCoPo}
                disabled={recalculatingCoPo}
                title="Force-recalculate all CO-PO strengths from PI coverage data"
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
              >
                {recalculatingCoPo ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {recalculatingCoPo ? 'Recalculating...' : 'Sync from PI'}
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
                PI-driven · Strengths are derived mathematically from PI coverage percentages.
              </p>
            </div>
          </div>

          {/* Consistency Warning Banner */}
          {(() => {
            if (!localMappings.length || !pisList.length) return null;
            const contradictions = [];
            cos.forEach(co => {
              pos.forEach(po => {
                const poPIs = pisList.filter(pi => pi.po_id === po.po_id);
                const total = poPIs.length;
                if (total === 0) return;
                const mappedCount = poPIs.filter(pi => {
                  const m = localPiMappings.find(x => x.co_id === co.co_id && x.pi_id === pi.pi_id);
                  return m && m.mapped === 'Y';
                }).length;
                const pct = Math.round((mappedCount / total) * 100);
                let expected = 0;
                if (mappedCount > 0) {
                  if (pct >= 67) expected = 3;
                  else if (pct >= 34) expected = 2;
                  else expected = 1;
                }
                const stored = (localMappings.find(x => x.co_id === co.co_id && x.po_id === po.po_id) || {}).strength ?? 0;
                if (stored !== expected) contradictions.push(`${co.co_id}→${po.po_id}`);
              });
            });
            if (contradictions.length === 0) return null;
            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-amber-950/25 border border-amber-600/40 rounded-xl px-4 py-3 text-sm text-amber-400">
                <Info className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-bold">Consistency Warning: </span>
                  <span>{contradictions.length} cell(s) have strengths that don't match PI coverage: </span>
                  <span className="font-mono text-amber-300 text-xs">{contradictions.slice(0, 6).join(', ')}{contradictions.length > 6 ? ` +${contradictions.length - 6} more` : ''}</span>
                  <span className="block text-xs text-amber-500/80 mt-0.5">Click <strong>Sync from PI</strong> to recalculate all cells mathematically.</span>
                </div>
                <button
                  onClick={handleRecalculateCoPo}
                  disabled={recalculatingCoPo}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync from PI
                </button>
              </div>
            );
          })()}

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
