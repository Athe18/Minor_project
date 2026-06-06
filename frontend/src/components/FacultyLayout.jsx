import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { facultyAPI } from '../api';
import { 
  LayoutDashboard, 
  BookOpen, 
  Upload, 
  Layers, 
  TrendingUp, 
  FileSpreadsheet, 
  User, 
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Bell,
  ChevronDown,
  GraduationCap
} from 'lucide-react';

// Import subpages
import FacultyDashboard from '../pages/faculty/Dashboard';
import FacultySubjects from '../pages/faculty/Subjects';
import FacultyMarksUpload from '../pages/faculty/MarksUpload';
import FacultyCOOverview from '../pages/faculty/COOverview';
import FacultyAttainment from '../pages/faculty/Attainment';
import FacultyReports from '../pages/faculty/Reports';
import FacultyProfile from '../pages/faculty/Profile';

export default function FacultyLayout({ auth, handleLogout, dark, setDark }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Fetch dashboard stats to populate notifications dynamically
    const fetchDashboardStats = async () => {
      try {
        const res = await facultyAPI.getDashboard();
        if (res.data && res.data.notifications) {
          setNotifications(res.data.notifications);
        }
      } catch (err) {
        console.error('Failed to load dashboard notifications', err);
      }
    };
    fetchDashboardStats();
  }, [location.pathname]);

  const activeTab = location.pathname.split('/')[2] || 'dashboard';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subjects', label: 'My Subjects', icon: BookOpen },
    { id: 'upload', label: 'Marks Upload', icon: Upload },
    { id: 'co', label: 'CO Overview', icon: Layers },
    { id: 'attainment', label: 'Attainment', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-350 dark:bg-slate-950 border-r border-slate-800">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-base font-bold shadow-md shadow-blue-500/20">
          MIT
        </div>
        <div>
          <h1 className="font-bold text-white text-xs leading-tight uppercase tracking-wider">MIT AOE ERP</h1>
          <span className="text-[9px] text-slate-500 tracking-wider uppercase font-semibold">Faculty Operations</span>
        </div>
      </div>

      {/* Faculty Profile Widget */}
      <div className="mx-4 mt-5 p-3.5 rounded-xl bg-slate-850 border border-slate-800/80 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/25 flex items-center justify-center text-blue-500 shrink-0">
          <GraduationCap className="w-4.5 h-4.5" />
        </div>
        <div className="truncate">
          <p className="text-xs font-bold text-white truncate">{auth.name}</p>
          <span className="text-[9px] text-slate-550 font-semibold block uppercase tracking-wide mt-0.5">Assoc. Professor</span>
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
                navigate(`/faculty/${item.id}`);
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
            MIT
          </div>
          <span className="font-semibold text-xs tracking-wider uppercase">MIT AOE FACULTY</span>
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
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-4 mb-6 relative">
            <div className="hidden sm:block">
              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">MIT ERP Academic Portal</span>
              <h1 className="text-sm font-bold text-slate-850 dark:text-slate-200">MIT Academy of Engineering</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications bell */}
              <div className="relative">
                <div 
                  onClick={() => {
                    setShowNotifDropdown(!showNotifDropdown);
                    setShowProfileDropdown(false);
                  }}
                  className="relative cursor-pointer p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-450 hover:bg-slate-50 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center scale-90 border border-white dark:border-slate-900">
                      {notifications.length}
                    </span>
                  )}
                </div>

                {showNotifDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-2 z-50 text-xs">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200">
                      Notifications
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-3 text-slate-400 text-center">
                          No new notifications
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`px-4 py-2.5 border-b border-slate-50 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-start gap-2 ${
                              notif.type === 'warning' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-600 dark:text-slate-350'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <p className="leading-snug">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProfileDropdown(!showProfileDropdown);
                    setShowNotifDropdown(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850/40 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span>{auth.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-450" />
                </button>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1 z-50 text-xs">
                    <button
                      onClick={() => {
                        navigate('/faculty/profile');
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 font-semibold"
                    >
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        navigate('/faculty/profile#change-password');
                        setShowProfileDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 font-semibold"
                    >
                      Change Password
                    </button>
                    <hr className="border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-semibold"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Render Active View Subpages */}
          <div className="animate-fadeIn">
            <Routes>
              <Route path="dashboard" element={<FacultyDashboard />} />
              <Route path="subjects" element={<FacultySubjects />} />
              <Route path="upload" element={<FacultyMarksUpload />} />
              <Route path="co" element={<FacultyCOOverview />} />
              <Route path="attainment" element={<FacultyAttainment />} />
              <Route path="reports" element={<FacultyReports />} />
              <Route path="profile" element={<FacultyProfile />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 pb-2 mt-12 border-t border-slate-200/60 dark:border-slate-850">
          <p className="text-[10px] text-slate-400">
            MIT Academy of Engineering • Faculty Operations Portal • Version 2.0.0
          </p>
        </div>

      </main>
    </div>
  );
}
