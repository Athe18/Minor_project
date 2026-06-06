import React, { useState, useEffect } from 'react';
import { philosophyAPI } from '../api';
import { Sparkles, Copy, Check, RefreshCw, AlertTriangle, GraduationCap } from 'lucide-react';

export default function Philosophy({ courseState, refreshState, activeSubjectId, readOnly }) {
  const [philosophy, setPhilosophy] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (courseState && courseState.subject_name === activeSubjectId) {
      setPhilosophy(courseState.teaching_philosophy || '');
    }
  }, [courseState, activeSubjectId]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await philosophyAPI.generate();
      setPhilosophy(response.data.philosophy);
      refreshState();
    } catch (err) {
      alert('Failed to generate teaching philosophy. Make sure you generated COs first.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(philosophy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-sans tracking-tight">Teaching Philosophy Statement</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Auto-generate an accreditation-friendly pedagogical philosophy aligned with your Course Outcomes, Bloom's Taxonomy, and active assessment strategies.
        </p>
      </div>

      {!philosophy ? (
        <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 mx-auto">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Generate Philosophy Statement</h3>
            <p className="text-sm text-slate-400 mt-1">
              Synthesize a professional Statement detailing curriculum delivery, assessment mapping, and student feedback loops.
            </p>
          </div>
          {!readOnly ? (
            <button
              onClick={handleGenerate}
              disabled={loading || !courseState?.cos?.length}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Synthesizing statement...' : !courseState?.cos?.length ? 'Prerequisite: Generate COs first' : 'Generate Statement'}
            </button>
          ) : (
            <div className="p-4 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-xl text-center text-xs font-semibold">
              No pedagogy statement generated yet. Pedagogical philosophy is configured by Course Faculty.
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm uppercase tracking-wider">OBE Philosophy Card</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Text
                  </>
                )}
              </button>
              
              {!readOnly && (
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-850/60 shadow-inner">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line first-letter:text-3xl first-letter:font-bold first-letter:text-blue-600 first-letter:float-left first-letter:mr-2">
              {philosophy}
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30">
            <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Accreditation Tip:</strong> Copy this teaching philosophy statement directly into Section 6B of your Course Articulation dossier to satisfy the NAAC student-centric pedagogy criteria.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
