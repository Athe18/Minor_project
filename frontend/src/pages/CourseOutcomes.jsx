import React, { useState, useEffect } from 'react';
import { coAPI } from '../api';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Save, 
  RefreshCw, 
  Edit3, 
  ArrowRight,
  MessageSquare,
  TrendingUp,
  Award
} from 'lucide-react';

export default function CourseOutcomes({ courseState, refreshState }) {
  const [numCos, setNumCos] = useState(6);
  const [cos, setCos] = useState([]);
  const [validation, setValidation] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [editStatement, setEditStatement] = useState('');
  const [editLevel, setEditLevel] = useState(3);
  const [editKeyword, setEditKeyword] = useState('');

  useEffect(() => {
    if (courseState?.cos) {
      setCos(courseState.cos);
    }
    // Set validation status if available
    if (courseState?.audit_trail) {
      // Find the last validation log if available
      const validationLogs = courseState.audit_trail.filter(l => l.agent === 'COValidatorAgent' && l.action === 'result');
      if (validationLogs.length > 0) {
        const lastLog = validationLogs[validationLogs.length - 1];
        // We can mock validation state
        setValidation({
          passed: lastLog.detail.includes('Passed=True') || lastLog.detail.includes('Issues=0'),
          issues: courseState.co_validation_feedback ? courseState.co_validation_feedback.split('\n') : [],
          suggestions: []
        });
      }
    }
  }, [courseState]);

  const handleGenerate = async () => {
    setLoading(true);
    setValidation(null);
    try {
      const response = await coAPI.generate(numCos);
      setCos(response.data.cos);
      setValidation(response.data.validation);
      refreshState();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate Course Outcomes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await coAPI.update(cos);
      alert('Course outcomes saved successfully!');
      refreshState();
    } catch (err) {
      alert('Failed to save course outcomes.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAll = async () => {
    try {
      await coAPI.approve();
      alert('All Course Outcomes approved and finalized!');
      refreshState();
    } catch (err) {
      alert('Failed to approve Course Outcomes.');
    }
  };

  const handleStartEdit = (index, co) => {
    setEditIndex(index);
    setEditStatement(co.statement);
    setEditLevel(co.blooms_level);
    setEditKeyword(co.blooms_keyword);
  };

  const handleSaveEdit = (index) => {
    const updated = [...cos];
    updated[index] = {
      ...updated[index],
      statement: editStatement,
      blooms_level: parseInt(editLevel),
      blooms_keyword: editKeyword,
      validation_status: 'approved' // clear pending/rejection on manually editing
    };
    setCos(updated);
    setEditIndex(null);
  };

  const handleRegenerate = async (e) => {
    e.preventDefault();
    if (!feedback) return;
    setRegenerating(true);
    try {
      const response = await coAPI.regenerate(feedback, numCos);
      setCos(response.data.cos);
      setValidation(response.data.validation);
      setFeedback('');
      refreshState();
    } catch (err) {
      alert('Failed to regenerate COs.');
    } finally {
      setRegenerating(false);
    }
  };

  const getBloomBadgeClass = (lvl) => {
    if (lvl >= 5) return 'badge-purple';
    if (lvl === 4) return 'badge-blue';
    return 'badge-green';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight">Course Outcome (CO) Engineering</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate and validate NBA-compliant Course Outcomes aligned with Bloom's Taxonomy levels (L3 to L6).
          </p>
        </div>
        
        {cos.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Edits
            </button>
            <button
              onClick={handleApproveAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/10 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Lock & Approve All
            </button>
          </div>
        )}
      </div>

      {/* Main Panel */}
      {cos.length === 0 ? (
        <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 mx-auto">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Generate Course Outcomes</h3>
            <p className="text-sm text-slate-400 mt-1">The AI curriculum agent will parse your syllabus text and generate outcomes across Bloom's Levels 3 to 6 (Apply, Analyze, Evaluate, Create).</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Number of COs:</label>
            <select
              value={numCos}
              onChange={(e) => setNumCos(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
            >
              <option value="4">4 COs</option>
              <option value="6">6 COs (Recommended)</option>
              <option value="8">8 COs</option>
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !courseState?.subject_name}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? 'AI Agent parsing and generating...' : !courseState?.subject_name ? 'Please complete Setup first' : 'Trigger CO Generator Agent'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CO List */}
          <div className="lg:col-span-2 space-y-4">
            {cos.map((co, idx) => (
              <div key={co.co_id} className={`glass-card p-5 border-l-4 ${co.validation_status === 'approved' ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
                {editIndex === idx ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">{co.co_id}</span>
                      <input
                        type="text"
                        placeholder="Keyword, e.g. Design"
                        value={editKeyword}
                        onChange={(e) => setEditKeyword(e.target.value)}
                        className="px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                      />
                      <select
                        value={editLevel}
                        onChange={(e) => setEditLevel(parseInt(e.target.value))}
                        className="px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                      >
                        <option value="3">L3 - Apply</option>
                        <option value="4">L4 - Analyze</option>
                        <option value="5">L5 - Evaluate</option>
                        <option value="6">L6 - Create</option>
                      </select>
                    </div>
                    <textarea
                      value={editStatement}
                      onChange={(e) => setEditStatement(e.target.value)}
                      rows="2"
                      className="block w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditIndex(null)}
                        className="px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(idx)}
                        className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500"
                      >
                        Apply Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-850 dark:text-white">{co.co_id}</span>
                        <span className={getBloomBadgeClass(co.blooms_level)}>
                          Bloom L{co.blooms_level} ({co.blooms_keyword})
                        </span>
                        {co.validation_status === 'approved' ? (
                          <span className="text-[10px] text-emerald-500 font-bold uppercase">Finalized</span>
                        ) : (
                          <span className="text-[10px] text-amber-500 font-bold uppercase">Critique Pending</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleStartEdit(idx, co)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-350 mt-2.5 leading-relaxed">
                      {co.statement}
                    </p>

                    {co.rejection_reason && (
                      <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs">
                        <strong>Quality Alert:</strong> {co.rejection_reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Validation & Feedback Panel */}
          <div className="space-y-6">
            
            {/* Validation Panel Card */}
            {validation && (
              <div className={`glass-panel p-5 border-t-4 ${validation.passed ? 'border-t-emerald-500' : 'border-t-rose-500'}`}>
                <div className="flex items-center gap-2 mb-4">
                  {validation.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  )}
                  <h4 className="font-bold text-sm uppercase tracking-wider">Quality Audit Report</h4>
                </div>
                
                {validation.passed ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    All Course Outcomes successfully passed NBA validation constraints (Bloom's Taxonomy verbs, action verb mapping, duplicates check).
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-rose-500 font-medium">Validation failed with the following issues:</p>
                    <ul className="text-xs space-y-1.5 list-disc pl-4 text-slate-600 dark:text-slate-400">
                      {validation.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.suggestions && validation.suggestions.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
                    <p className="text-xs font-bold uppercase text-slate-400 mb-1.5">Regeneration Suggestions</p>
                    <ul className="text-xs space-y-1 text-slate-500 pl-4 list-decimal">
                      {validation.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Critique Feedback Form */}
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold text-sm uppercase tracking-wider">Human-in-the-Loop Critique</h4>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Provide custom criteria to improve the generated outcomes (e.g., "focus more on transactions", "add more design problems").
              </p>

              <form onSubmit={handleRegenerate} className="space-y-3.5">
                <textarea
                  required
                  rows="3"
                  placeholder="Enter improvement feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="block w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Count:</label>
                    <select
                      value={numCos}
                      onChange={(e) => setNumCos(parseInt(e.target.value))}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs"
                    >
                      <option value="4">4</option>
                      <option value="6">6</option>
                      <option value="8">8</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={regenerating}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
                  >
                    {regenerating ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Critiquing...
                      </>
                    ) : (
                      <>
                        Refine Outcomes
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
