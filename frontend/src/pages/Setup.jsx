import React, { useState, useEffect } from 'react';
import { courseAPI } from '../api';
import { Upload, CheckCircle2, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

export default function Setup({ activeCourse, refreshState }) {
  const [subjectName, setSubjectName] = useState(activeCourse?.subject_name || '');
  const [year, setYear] = useState(activeCourse?.year || 'SY');
  const [lvl1, setLvl1] = useState(activeCourse?.level1_threshold || 55);
  const [lvl2, setLvl2] = useState(activeCourse?.level2_threshold || 65);
  const [lvl3, setLvl3] = useState(activeCourse?.level3_threshold || 75);
  const [syllabusFile, setSyllabusFile] = useState(null);
  
  const [department, setDepartment] = useState(activeCourse?.department || localStorage.getItem('department') || 'Department of Computer Engineering');
  const [visionMission, setVisionMission] = useState(activeCourse?.vision_mission || '');
  const [visionFile, setVisionFile] = useState(null);

  useEffect(() => {
    if (activeCourse) {
      setSubjectName(activeCourse.subject_name || '');
      setYear(activeCourse.year || 'SY');
      setLvl1(activeCourse.level1_threshold || 55);
      setLvl2(activeCourse.level2_threshold || 65);
      setLvl3(activeCourse.level3_threshold || 75);
      setDepartment(activeCourse.department || localStorage.getItem('department') || 'Department of Computer Engineering');
      setVisionMission(activeCourse.vision_mission || '');
    }
  }, [activeCourse]);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Handle year changes to automatically offer preset thresholds
  const handleYearChange = (e) => {
    const selectedYear = e.target.value;
    setYear(selectedYear);
    if (selectedYear === 'FY') {
      setLvl1(50); setLvl2(55); setLvl3(60);
    } else if (selectedYear === 'SY') {
      setLvl1(60); setLvl2(65); setLvl3(70);
    } else if (selectedYear === 'TY') {
      setLvl1(65); setLvl2(75); setLvl3(80);
    }
  };

  const handleFileChange = (e) => {
    setSyllabusFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      // 1. Setup Course first to create/register it in the backend
      const formData = new FormData();
      formData.append('subject_name', subjectName);
      formData.append('year', year);
      formData.append('level1_threshold', lvl1);
      formData.append('level2_threshold', lvl2);
      formData.append('level3_threshold', lvl3);
      if (syllabusFile) {
        formData.append('syllabus_file', syllabusFile);
      }

      const response = await courseAPI.setup(formData);

      // Save the active subject ID in localStorage so subsequent API calls use it
      if (response.data && response.data.subject_name) {
        localStorage.setItem('active_subject_id', response.data.subject_name);
      }

      // 2. Setup Department & vision mission (generates PIs for the newly created subject)
      const deptFormData = new FormData();
      deptFormData.append('department', department);
      deptFormData.append('vision_mission', visionMission);
      if (visionFile) {
        deptFormData.append('vision_file', visionFile);
      }
      await courseAPI.setupDepartment(deptFormData);
      localStorage.setItem('department', department);

      setSuccess(true);
      refreshState();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit configuration details.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    if (window.confirm('Are you sure you want to clear the form and set up a new subject? This will not delete your existing subjects.')) {
      setSubjectName('');
      setYear('SY');
      setLvl1(55);
      setLvl2(65);
      setLvl3(75);
      setSyllabusFile(null);
      setVisionMission('');
      setVisionFile(null);
      setSuccess(false);
      setError('');
      
      // Clear active subject ID locally to decouple session
      localStorage.removeItem('active_subject_id');
      refreshState();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-sans tracking-tight">Course Setup & Syllabus Parsing</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure your course details, select study levels, set attainment benchmarks, and upload a syllabus PDF.</p>
      </div>

      <div className="glass-panel p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Main details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Course / Subject Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Database Management Systems"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Year of Study
              </label>
              <select
                value={year}
                onChange={handleYearChange}
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="FY">First Year (FY)</option>
                <option value="SY">Second Year (SY)</option>
                <option value="TY">Third Year (TY)</option>
              </select>
            </div>
          </div>

          {/* Threshold sliders */}
          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-6">
            <div className="flex items-center gap-1.5 mb-4">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                NBA Target Attainment Thresholds (out of 100)
              </label>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" title="These benchmarks represent the percentage of marks a student needs to reach a particular attainment level." />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/40 rounded-xl">
                <span className="text-xs text-rose-500 font-semibold uppercase tracking-wide">Level 1 (Low)</span>
                <div className="flex items-center justify-between mt-2">
                  <input
                    type="range" min="40" max="100" value={lvl1}
                    onChange={(e) => setLvl1(parseInt(e.target.value))}
                    className="w-3/4 accent-rose-500"
                  />
                  <span className="text-sm font-bold">{lvl1}%</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/40 rounded-xl">
                <span className="text-xs text-amber-500 font-semibold uppercase tracking-wide">Level 2 (Medium)</span>
                <div className="flex items-center justify-between mt-2">
                  <input
                    type="range" min="40" max="100" value={lvl2}
                    onChange={(e) => setLvl2(parseInt(e.target.value))}
                    className="w-3/4 accent-amber-500"
                  />
                  <span className="text-sm font-bold">{lvl2}%</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/40 rounded-xl">
                <span className="text-xs text-green-500 font-semibold uppercase tracking-wide">Level 3 (High)</span>
                <div className="flex items-center justify-between mt-2">
                  <input
                    type="range" min="40" max="100" value={lvl3}
                    onChange={(e) => setLvl3(parseInt(e.target.value))}
                    className="w-3/4 accent-green-500"
                  />
                  <span className="text-sm font-bold">{lvl3}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Department Setup */}
          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-6 space-y-4">
            <div className="flex items-center gap-1.5 mb-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Department & Vision Mission Setup
              </label>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" title="Configures your academic department and generates the Program Indicators (PIs) based on your Vision & Mission text/PDF." />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">
                  Academic Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
                >
                  <option value="Department of Computer Engineering">Department of Computer Engineering</option>
                  <option value="Department of CSE (Data Science)">Department of CSE (Data Science)</option>
                  <option value="Department of CSE (AIML)">Department of CSE (AIML)</option>
                  <option value="Department of Software Engineering">Department of Software Engineering</option>
                  <option value="Department of Information Technology">Department of Information Technology</option>
                  <option value="Department of Mechanical Engineering">Department of Mechanical Engineering</option>
                  <option value="Department of Chemical Engineering">Department of Chemical Engineering</option>
                  <option value="Department of Civil Engineering">Department of Civil Engineering</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">
                  Upload Vision & Mission PDF (.pdf or .txt)
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl p-3 text-center relative cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setVisionFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-500 block truncate">
                    {visionFile ? visionFile.name : 'Choose Vision & Mission File'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">
                Department Vision & Mission Statement
              </label>
              <textarea
                placeholder="e.g. To be a premier center of excellence in education..."
                value={visionMission}
                onChange={(e) => setVisionMission(e.target.value)}
                rows={3}
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* File upload */}
          <div className="border-t border-slate-100 dark:border-slate-800/60 pt-6">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Upload Syllabus File (.pdf or .txt)
            </label>
            
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl p-6 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors relative cursor-pointer">
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {syllabusFile ? syllabusFile.name : 'Select or drag and drop syllabus file'}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Supports PDF (extracts text) or TXT files up to 10MB</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-2.5 bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 text-sm text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 bg-green-950/20 border border-green-900/40 rounded-xl p-4 text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Configuration successfully saved and syllabus file has been parsed. Proceed to CO generation.</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-6">
            <button
              type="button"
              onClick={handleClearForm}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 text-sm font-semibold rounded-xl transition-all"
            >
              Clear Form & Create New
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/10 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving & Parsing...
                </>
              ) : (
                'Save Settings & Load Syllabus'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
