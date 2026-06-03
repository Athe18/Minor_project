import React, { useState, useRef } from 'react';
import {
  Cpu,
  Database,
  Brain,
  Terminal,
  Globe,
  Settings,
  FlaskConical,
  Building2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  BookOpen,
  Target,
  Loader2,
} from 'lucide-react';
import { courseAPI } from '../api';

const DEPARTMENTS = [
  {
    id: 'Computer Engineering',
    name: 'Computer Engineering',
    short: 'CE',
    icon: Cpu,
    color: 'from-blue-500 to-indigo-600',
    description: 'Hardware, software design, and computer systems architecture.',
    supported: false,
  },
  {
    id: 'CSE (Data Science)',
    name: 'CSE (Data Science)',
    short: 'DS',
    icon: Database,
    color: 'from-cyan-500 to-blue-600',
    description: 'Big data analytics, statistics, and business intelligence.',
    supported: true,
  },
  {
    id: 'CSE (AIML)',
    name: 'CSE (AIML)',
    short: 'AI',
    icon: Brain,
    color: 'from-purple-500 to-indigo-600',
    description: 'Artificial intelligence, deep learning, and cognitive systems.',
    supported: false,
  },
  {
    id: 'Software Engineering',
    name: 'Software Engineering',
    short: 'SE',
    icon: Terminal,
    color: 'from-emerald-500 to-teal-600',
    description: 'Software development lifecycle, design patterns, and DevOps.',
    supported: false,
  },
  {
    id: 'Information Technology',
    name: 'Information Technology',
    short: 'IT',
    icon: Globe,
    color: 'from-blue-600 to-cyan-500',
    description: 'Network systems, web technologies, and database management.',
    supported: false,
  },
  {
    id: 'Mechanical Engineering',
    name: 'Mechanical Engineering',
    short: 'ME',
    icon: Settings,
    color: 'from-orange-500 to-red-600',
    description: 'Thermodynamics, robotics, and machine design.',
    supported: false,
  },
  {
    id: 'Chemical Engineering',
    name: 'Chemical Engineering',
    short: 'CH',
    icon: FlaskConical,
    color: 'from-amber-500 to-orange-600',
    description: 'Process optimization, biotechnology, and material sciences.',
    supported: false,
  },
  {
    id: 'Civil Engineering',
    name: 'Civil Engineering',
    short: 'CV',
    icon: Building2,
    color: 'from-stone-500 to-neutral-700',
    description: 'Infrastructure design, structural mechanics, and safety.',
    supported: false,
  },
];

export default function DepartmentSelect({ facultyName, onSelect }) {
  const [step, setStep] = useState(1); // 1 = pick dept, 2 = vision & mission
  const [selectedDept, setSelectedDept] = useState(null);
  const [visionMission, setVisionMission] = useState('');
  const [visionFile, setVisionFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const handleDeptClick = (dept) => {
    setSelectedDept(dept);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedDept(null);
    setVisionMission('');
    setVisionFile(null);
  };

  const handleProceed = async () => {
    setSubmitting(true);
    try {
      // Persist vision & mission so Setup.jsx can pick it up
      localStorage.setItem('vision_mission', visionMission);
      localStorage.setItem('department', `Department of ${selectedDept.name}`);

      // If a vision file was uploaded, attempt to parse it via backend
      // (backend /api/department/setup will be called later by Setup.jsx with the full subject context)
      // For now, just proceed to the main app
      onSelect(selectedDept.id, visionMission);
    } catch (err) {
      console.error('Error during department selection:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const DeptIcon = selectedDept?.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 px-4 py-12 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl -top-60 -left-60" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-3xl -bottom-40 -right-40" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="w-full max-w-5xl z-10 space-y-8">

        {/* ── Step indicator ── */}
        <div className="flex items-center justify-center gap-3">
          {[
            { n: 1, label: 'Select Department' },
            { n: 2, label: 'Vision & Mission' },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold border transition-all duration-300 ${
                step === n
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : step > n
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {step > n ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === n ? 'text-blue-400' : step > n ? 'text-emerald-400' : 'text-slate-600'}`}>
                {label}
              </span>
              {n < 2 && <div className={`w-10 h-px ${step > n ? 'bg-emerald-500/50' : 'bg-slate-700'} transition-colors`} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Department Selection ── */}
        {step === 1 && (
          <>
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 bg-slate-800/40 border border-slate-700/30 px-4 py-2 rounded-full text-xs text-blue-400 font-medium mx-auto shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                Step 1 of 2 — Accreditation Workspace Activation
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight font-sans">
                Welcome, {facultyName || 'Dr. Atharva Kamble'}
              </h2>
              <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                Select your academic department to initialize the NBA / NAAC OBE outcome-based attainment analytics engine.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {DEPARTMENTS.map((dept) => {
                const Icon = dept.icon;
                return (
                  <button
                    key={dept.id}
                    disabled={!dept.supported}
                    onClick={() => handleDeptClick(dept)}
                    className={`group relative flex flex-col items-start text-left bg-slate-900/60 backdrop-blur-xl border rounded-3xl p-6 transition-all duration-350 select-none w-full ${
                      dept.supported
                        ? 'border-slate-800/80 hover:border-blue-500/40 hover:translate-y-[-4px] shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer'
                        : 'border-slate-950 opacity-40 cursor-not-allowed filter grayscale'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${dept.color} flex items-center justify-center text-white font-bold text-lg shadow-lg ${dept.supported ? 'group-hover:scale-105 transition-transform duration-300' : ''} mb-5`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{dept.short} Department</span>
                      {!dept.supported && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded font-bold uppercase tracking-wider">Locked</span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors flex items-center gap-1.5 w-full justify-between">
                      {dept.name}
                      {dept.supported && (
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-350 text-blue-400" />
                      )}
                    </h3>
                    <p className="text-slate-450 text-xs leading-relaxed group-hover:text-slate-350 transition-colors">
                      {dept.supported ? dept.description : 'Academic catalog and OBE mapping rules under development.'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <p className="text-slate-600 text-xs">
                * Selected department configuration determines the target Performance Indicators (PIs) and Accreditation templates.
              </p>
            </div>
          </>
        )}

        {/* ── STEP 2: Vision & Mission ── */}
        {step === 2 && selectedDept && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 bg-slate-800/40 border border-slate-700/30 px-4 py-2 rounded-full text-xs text-purple-400 font-medium mx-auto shadow-md">
                <Target className="w-3.5 h-3.5" />
                Step 2 of 2 — Department Vision & Mission
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${selectedDept.color} flex items-center justify-center text-white shadow-lg`}>
                  <DeptIcon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Selected Department</p>
                  <h3 className="text-white font-extrabold text-lg">{selectedDept.name}</h3>
                </div>
              </div>
              <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
                The Department Vision & Mission is the <strong className="text-white">source document</strong> from which 
                <strong className="text-purple-400"> Performance Indicators (PIs)</strong> are generated. 
                PIs drive all CO-PO articulation calculations for NBA/NAAC accreditation.
              </p>
            </div>

            {/* Vision & Mission form card */}
            <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/40 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl">
              
              {/* Info banner */}
              <div className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                <BookOpen className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-400 leading-relaxed">
                  <span className="font-bold text-purple-300 block mb-1">Why this matters for PI generation</span>
                  The LLM uses your Vision & Mission to derive department-specific competency statements and Performance Indicators (PIs) 
                  aligned to PO1–PO12. These PIs are the backbone of the CO-PI-PO mapping chain that determines articulation levels.
                </div>
              </div>

              {/* Text area */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Department Vision & Mission Statement <span className="text-purple-400">*</span>
                </label>
                <textarea
                  value={visionMission}
                  onChange={(e) => setVisionMission(e.target.value)}
                  placeholder={`Example:\n\nVision: To be a nationally recognized center of excellence in Data Science education, producing graduates who create data-driven solutions for societal and industry challenges.\n\nMission:\n• To provide rigorous, industry-relevant training in data engineering, machine learning, and analytics.\n• To foster research, ethical reasoning, and lifelong learning skills.\n• To build collaborations with industry and research bodies for experiential education.`}
                  rows={8}
                  className="block w-full px-4 py-3 bg-slate-950/80 border border-slate-700/60 rounded-2xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all resize-none leading-relaxed"
                />
                <p className="text-xs text-slate-600 mt-1.5">
                  Paste your official department Vision & Mission document text. The more detailed, the better the PI generation quality.
                </p>
              </div>

              {/* OR Upload PDF */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/40" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-slate-900/70 text-slate-600 text-xs font-bold uppercase tracking-wider">Or upload a file</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Upload Vision & Mission PDF / TXT (Optional)
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
                    visionFile
                      ? 'border-purple-500/40 bg-purple-500/5'
                      : 'border-slate-700/50 hover:border-purple-500/30 hover:bg-slate-800/30'
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      setVisionFile(f || null);
                    }}
                  />
                  {visionFile ? (
                    <div className="flex items-center justify-center gap-2 text-purple-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-semibold truncate max-w-xs">{visionFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm font-semibold">Choose PDF or TXT file</span>
                      <span className="text-xs">Supports .pdf and .txt — up to 10MB</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1.5">
                  If you upload a file, its text will be used alongside any text entered above.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  onClick={handleProceed}
                  disabled={submitting || (!visionMission.trim() && !visionFile)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/15 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Activate Workspace
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {(!visionMission.trim() && !visionFile) && (
                <p className="text-xs text-amber-500/70 text-center">
                  Please enter your Vision & Mission text or upload a file to continue.
                </p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
