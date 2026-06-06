import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { adminAPI } from '../api';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  BookOpen, 
  UserSquare2, 
  Activity, 
  History, 
  FileSpreadsheet, 
  Settings, 
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Bell,
  ChevronDown,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

// Import subpages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminUserManagement from '../pages/admin/UserManagement';
import AdminDepartmentManagement from '../pages/admin/DepartmentManagement';
import AdminSubjectManagement from '../pages/admin/SubjectManagement';
import AdminCourseAssignment from '../pages/admin/CourseAssignment';
import AdminMonitoring from '../pages/admin/Monitoring';
import AdminAuditLogs from '../pages/admin/AuditLogs';
import AdminReports from '../pages/admin/Reports';
import AdminSettings from '../pages/admin/Settings';

export default function AdminLayout({ auth, handleLogout, dark, setDark }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState(3); // Mock initial notifications count
  const [settings, setSettings] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await adminAPI.getSettings();
        if (res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error('Failed to load branding info', err);
      }
    };
    fetchSettings();
  }, []);

  const activeTab = location.pathname.split('/')[2] || 'dashboard';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'User Directory', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'subjects', label: 'Subject Manager', icon: BookOpen },
    { id: 'assignments', label: 'Course Assignments', icon: UserSquare2 },
    { id: 'monitoring', label: 'Compliance Audit', icon: Activity },
    { id: 'audit', label: 'System Audit Logs', icon: History },
    { id: 'reports', label: 'Analytics Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Portal Settings', icon: Settings },
  ];

  const collegeName = settings?.branding_college_name || 'MIT Academy of Engineering';
  const logoText = settings?.branding_logo_text || 'MIT';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-350 dark:bg-slate-950 border-r border-slate-800">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-fit px-2.5 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-blue-500/20">
          {logoText}
        </div>
        <div>
          <h1 className="font-bold text-white text-xs leading-tight uppercase tracking-wider">{logoText} AOE ERP</h1>
          <span className="text-[9px] text-slate-500 tracking-wider uppercase font-semibold">Governance Operations</span>
        </div>
      </div>

      {/* Admin Profile Widget */}
      <div className="mx-4 mt-5 p-3.5 rounded-xl bg-slate-850 border border-slate-800/80 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/25 flex items-center justify-center text-blue-500 shrink-0">
          <ShieldCheck className="w-4.5 h-4.5" />
        </div>
        <div className="truncate">
          <p className="text-xs font-bold text-white truncate">{auth.name}</p>
          <span className="text-[9px] text-slate-500 font-semibold block uppercase tracking-wide mt-0.5">System Admin</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(`/admin/${item.id}`);
                setMobileOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-xs font-semibold rounded-lg transition-all duration-150 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                  : 'hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Appearance</span>
          <button 
            onClick={() => setDark(!dark)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors"
          >
            {dark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-semibold rounded-lg hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200 w-full">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 dark:bg-slate-950 text-white p-4 border-b border-slate-850 sticky top-0 z-40 w-full">
        <div className="flex items-center gap-3">
          <div className="w-fit px-2 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {logoText}
          </div>
          <span className="font-semibold text-xs tracking-wider uppercase">{logoText} AOE erp</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg bg-slate-800">
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-56 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-56 h-full">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Area Dashboard container */}
      <main className="flex-1 p-6 lg:p-8 overflow-x-hidden min-h-screen flex flex-col justify-between">
        
        <div className="space-y-6">
          {/* Top Header Navbar */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-4 mb-6">
            <div className="hidden sm:block">
              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">MIT ERP Governance Desk</span>
              <h1 className="text-sm font-bold text-slate-850 dark:text-slate-200">{collegeName}</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications bell */}
              <div className="relative cursor-pointer p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-450 hover:bg-slate-50 transition-colors">
                <Bell className="w-4 h-4" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center scale-90 border border-white dark:border-slate-900">
                    {notifications}
                  </span>
                )}
              </div>

              {/* Quick Academic View Switcher */}
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850/40 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-350 shadow-sm transition-colors"
              >
                Review Academic Workspace
              </button>
            </div>
          </div>

          {/* Render Active View Subpages */}
          <div className="animate-fadeIn">
            <Routes>
              <Route path="dashboard" element={<AdminDashboard navigateToTab={(tab) => navigate(`/admin/${tab}`)} />} />
              <Route path="users" element={<AdminUserManagement />} />
              <Route path="departments" element={<AdminDepartmentManagement />} />
              <Route path="subjects" element={<AdminSubjectManagement />} />
              <Route path="assignments" element={<AdminCourseAssignment />} />
              <Route path="monitoring" element={<AdminMonitoring onSelectSubject={(subjName) => navigate('/workspace')} />} />
              <Route path="audit" element={<AdminAuditLogs />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 pb-2 mt-12 border-t border-slate-200/60 dark:border-slate-850">
          <p className="text-[10px] text-slate-400">
            {collegeName} • System Administration Control Dashboard • Version 2.0.0
          </p>
        </div>

      </main>
    </div>
  );
}
