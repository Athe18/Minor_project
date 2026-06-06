import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { 
  Plus, 
  Search, 
  BookOpen, 
  X,
  Trash2,
  CalendarDays,
  Building
} from 'lucide-react';

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSemester, setFormSemester] = useState('Semester I');
  const [formYear, setFormYear] = useState('2025-26');
  const [formDeptId, setFormDeptId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [subjectsRes, deptsRes] = await Promise.all([
        adminAPI.getSubjects(),
        adminAPI.getDepartments()
      ]);
      setSubjects(subjectsRes.data);
      setDepartments(deptsRes.data);
      if (deptsRes.data.length > 0 && !formDeptId) {
        setFormDeptId(deptsRes.data[0].id.toString());
      }
    } catch (err) {
      setError('Failed to retrieve academic subjects directory.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!formName || !formYear || !formDeptId) {
      alert('Please fill in Subject Name, Year, and Department fields.');
      return;
    }
    try {
      await adminAPI.createSubject({
        subject_code: formCode || null,
        subject_name: formName,
        semester: formSemester,
        year: formYear,
        department_id: parseInt(formDeptId)
      });
      setShowCreateModal(false);
      resetForms();
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create subject directory.');
    }
  };

  const handleDeleteSubject = async (subject) => {
    const confirmation = window.confirm(`Are you sure you want to delete the subject "${subject.subject_name}" (${subject.subject_code || 'No Code'})? This will permanently delete all associated student lists, COs, and mapping attainments.`);
    if (!confirmation) return;
    try {
      await adminAPI.deleteSubject(subject.id);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete subject directory.');
    }
  };

  const resetForms = () => {
    setFormCode('');
    setFormName('');
    setFormSemester('Semester I');
    setFormYear('2025-26');
    if (departments.length > 0) {
      setFormDeptId(departments[0].id.toString());
    } else {
      setFormDeptId('');
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.subject_code && s.subject_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.department_name && s.department_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && subjects.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading subjects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Accreditation Subjects Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Define institutional subjects, align semester blocks, and associate subjects with department groups.</p>
        </div>
        <button
          onClick={() => { resetForms(); setShowCreateModal(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Subject
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Directory Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search by subject code, title, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline-block">
          Found {filteredSubjects.length} of {subjects.length} Subjects
        </span>
      </div>

      {/* Subjects Database Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                <th className="py-3.5 pl-4">Subject Code</th>
                <th className="py-3.5">Subject Name</th>
                <th className="py-3.5">Semester</th>
                <th className="py-3.5">Academic Year</th>
                <th className="py-3.5">Department</th>
                <th className="py-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">No subjects documented in this department directory.</td>
                </tr>
              ) : (
                filteredSubjects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/20 transition-colors">
                    <td className="py-3.5 pl-4 text-slate-800 dark:text-slate-200 font-bold font-mono">{s.subject_code || '—'}</td>
                    <td className="py-3.5 font-bold text-slate-900 dark:text-white">{s.subject_name}</td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-400 font-semibold">{s.semester}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                        {s.year}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {s.department_name}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Note: Edit Subject is delayed as requested, so no Edit button is rendered */}
                        <button
                          onClick={() => handleDeleteSubject(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE SUBJECT MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <BookOpen className="w-4.5 h-4.5 text-blue-600" />
                Configure New Subject Entry
              </h4>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Subject Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. CS-301"
                  value={formCode} 
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Subject Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Analysis of Algorithms"
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Semester Block</label>
                  <select 
                    value={formSemester} 
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                  >
                    <option value="Semester I">Semester I</option>
                    <option value="Semester II">Semester II</option>
                    <option value="Semester III">Semester III</option>
                    <option value="Semester IV">Semester IV</option>
                    <option value="Semester V">Semester V</option>
                    <option value="Semester VI">Semester VI</option>
                    <option value="Semester VII">Semester VII</option>
                    <option value="Semester VIII">Semester VIII</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Academic Year</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 2025-26"
                    value={formYear} 
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Offering Department</label>
                <select 
                  value={formDeptId} 
                  onChange={(e) => setFormDeptId(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.department_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
