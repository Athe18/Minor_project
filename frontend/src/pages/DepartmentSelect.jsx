import React from 'react';
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
  ArrowRight
} from 'lucide-react';

const DEPARTMENTS = [
  {
    id: 'Computer Engineering',
    name: 'Computer Engineering',
    short: 'CE',
    icon: Cpu,
    color: 'from-blue-500 to-indigo-600',
    description: 'Hardware, software design, and computer systems architecture.'
  },
  {
    id: 'CSE (Data Science)',
    name: 'CSE (Data Science)',
    short: 'DS',
    icon: Database,
    color: 'from-cyan-500 to-blue-600',
    description: 'Big data analytics, statistics, and business intelligence.'
  },
  {
    id: 'CSE (AIML)',
    name: 'CSE (AIML)',
    short: 'AI',
    icon: Brain,
    color: 'from-purple-500 to-indigo-600',
    description: 'Artificial intelligence, deep learning, and cognitive systems.'
  },
  {
    id: 'Software Engineering',
    name: 'Software Engineering',
    short: 'SE',
    icon: Terminal,
    color: 'from-emerald-500 to-teal-600',
    description: 'Software development lifecycle, design patterns, and DevOps.'
  },
  {
    id: 'Information Technology',
    name: 'Information Technology',
    short: 'IT',
    icon: Globe,
    color: 'from-blue-600 to-cyan-500',
    description: 'Network systems, web technologies, and database management.'
  },
  {
    id: 'Mechanical Engineering',
    name: 'Mechanical Engineering',
    short: 'ME',
    icon: Settings,
    color: 'from-orange-500 to-red-600',
    description: 'Thermodynamics, robotics, and machine design.'
  },
  {
    id: 'Chemical Engineering',
    name: 'Chemical Engineering',
    short: 'CH',
    icon: FlaskConical,
    color: 'from-amber-500 to-orange-600',
    description: 'Process optimization, biotechnology, and material sciences.'
  },
  {
    id: 'Civil Engineering',
    name: 'Civil Engineering',
    short: 'CV',
    icon: Building2,
    color: 'from-stone-500 to-neutral-700',
    description: 'Infrastructure design, structural mechanics, and safety.'
  }
];

export default function DepartmentSelect({ facultyName, onSelect }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 px-4 py-12 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl -top-60 -left-60" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-3xl -bottom-40 -right-40" />

      <div className="w-full max-w-5xl z-10 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-slate-800/40 border border-slate-700/30 px-4 py-2 rounded-full text-xs text-blue-400 font-medium mx-auto shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
            Accreditation Workspace Activation
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight font-sans">
            Welcome, {facultyName || 'Dr. Atharva Kamble'}
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Please select your academic department to initialize the NBA / NAAC OBE outcome-based attainment analytics engine.
          </p>
        </div>

        {/* Department Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {DEPARTMENTS.map((dept) => {
            const Icon = dept.icon;
            return (
              <button
                key={dept.id}
                onClick={() => onSelect(dept.id)}
                className="group relative flex flex-col items-start text-left bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 hover:border-slate-700/60 rounded-3xl p-6 transition-all duration-350 hover:translate-y-[-4px] shadow-xl hover:shadow-2xl hover:shadow-blue-500/5 select-none"
              >
                {/* Badge/Icon Container */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${dept.color} flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform duration-300 mb-5`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Text Details */}
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">{dept.short} Department</span>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors flex items-center gap-1.5 w-full justify-between">
                  {dept.name}
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-350 text-blue-400" />
                </h3>
                <p className="text-slate-450 text-xs leading-relaxed group-hover:text-slate-350 transition-colors">
                  {dept.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Info Tip */}
        <div className="text-center">
          <p className="text-slate-600 text-xs">
            * Selected department configuration determines the target Performance Indicators (PIs) and Accreditation templates.
          </p>
        </div>
      </div>
    </div>
  );
}
