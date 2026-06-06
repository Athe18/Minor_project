import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { 
  Plus, 
  Building2, 
  Eye, 
  Edit, 
  BookOpen, 
  X,
  Sparkles
} from 'lucide-react';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);

  // Form states
  const [selectedDept, setSelectedDept] = useState(null);
  const [formName, setFormName] = useState('');
  const [formVision, setFormVision] = useState('');
  const [formMission, setFormMission] = useState('');
  const [formAcademicYear, setFormAcademicYear] = useState('2025-26');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getDepartments();
      setDepartments(res.data);
    } catch (err) {
      setError('Failed to retrieve academic departments.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditDepartment = async (e) => {
    e.preventDefault();
    if (!selectedDept || !formName) return;
    try {
      await adminAPI.updateDepartment(selectedDept.id, {
        department_name: formName,
        vision: formVision,
        mission: formMission,
        academic_year: formAcademicYear
      });
      setShowEditModal(false);
      resetForms();
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update department configurations.');
    }
  };

  const openEditModal = (dept) => {
    setSelectedDept(dept);
    setFormName(dept.department_name);
    setFormVision(dept.vision || '');
    setFormMission(dept.mission || '');
    setFormAcademicYear(dept.academic_year || '2025-26');
    setShowEditModal(true);
  };

  const openVisionModal = (dept) => {
    setSelectedDept(dept);
    setShowVisionModal(true);
  };

  const resetForms = () => {
    setSelectedDept(null);
    setFormName('');
    setFormVision('');
    setFormMission('');
    setFormAcademicYear('2025-26');
  };

  if (loading && departments.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading departments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Academic Departments Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">Define college branches, document accredited Vision & Mission statements, and specify tracking academic years.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Departments Listing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <div key={dept.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
            {/* Header info */}
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={dept.department_name}>
                      {dept.department_name}
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID: {dept.id}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 border border-slate-200/50 dark:border-slate-700/50">
                  AY: {dept.academic_year || '2025-26'}
                </span>
              </div>

              {/* Vision Statement Preview */}
              <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 p-3 rounded-lg text-xs">
                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Vision Statement</span>
                <p className="text-slate-650 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {dept.vision || 'No vision statement configured. Click Edit to document.'}
                </p>
              </div>

              {/* Mission Statement Preview */}
              <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 p-3 rounded-lg text-xs">
                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Mission Statement</span>
                <p className="text-slate-650 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {dept.mission || 'No mission statements configured. Click Edit to document.'}
                </p>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => openVisionModal(dept)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                View Full
              </button>
              <button
                onClick={() => openEditModal(dept)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Settings
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- EDIT MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Building2 className="w-4.5 h-4.5 text-blue-600" />
                Edit Department Configuration
              </h4>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditDepartment} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Department Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Department of Mechanical Engineering"
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Vision Statement</label>
                <textarea 
                  rows="3"
                  placeholder="Document branch vision statement..."
                  value={formVision} 
                  onChange={(e) => setFormVision(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Mission Statement</label>
                <textarea 
                  rows="4"
                  placeholder="Document branch mission statements..."
                  value={formMission} 
                  onChange={(e) => setFormMission(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Academic Year</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 2025-26"
                  value={formAcademicYear} 
                  onChange={(e) => setFormAcademicYear(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- VIEW FULL VISION/MISSION MODAL --- */}
      {showVisionModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Sparkles className="w-4.5 h-4.5 text-blue-600" />
                {selectedDept?.department_name} - Vision & Mission
              </h4>
              <button onClick={() => setShowVisionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[400px] overflow-y-auto pr-1">
              <div className="space-y-1.5 p-4 bg-blue-50/20 border border-blue-100/30 rounded-xl">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Vision Statement</span>
                <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-medium">
                  {selectedDept?.vision || 'No vision statement configured.'}
                </p>
              </div>

              <div className="space-y-1.5 p-4 bg-indigo-50/20 border border-indigo-100/30 rounded-xl">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Mission Statement</span>
                <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-medium whitespace-pre-line">
                  {selectedDept?.mission || 'No mission statements configured.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowVisionModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-bold"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
