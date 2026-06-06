import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import DepartmentSelect from './pages/DepartmentSelect';
import Dashboard from './pages/Dashboard';
import SubjectWorkspace from './pages/SubjectWorkspace';
import Setup from './pages/Setup';
import CourseOutcomes from './pages/CourseOutcomes';
import Mapping from './pages/Mapping';
import Philosophy from './pages/Philosophy';
import Attainment from './pages/Attainment';
import Recommendations from './pages/Recommendations';
import Reports from './pages/Reports';
import AssignmentGenerator from './pages/AssignmentGenerator';
import AnalysisDashboard from './pages/AnalysisDashboard';
import { courseAPI, authAPI } from './api';
import Chatbot from './components/Chatbot';
import ErrorBoundary from './components/ErrorBoundary';
import AdminLayout from './components/AdminLayout';
import FacultyLayout from './components/FacultyLayout';
import Unauthorized from './pages/Unauthorized';


function AppContent() {
  const [auth, setAuth] = useState(null);
  const [dark, setDark] = useState(false);
  const [courseState, setCourseState] = useState(null);
  const [activeSubjectId, setActiveSubjectId] = useState(localStorage.getItem('active_subject_id') || '');
  const [department, setDepartment] = useState(localStorage.getItem('department') || '');
  
  const navigate = useNavigate();
  const location = useLocation();

  // Check auth and theme preferences on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    const checkAuthMe = async () => {
      if (token) {
        try {
          const meRes = await authAPI.getMe();
          if (meRes.data.success) {
            setAuth({
              token,
              username: meRes.data.username,
              name: meRes.data.name,
              role: meRes.data.role
            });
            localStorage.setItem('name', meRes.data.name);
            localStorage.setItem('role', meRes.data.role);
          }
        } catch (err) {
          handleLogout();
        }
      }
    };
    checkAuthMe();

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDark(true);
    }
  }, []);

  // Update theme class on HTML element
  useEffect(() => {
    if (dark) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  // Load backend active course state
  const refreshState = async (overrideSubjectId) => {
    if (!auth) return;
    if (overrideSubjectId) {
      localStorage.setItem('active_subject_id', overrideSubjectId);
      setActiveSubjectId(overrideSubjectId);
    }
    try {
      const response = await courseAPI.getState();
      setCourseState(response.data);
      if (response.data?.subject_name) {
        setActiveSubjectId(response.data.subject_name);
        localStorage.setItem('active_subject_id', response.data.subject_name);
      }
    } catch (err) {
      console.error('Failed to load active course state', err);
    }
  };

  const handleSelectSubject = (subjectId) => {
    setActiveSubjectId(subjectId);
    localStorage.setItem('active_subject_id', subjectId);
    refreshState(subjectId);
  };

  useEffect(() => {
    if (auth) {
      refreshState();
    }
  }, [auth]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    localStorage.removeItem('name');
    localStorage.removeItem('active_subject_id');
    localStorage.removeItem('department');
    localStorage.removeItem('role');
    setAuth(null);
    setCourseState(null);
    setActiveSubjectId('');
    setDepartment('');
    navigate('/login');
  };

  if (!auth) {
    return (
      <Routes>
        <Route path="*" element={
          <Login setAuth={(authData) => {
            setAuth(authData);
            localStorage.setItem('role', authData.role);
            if (authData.role === 'admin') {
              navigate('/admin/dashboard');
            } else if (authData.role === 'course_faculty') {
              navigate('/faculty/dashboard');
            } else {
              navigate('/dashboard');
            }
          }} />
        } />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Route Guards for Admin paths */}
      <Route path="/admin/*" element={
        auth.role === 'admin' ? (
          <AdminLayout auth={auth} handleLogout={handleLogout} dark={dark} setDark={setDark} />
        ) : (
          <Navigate to="/unauthorized" replace />
        )
      } />

      {/* Route Guards for Faculty paths */}
      <Route path="/faculty/*" element={
        auth.role === 'course_faculty' ? (
          <FacultyLayout auth={auth} handleLogout={handleLogout} dark={dark} setDark={setDark} />
        ) : (
          <Navigate to="/unauthorized" replace />
        )
      } />

      {/* Unauthorized Route */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Academic paths */}
      <Route path="/*" element={
        auth.role === 'course_champion' ? (
          <AcademicLayout 
            auth={auth}
            dark={dark}
            setDark={setDark}
            handleLogout={handleLogout}
            courseState={courseState}
            activeSubjectId={activeSubjectId}
            refreshState={refreshState}
            handleSelectSubject={handleSelectSubject}
            department={department}
            setDepartment={setDepartment}
          />
        ) : (
          <Navigate to="/unauthorized" replace />
        )
      } />
    </Routes>
  );
}

function AcademicLayout({
  auth, dark, setDark, handleLogout, courseState, activeSubjectId, refreshState, handleSelectSubject, department, setDepartment
}) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // If department is required and not set, show DepartmentSelect (except for admin)
  if (!department && auth.role !== 'admin') {
    return (
      <DepartmentSelect
        facultyName={auth.name}
        onSelect={(dept, visionMission) => {
          const fullDept = `Department of ${dept}`;
          localStorage.setItem('department', fullDept);
          if (visionMission) {
            localStorage.setItem('vision_mission', visionMission);
          }
          setDepartment(fullDept);
        }}
      />
    );
  }

  const activeTab = location.pathname.substring(1) || 'dashboard';

  const handleSetTab = (tabId) => {
    navigate(`/${tabId}`);
  };

  const renderView = () => {
    const isReadOnly = auth.role === 'admin';
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={handleSetTab} onSelectSubject={handleSelectSubject} readOnly={isReadOnly} />;
      case 'workspace':
        return (
          <ErrorBoundary>
            <SubjectWorkspace activeSubjectId={activeSubjectId} refreshAllState={refreshState} setActiveTab={handleSetTab} readOnly={isReadOnly} />
          </ErrorBoundary>
        );
      case 'setup':
        return <Setup key={activeSubjectId} activeCourse={courseState} refreshState={refreshState} setActiveTab={handleSetTab} readOnly={isReadOnly} />;
      case 'cos':
        return <CourseOutcomes key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} readOnly={isReadOnly} />;
      case 'mapping':
        return <Mapping key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} readOnly={isReadOnly} />;
      case 'philosophy':
        return <Philosophy key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} readOnly={isReadOnly} />;
      case 'attainment':
        return <Attainment key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} readOnly={isReadOnly} />;
      case 'analysis':
        return <AnalysisDashboard key={activeSubjectId} courseState={courseState} activeSubjectId={activeSubjectId} setActiveTab={handleSetTab} readOnly={isReadOnly} />;
      case 'recommendations':
        return <Recommendations key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} readOnly={isReadOnly} />;
      case 'reports':
        return <Reports key={activeSubjectId} courseState={courseState} activeSubjectId={activeSubjectId} readOnly={isReadOnly} />;
      case 'assignment':
        return <AssignmentGenerator key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} readOnly={isReadOnly} />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  };

  const isReadOnly = auth.role === 'admin';

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleSetTab} 
        dark={dark} 
        setDark={setDark} 
        handleLogout={handleLogout}
        activeCourse={courseState}
      />
      
      <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
        {/* Read-only banner for Admin */}
        {isReadOnly && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl flex items-center justify-between text-xs font-semibold">
            <span>⚠️ Read-Only Administrative Mode. You cannot edit calculations or map targets.</span>
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              Back to Admin Portal
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4 mb-6">
          <div className="hidden sm:block">
            <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">
              {isReadOnly ? 'Admin View: Academic Review' : 'Faculty Portal'}
            </span>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Welcome, {auth.name}
            </h4>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">System Mode:</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-500 rounded border border-blue-500/25">
              Accreditation Sandbox
            </span>
          </div>
        </div>

        <div className="animate-fadeIn">
          {renderView()}
        </div>
      </main>

      <Chatbot />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
