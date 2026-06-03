import React, { useState, useEffect } from 'react';
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
import { courseAPI } from './api';
import Chatbot from './components/Chatbot';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [auth, setAuth] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dark, setDark] = useState(false);
  const [courseState, setCourseState] = useState(null);
  const [activeSubjectId, setActiveSubjectId] = useState(localStorage.getItem('active_subject_id') || '');
  const [department, setDepartment] = useState(localStorage.getItem('department') || '');

  // Check auth and theme preferences on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    let name = localStorage.getItem('name');
    if (name && (name.includes('Nair') || name === 'Dr. Atharva Nair')) {
      name = 'Dr. Atharva Kamble';
      localStorage.setItem('name', name);
    }
    if (token) {
      setAuth({ token, username, name });
    }

    // Default to dark mode if requested, or read setting
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
    localStorage.removeItem('username');
    localStorage.removeItem('name');
    localStorage.removeItem('active_subject_id');
    localStorage.removeItem('department');
    setAuth(null);
    setCourseState(null);
    setActiveSubjectId('');
    setDepartment('');
  };

  if (!auth) {
    return <Login setAuth={setAuth} />;
  }

  if (!department) {
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

  // Render correct page view
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} onSelectSubject={handleSelectSubject} />;
      case 'workspace':
        return (
          <ErrorBoundary>
            <SubjectWorkspace activeSubjectId={activeSubjectId} refreshAllState={refreshState} setActiveTab={setActiveTab} />
          </ErrorBoundary>
        );
      case 'setup':
        return <Setup key={activeSubjectId} activeCourse={courseState} refreshState={refreshState} setActiveTab={setActiveTab} />;
      case 'cos':
        return <CourseOutcomes key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} />;
      case 'mapping':
        return <Mapping key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} />;
      case 'philosophy':
        return <Philosophy key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} />;
      case 'attainment':
        return <Attainment key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} />;
      case 'analysis':
        return <AnalysisDashboard key={activeSubjectId} courseState={courseState} activeSubjectId={activeSubjectId} setActiveTab={setActiveTab} />;
      case 'recommendations':
        return <Recommendations key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} />;
      case 'reports':
        return <Reports key={activeSubjectId} courseState={courseState} activeSubjectId={activeSubjectId} />;
      case 'assignment':
        return <AssignmentGenerator key={activeSubjectId} courseState={courseState} refreshState={refreshState} activeSubjectId={activeSubjectId} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} onSelectSubject={handleSelectSubject} />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        dark={dark} 
        setDark={setDark} 
        handleLogout={handleLogout}
        activeCourse={courseState}
      />
      
      {/* Workspace Panel */}
      <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
        {/* Welcome header info */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4 mb-6">
          <div className="hidden sm:block">
            <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Faculty Portal</span>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Welcome, {auth.name}</h4>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">System Mode:</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-500 rounded border border-blue-500/25">
              Accreditation Sandbox
            </span>
          </div>
        </div>

        {/* Dynamic page container */}
        <div className="animate-fadeIn">
          {renderView()}
        </div>
      </main>

      {/* Global AI Floating Widget */}
      <Chatbot />
    </div>
  );
}
