import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { 
  Plus, 
  Search, 
  UserSquare2, 
  Users, 
  X,
  Trash2,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function CourseAssignment() {
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showChampionModal, setShowChampionModal] = useState(false);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);

  // Selected values
  const [selectedChampionId, setSelectedChampionId] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [assignRes, usersRes] = await Promise.all([
        adminAPI.getAssignments(),
        adminAPI.getUsers()
      ]);
      setAssignments(assignRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      setError('Failed to retrieve course assignments.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignChampion = async (e) => {
    e.preventDefault();
    if (!activeSubject || !selectedChampionId) return;
    try {
      await adminAPI.assignChampion(activeSubject.id, parseInt(selectedChampionId));
      setShowChampionModal(false);
      setSelectedChampionId('');
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign course champion.');
    }
  };

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    if (!activeSubject || !selectedFacultyId) return;
    try {
      await adminAPI.addFaculty(activeSubject.id, parseInt(selectedFacultyId));
      setShowFacultyModal(false);
      setSelectedFacultyId('');
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add faculty assignment.');
    }
  };

  const handleRemoveFaculty = async (subjectId, facultyId, facultyName) => {
    const confirmation = window.confirm(`Are you sure you want to remove faculty "${facultyName}" from this course assignment?`);
    if (!confirmation) return;
    try {
      await adminAPI.removeFaculty(subjectId, facultyId);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove faculty assignment.');
    }
  };

  const openChampionModal = (subj) => {
    setActiveSubject(subj);
    setSelectedChampionId(subj.champion ? subj.champion.faculty_id.toString() : '');
    setShowChampionModal(true);
  };

  const openFacultyModal = (subj) => {
    setActiveSubject(subj);
    setSelectedFacultyId('');
    setShowFacultyModal(true);
  };

  // Filter champions/faculty list for dropdowns
  const championUsers = users.filter(u => u.role === 'course_champion' && u.status === 'active');
  const facultyUsers = users.filter(u => u.role === 'course_faculty' && u.status === 'active');

  const filteredAssignments = assignments.filter(a => 
    a.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.subject_code && a.subject_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    a.department_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && assignments.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading course assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Accreditation Course Assignments</h2>
        <p className="text-xs text-slate-500 mt-0.5">Link subjects to exactly one Course Champion and allocate multiple Course Faculty to direct accreditation calculations.</p>
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
          Found {filteredAssignments.length} Subjects
        </span>
      </div>

      {/* Subject Assignment Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredAssignments.map((sub) => (
          <div key={sub.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Subject Title Header */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-850 pb-3 gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono tracking-wide">{sub.subject_code || 'NO CODE'}</span>
                    <span className="text-[10px] text-slate-450">• {sub.semester} ({sub.year})</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{sub.subject_name}</h3>
                  <span className="text-[10px] text-slate-450 mt-1 block">{sub.department_name}</span>
                </div>
              </div>

              {/* Course Champion Sector (exactly one) */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    <UserSquare2 className="w-3.5 h-3.5" />
                    Course Champion (Exactly One)
                  </span>
                  <button
                    onClick={() => openChampionModal(sub)}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold"
                  >
                    {sub.champion ? 'Reassign' : 'Assign Champion'}
                  </button>
                </div>
                {sub.champion ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-[10px] font-bold uppercase">
                      {sub.champion.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{sub.champion.name}</p>
                      <span className="text-[9px] text-slate-400 font-mono">@{sub.champion.username}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No course champion assigned. Attainment mappings require a champion.</p>
                )}
              </div>

              {/* Course Faculty Sector (multiple) */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Course Faculty (Multiple)
                  </span>
                  <button
                    onClick={() => openFacultyModal(sub)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Faculty
                  </button>
                </div>

                {sub.faculties.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No faculty members assigned to this subject workspace.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 max-h-[120px] overflow-y-auto pr-1">
                    {sub.faculties.map((fac) => (
                      <div key={fac.faculty_id} className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-2 rounded-lg flex items-center justify-between text-xs gap-2">
                        <div className="truncate">
                          <p className="font-semibold text-slate-700 dark:text-slate-350 truncate">{fac.name}</p>
                          <span className="text-[9px] text-slate-400 font-mono truncate block">@{fac.username}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFaculty(sub.id, fac.faculty_id, fac.name)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md shrink-0"
                          title="Remove Faculty"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- ASSIGN CHAMPION MODAL --- */}
      {showChampionModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <UserSquare2 className="w-4.5 h-4.5 text-blue-600" />
                Assign Course Champion
              </h4>
              <button onClick={() => setShowChampionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Select one Course Champion who will hold primary authority over syllabus processing, CO finalization, and articulation parameters for <b>{activeSubject?.subject_name}</b>.
            </p>

            <form onSubmit={handleAssignChampion} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Champion User</label>
                <select 
                  required
                  value={selectedChampionId} 
                  onChange={(e) => setSelectedChampionId(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Champion Profile --</option>
                  {championUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowChampionModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Assign Champion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD FACULTY MODAL --- */}
      {showFacultyModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <Users className="w-4.5 h-4.5 text-indigo-600" />
                Add Course Faculty Member
              </h4>
              <button onClick={() => setShowFacultyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Assign an additional instructor to <b>{activeSubject?.subject_name}</b>. Faculty members have permissions to review course states and upload student mark rosters.
            </p>

            <form onSubmit={handleAddFaculty} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Faculty Profile</label>
                <select 
                  required
                  value={selectedFacultyId} 
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Faculty Profile --</option>
                  {facultyUsers.map(u => {
                    // Don't list faculty already assigned
                    const isAssigned = activeSubject?.faculties.some(f => f.faculty_id === u.id);
                    if (isAssigned) return null;
                    return (
                      <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowFacultyModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Assign Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
