import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  BookOpen, 
  Grid3X3, 
  GraduationCap, 
  TrendingUp, 
  Lightbulb, 
  FileText, 
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FileQuestion
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, dark, setDark, handleLogout, activeCourse }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const primaryItems = [
    { id: 'dashboard', label: 'Academic Dashboard', icon: LayoutDashboard },
    { id: 'workspace', label: 'Subject Workspace', icon: Sparkles, requireCourse: true },
  ];

  const advancedItems = [
    { id: 'setup', label: 'Course Setup', icon: Settings },
    { id: 'cos', label: 'Course Outcomes', icon: BookOpen },
    { id: 'mapping', label: 'CO-PO Mapping', icon: Grid3X3 },
    { id: 'philosophy', label: 'Teaching Philosophy', icon: GraduationCap },
    { id: 'assignment', label: 'Assignment Generator', icon: FileQuestion },
    { id: 'attainment', label: 'Marks & Attainment', icon: TrendingUp },
    { id: 'recommendations', label: 'AI Recommendations', icon: Lightbulb },
    { id: 'reports', label: 'Reports & Logs', icon: FileText },
  ];

  // Auto-expand advanced section if an advanced tab is active
  useEffect(() => {
    const isAdvancedActive = advancedItems.some(item => item.id === activeTab);
    if (isAdvancedActive) {
      setAdvancedOpen(true);
    }
  }, [activeTab]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 dark:bg-slate-950 border-r border-slate-800">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-fit px-2.5 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-blue-500/20">
          MIT
        </div>
        <div>
          <h1 className="font-bold text-white leading-tight">MIT AOE erp model</h1>
          <span className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Accreditation Panel</span>
        </div>
      </div>

      {/* Course Info Widget */}
      {activeCourse?.subject_name && (
        <div className="mx-4 mt-5 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
          <p className="text-[10px] text-slate-505 font-bold uppercase tracking-wider">Active Course</p>
          <h4 className="text-sm font-semibold text-slate-200 mt-1 truncate" title={activeCourse.subject_name}>
            {activeCourse.subject_name}
          </h4>
          <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium bg-slate-700 text-slate-350 rounded">
            Year: {activeCourse.year}
          </span>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {/* Primary Items */}
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isDisabled = item.requireCourse && !activeCourse?.subject_name;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (isDisabled) {
                  alert("Please select or create a subject from the Dashboard first.");
                  return;
                }
                setActiveTab(item.id);
                setMobileOpen(false);
              }}
              disabled={isDisabled}
              className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isDisabled
                  ? 'opacity-40 cursor-not-allowed text-slate-600'
                  : isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15' 
                    : 'hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isDisabled ? 'text-slate-700' : 'text-slate-400 group-hover:text-white'}`} />
              {item.label}
            </button>
          );
        })}

        {/* Collapsible Advanced Section */}
        <div className="pt-4">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center justify-between w-full px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors"
          >
            <span>Advanced Manual Overrides</span>
            {advancedOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {advancedOpen && (
            <div className="mt-1 space-y-1 pl-2 border-l border-slate-800 ml-4">
              {advancedItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isDisabled = item.id !== 'setup' && !activeCourse?.subject_name;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (isDisabled) {
                        alert("Please select or create a subject from the Dashboard first.");
                        return;
                      }
                      setActiveTab(item.id);
                      setMobileOpen(false);
                    }}
                    disabled={isDisabled}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-150 ${
                      isDisabled
                        ? 'opacity-30 cursor-not-allowed text-slate-600'
                        : isActive 
                          ? 'bg-slate-800 text-white font-bold' 
                          : 'hover:bg-slate-850 hover:text-white text-slate-400'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-500' : 'text-slate-500'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer Controls */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-slate-500 font-medium">Appearance</span>
          <button 
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-xl hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 dark:bg-slate-950 text-white p-4 border-b border-slate-850 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-fit px-2 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            MIT
          </div>
          <span className="font-semibold text-sm">MIT AOE erp model</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg bg-slate-800">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 h-full">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
