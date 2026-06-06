import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { facultyAPI } from '../../api';
import { 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Activity, 
  Calendar, 
  Upload, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await facultyAPI.getDashboard();
      setStats(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickUpload = (type) => {
    navigate(`/faculty/upload?type=${type}`);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center justify-between">
        <span>{error}</span>
        <button onClick={loadData} className="flex items-center gap-1 font-bold underline">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Faculty Performance Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track student marks entries, course attainment levels, and upcoming accreditation tasks.
          </p>
        </div>
        <button 
          onClick={loadData}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Assigned Subjects */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Subjects</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
              {stats?.assigned_subjects_count || 0}
            </h3>
            <span className="text-[10px] text-slate-500">Active classroom rosters</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Pending Uploads */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Uploads</span>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-500">
              {stats?.pending_uploads_count || 0}
            </h3>
            <span className="text-[10px] text-slate-500">Requires IA/MSE/ESE marks</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Completed Uploads */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completed Uploads</span>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
              {stats?.completed_uploads_count || 0}
            </h3>
            <span className="text-[10px] text-slate-500">Evaluations processed</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Avg Attainment */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Average Attainment</span>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
              {stats?.average_attainment || 0}%
            </h3>
            <span className="text-[10px] text-slate-500">Mean CO fulfillment score</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-500" />
          Quick Marks Upload Links
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => handleQuickUpload('IA')}
            className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500/40 hover:bg-blue-50/10 transition-all text-left group"
          >
            <div>
              <p className="font-bold text-xs text-slate-800 dark:text-slate-100">Upload IA Marks</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Internal assessment/quizzes</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => handleQuickUpload('MSE')}
            className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500/40 hover:bg-blue-50/10 transition-all text-left group"
          >
            <div>
              <p className="font-bold text-xs text-slate-800 dark:text-slate-100">Upload MSE Marks</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Mid semester examinations</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => handleQuickUpload('ESE')}
            className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500/40 hover:bg-blue-50/10 transition-all text-left group"
          >
            <div>
              <p className="font-bold text-xs text-slate-800 dark:text-slate-100">Upload ESE Marks</p>
              <p className="text-[10px] text-slate-400 mt-0.5">End semester final exams</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>

      {/* Main Grid: Left column (Tasks/Notifications), Right column (Activity log) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tasks & Alerts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks checklist */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Upcoming Tasks
            </h4>
            
            {stats?.upcoming_tasks?.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No upcoming evaluation tasks. All marks uploaded!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {stats?.upcoming_tasks?.map((task) => (
                  <div key={task.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{task.task}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Subject: {task.subject_name}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const type = task.id.split('-')[1].toUpperCase();
                        localStorage.setItem('active_subject_id', task.subject_name);
                        navigate(`/faculty/upload?type=${type}`);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              System Notifications
            </h4>
            
            <div className="space-y-3">
              {stats?.notifications?.map((notif) => (
                <div 
                  key={notif.id}
                  className={`p-3 rounded-lg border text-xs leading-relaxed ${
                    notif.type === 'warning'
                      ? 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-500'
                      : 'bg-blue-500/5 border-blue-500/20 text-blue-750 dark:text-blue-400'
                  }`}
                >
                  {notif.message}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Recent Activity
            </h4>
            
            {stats?.recent_activity?.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No recent activity logged for your subjects.
              </div>
            ) : (
              <div className="space-y-4">
                {stats?.recent_activity?.map((log) => (
                  <div key={log.id} className="text-xs border-l-2 border-slate-200 dark:border-slate-800 pl-3.5 py-0.5 space-y-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-slate-550 leading-snug">
                      Subject: <span className="font-semibold">{log.subject_name}</span>
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
