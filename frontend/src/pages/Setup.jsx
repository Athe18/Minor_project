import React, { useState, useEffect } from 'react';
import { ChevronRight, GraduationCap, BookOpen, ArrowLeft, CheckCircle2, Loader2, TestTube2 } from 'lucide-react';
import api from '../api';

// ─── Static data ────────────────────────────────────────────────────────────
const YEAR_THRESHOLDS = {
  FY: { lvl1: 50, lvl2: 55, lvl3: 60 },
  SY: { lvl1: 60, lvl2: 65, lvl3: 70 },
  TY: { lvl1: 65, lvl2: 75, lvl3: 80 },
};

const YEAR_OPTIONS = [
  { 
    value: 'FY', 
    label: 'First Year (FY)',   
    short: 'FY', 
    icon: BookOpen, 
    style: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', 
    hoverBorder: 'hover:border-sky-500/40 hover:shadow-sky-500/[0.03]',
    iconColor: 'text-sky-500 bg-sky-500/10 dark:bg-sky-500/20',
    semLabel: 'Sem 1 & 2' 
  },
  { 
    value: 'SY', 
    label: 'Second Year (SY)',  
    short: 'SY', 
    icon: TestTube2, 
    style: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',  
    hoverBorder: 'hover:border-indigo-500/40 hover:shadow-indigo-500/[0.03]',
    iconColor: 'text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20',
    semLabel: 'Sem 3 & 4' 
  },
  { 
    value: 'TY', 
    label: 'Third Year (TY)',   
    short: 'TY', 
    icon: GraduationCap, 
    style: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', 
    hoverBorder: 'hover:border-purple-500/40 hover:shadow-purple-500/[0.03]',
    iconColor: 'text-purple-500 bg-purple-500/10 dark:bg-purple-500/20',
    semLabel: 'Sem 5 & 6' 
  },
];

const SEM_OPTIONS = {
  FY: ['Semester 1', 'Semester 2'],
  SY: ['Semester 3', 'Semester 4'],
  TY: ['Semester 5', 'Semester 6'],
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const isLab = (name) =>
  /\blab\b/i.test(name);

export default function Setup({ setActiveTab, refreshState, readOnly }) {
  // Wizard state
  const [step, setStep]           = useState(1);   // 1=year, 2=semester, 3=subject
  const [year, setYear]           = useState('');
  const [semester, setSemester]   = useState('');
  const [subject, setSubject]     = useState('');
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Fetch curriculum catalogue on mount
  useEffect(() => {
    api.get('/curriculum').then(r => setCurriculum(r.data)).catch(console.error);
  }, []);

  // Available subjects for the chosen year+semester
  const availableSubjects = (() => {
    if (!curriculum || !year || !semester) return [];
    return curriculum['CSE (Data Science)']?.[year]?.[semester] || [];
  })();

  const theorySubjects = availableSubjects.filter(s => !isLab(s));
  const labSubjects    = availableSubjects.filter(s =>  isLab(s));

  // Step handlers
  const handleYearSelect = (y) => {
    setYear(y);
    setSemester('');
    setSubject('');
    localStorage.setItem('selected_year', y);
    setStep(2);
    setError('');
  };

  const handleSemesterSelect = (sem) => {
    setSemester(sem);
    setSubject('');
    setStep(3);
    setError('');
  };

  const handleSubjectSelect = (sub) => {
    setSubject(sub);
  };

  const handleProceed = async () => {
    if (!subject) { setError('Please select a subject first.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/workflow/academic-setup', {
        department: localStorage.getItem('department') || 'Department of Computer Engineering',
        vision_mission: localStorage.getItem('vision_mission') || '',
        year,
        semester,
        subject_name: subject,
      });
      localStorage.setItem('selected_year', year);
      localStorage.setItem('selected_semester', semester);
      localStorage.setItem('selected_subject', subject);
      localStorage.setItem('active_subject_id', subject);
      if (refreshState) await refreshState(subject);
      setActiveTab('cos');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to configure course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicators ─────────────────────────────────────────────────────
  const STEPS = [
    { n: 1, label: 'Select Year' },
    { n: 2, label: 'Select Semester' },
    { n: 3, label: 'Select Subject' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-sans tracking-tight">Course Setup</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure your course in 3 simple steps — Year → Semester → Subject.
        </p>
      </div>

      {/* Progress strip */}
      <div className="glass-panel p-4 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step > s.n
                  ? 'bg-emerald-500 text-white'
                  : step === s.n
                    ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-400'
              }`}>
                {step > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${step === s.n ? 'text-blue-500' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}

        {/* Active selection summary */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {year && (
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold">{year}</span>
          )}
          {semester && (
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">{semester}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* ── STEP 1: YEAR ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="glass-panel p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans">
                  Step 1 — Select Year of Study
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Attainment thresholds are auto-configured per NBA norms
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1 text-xs text-slate-450 hover:text-slate-655 dark:hover:text-slate-350 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Cancel Setup
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {YEAR_OPTIONS.map((opt) => {
              const t = YEAR_THRESHOLDS[opt.value];
              const CardIcon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleYearSelect(opt.value)}
                  className={`group relative flex flex-col items-start text-left bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-500/[0.03] hover:-translate-y-1 transition-all duration-300 cursor-pointer w-full ${opt.hoverBorder}`}
                >
                  {/* Top header row with Icon and Short label */}
                  <div className="flex justify-between items-center w-full">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${opt.iconColor}`}>
                      <CardIcon className="w-5 h-5" />
                    </div>
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${opt.style}`}>
                      {opt.short}
                    </span>
                  </div>

                  <span className="text-base font-bold text-slate-850 dark:text-slate-100 mt-5">{opt.label}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{opt.semLabel}</span>

                  {/* Clean Visual Grid of Data Tiles for Thresholds */}
                  <div className="mt-6 w-full space-y-2 border-t border-slate-100 dark:border-slate-850 pt-4">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">NBA Targets</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/60 transition-colors group-hover:bg-slate-100/50 dark:group-hover:bg-slate-950/80">
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">LEVEL 1</span>
                        <span className="text-[11px] font-bold text-slate-750 dark:text-slate-300 mt-0.5">≥ {t.lvl1}%</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/60 transition-colors group-hover:bg-slate-100/50 dark:group-hover:bg-slate-950/80">
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">LEVEL 2</span>
                        <span className="text-[11px] font-bold text-slate-750 dark:text-slate-300 mt-0.5">≥ {t.lvl2}%</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850/60 transition-colors group-hover:bg-slate-100/50 dark:group-hover:bg-slate-950/80">
                        <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">LEVEL 3</span>
                        <span className="text-[11px] font-bold text-slate-750 dark:text-slate-300 mt-0.5">≥ {t.lvl3}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Circle Styled Chevron Arrow */}
                  <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:border-blue-500/20 group-hover:bg-blue-500/5 group-hover:translate-x-0.5 transition-all duration-200">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: SEMESTER ─────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="glass-panel p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans">
                  Step 2 — Select Semester
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose which semester you are teaching
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(SEM_OPTIONS[year] || []).map((sem) => (
              <button
                key={sem}
                onClick={() => handleSemesterSelect(sem)}
                className="group relative flex flex-col items-start text-left bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-5 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/[0.02] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer w-full"
              >
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/10 dark:border-indigo-500/20">
                  {sem.replace('Semester ', 'Sem ')}
                </span>
                
                <span className="text-sm font-bold text-slate-850 dark:text-slate-100 mt-3">{sem}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Click to configure course outcomes</span>
                
                <ChevronRight className="absolute right-4 top-[50%] -translate-y-1/2 w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>

          <div className="border-t dark:border-slate-800 pt-5">
            <button
              onClick={() => setStep(1)}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs border dark:border-slate-850"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Year Selection
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SUBJECT ──────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="glass-panel p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans">
                  Step 3 — Select Subject
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {year} · {semester} · CSE (Data Science)
                </p>
              </div>
            </div>
            <button
              onClick={() => { setStep(2); setSubject(''); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          {!curriculum ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading subjects...
            </div>
          ) : (
            <div className="space-y-5">
              {/* Theory subjects */}
              {theorySubjects.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Theory Subjects</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {theorySubjects.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => handleSubjectSelect(sub)}
                        className={`w-full flex items-center justify-between text-left px-4 py-3 rounded-xl border transition-all duration-150 ${
                          subject === sub
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-500/40 hover:bg-blue-500/5 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="text-sm font-semibold">{sub}</span>
                        {subject === sub && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lab subjects */}
              {labSubjects.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TestTube2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Lab / Practical Subjects</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {labSubjects.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => handleSubjectSelect(sub)}
                        className={`w-full flex items-center justify-between text-left px-4 py-3 rounded-xl border transition-all duration-150 ${
                          subject === sub
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="text-sm font-semibold">{sub}</span>
                        {subject === sub && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableSubjects.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No subjects found for {year} — {semester}. Please contact your department administrator.
                </div>
              )}
            </div>
          )}

          {/* Proceed CTA */}
          {subject ? (
            <div className="border-t dark:border-slate-800 pt-5 space-y-3">
              <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-bold text-blue-500">Selected Course:</p>
                <p>{subject}</p>
                <p className="text-slate-400">{year} · {semester} · CSE (Data Science)</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(2); setSubject(''); }}
                  className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs border dark:border-slate-850"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleProceed}
                  disabled={loading || readOnly}
                  className={`flex-[2] py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-xs ${
                    readOnly 
                      ? 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed opacity-60 shadow-none' 
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 shadow-lg'
                  }`}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Configuring Course...</>
                  ) : readOnly ? (
                    <><ChevronRight className="w-4 h-4" /> Read-Only View Mode</>
                  ) : (
                    <><ChevronRight className="w-4 h-4" /> Proceed to Course Outcomes</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t dark:border-slate-800 pt-5">
              <button
                type="button"
                onClick={() => { setStep(2); setSubject(''); }}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs border dark:border-slate-850"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Semester Selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
