import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { facultyAPI } from '../../api';
import { 
  BookOpen, 
  ExternalLink, 
  Upload, 
  Info,
  X,
  GraduationCap
} from 'lucide-react';

export default function Subjects() {
  const [subjectsList, setSubjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const loadSubjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await facultyAPI.getSubjects();
      setSubjectsList(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch assigned subjects list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleOpenSubject = (subjectName) => {
    localStorage.setItem('active_subject_id', subjectName);
    navigate('/faculty/dashboard');
  };

  const handleUploadMarks = (subjectName) => {
    localStorage.setItem('active_subject_id', subjectName);
    navigate('/faculty/upload');
  };

  const handleViewDetails = (sub) => {
    setSelectedSubject(sub);
    setShowModal(true);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'CO-PO Mapped':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'Syllabus Uploaded':
        return 'bg-purple-500/10 text-purple-600 border border-purple-500/20';
      default:
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading Subjects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          My Assigned Subjects
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          View all subjects assigned to you for course outcomes attainment calculation.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs">
          {error}
        </div>
      )}

      {subjectsList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl text-center text-slate-500 text-xs">
          No subjects have been assigned to you. Please contact your administrator.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-450 font-bold uppercase tracking-wider bg-slate-500/5">
                  <th className="py-3.5 px-5">Subject Code & Name</th>
                  <th className="py-3.5">Semester</th>
                  <th className="py-3.5">Academic Year</th>
                  <th className="py-3.5">Course Champion</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 text-xs">
                {subjectsList.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-500/10 rounded text-blue-500">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold">{sub.subject_name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{sub.subject_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 font-semibold text-slate-600 dark:text-slate-350">
                      {sub.semester ? sub.semester.replace('Semester ', 'Sem ') : 'N/A'}
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 font-semibold border dark:border-slate-800">
                        {sub.year}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-350">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span>{sub.champion}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadgeClass(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(sub)}
                          className="p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
                          title="View Details"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleUploadMarks(sub.subject_name)}
                          className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 font-bold text-[10px] flex items-center gap-1 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          Upload Marks
                        </button>

                        <button
                          onClick={() => handleOpenSubject(sub.subject_name)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showModal && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg shadow-xl overflow-hidden text-xs">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-150 text-sm">Subject details</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Subject Name</span>
                  <span className="font-bold text-slate-800 dark:text-white mt-1 block">{selectedSubject.subject_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Subject Code</span>
                  <span className="font-bold text-slate-850 dark:text-slate-200 mt-1 block uppercase">{selectedSubject.subject_code}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Semester</span>
                  <span className="font-bold text-slate-800 dark:text-white mt-1 block">{selectedSubject.semester || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Academic Year</span>
                  <span className="font-bold text-slate-800 dark:text-white mt-1 block">{selectedSubject.year}</span>
                </div>
              </div>
              
              <hr className="border-slate-100 dark:border-slate-800" />
              
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Role Assignments</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg">
                    <p className="text-[10px] text-slate-400 font-semibold">Course Champion</p>
                    <p className="font-bold text-slate-850 dark:text-white mt-1">{selectedSubject.champion}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg">
                    <p className="text-[10px] text-slate-400 font-semibold">Assigned Role</p>
                    <p className="font-bold text-slate-850 dark:text-white mt-1">Course Faculty</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
