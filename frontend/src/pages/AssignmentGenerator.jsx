import React, { useState, useEffect } from 'react';
import { assignmentAPI, coAPI } from '../api';
import { 
  Sparkles, 
  Download, 
  Loader2, 
  AlertTriangle, 
  AlertCircle, 
  FileText, 
  Check, 
  Info,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export default function AssignmentGenerator({ courseState, refreshState }) {
  const [difficulty, setDifficulty] = useState('Medium');
  const [assignmentType, setAssignmentType] = useState('Theory');
  const [qCount, setQCount] = useState(3);
  const [generateAnswers, setGenerateAnswers] = useState(false);
  const [generateRubrics, setGenerateRubrics] = useState(false);
  
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const hasCOs = (courseState?.cos || []).length > 0;
  const allCosApproved = (courseState?.cos || []).length > 0 && (courseState?.cos || []).every(co => co.validation_status === 'approved');

  const handleApproveCos = async () => {
    try {
      await coAPI.approve();
      alert("Course outcomes finalized and approved.");
      refreshState();
    } catch (err) {
      alert("Failed to approve Course Outcomes.");
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const payload = {
        difficulty,
        assignment_type: assignmentType,
        num_questions_per_co: qCount,
        generate_answer_key: generateAnswers,
        generate_rubric: generateRubrics
      };
      await assignmentAPI.generate(payload);
      refreshState();
      alert("Assignment generated successfully!");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to generate assignment.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await assignmentAPI.downloadPDF();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const subjectName = (courseState?.subject_name || 'Subject').replace(/\s+/g, '_');
      link.setAttribute('download', `${subjectName}_Assignment.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download assignment PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (!courseState?.subject_name) {
    return (
      <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-4 my-12">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold">No Subject Configured</h3>
          <p className="text-sm text-slate-455 mt-1">
            Please setup or select a course subject from the Academic Dashboard first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div>
        <h2 className="text-2xl font-bold font-sans tracking-tight">AI-Based Assignment Generator</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure parameters and generate outcome-mapped assignments containing college headers, instructions, marks distribution, and optional keys/rubrics.
        </p>
      </div>

      {!hasCOs ? (
        <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Course Outcomes Required</h3>
            <p className="text-sm text-slate-500 dark:text-slate-455 mt-1">
              You must generate Course Outcomes (COs) before generating assignments mapping to them.
            </p>
          </div>
        </div>
      ) : !allCosApproved ? (
        <div className="glass-panel p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Course Outcomes Approval Pending</h3>
            <p className="text-sm text-slate-500 dark:text-slate-455 mt-1">
              Assignments can only be generated after all Course Outcomes have been finalized and approved to ensure accreditation compliance.
            </p>
          </div>
          <button
            onClick={handleApproveCos}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 mx-auto"
          >
            <Check className="w-4 h-4" />
            Approve All COs Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-panel p-5 space-y-5">
              <h4 className="font-bold text-sm uppercase tracking-wider">Assignment Parameters</h4>
              
              <div className="space-y-4">
                {/* Difficulty */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm focus:outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="Easy">Easy (Conceptual / Direct)</option>
                    <option value="Medium">Medium (Analytical / Standard)</option>
                    <option value="Hard">Hard (Problem Solving / Advanced)</option>
                  </select>
                </div>
                
                {/* Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Assignment Type</label>
                  <select
                    value={assignmentType}
                    onChange={(e) => setAssignmentType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm focus:outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="Theory">Theory-Based</option>
                    <option value="Practical">Practical-Based</option>
                    <option value="Mixed">Mixed Mode</option>
                  </select>
                </div>

                {/* Question Count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase">Questions Per CO</label>
                  <select
                    value={qCount}
                    onChange={(e) => setQCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-sm focus:outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value={1}>1 Question</option>
                    <option value={2}>2 Questions</option>
                    <option value={3}>3 Questions</option>
                    <option value={4}>4 Questions</option>
                  </select>
                </div>

                {/* Answer Key Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border dark:border-slate-850 text-xs">
                  <span className="font-semibold text-slate-550">Generate Answer Key</span>
                  <input
                    type="checkbox"
                    checked={generateAnswers}
                    onChange={(e) => setGenerateAnswers(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded bg-slate-100 border-slate-300 focus:ring-blue-500 focus:ring-2"
                  />
                </div>

                {/* Rubrics Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border dark:border-slate-850 text-xs">
                  <span className="font-semibold text-slate-555">Generate Grading Rubrics</span>
                  <input
                    type="checkbox"
                    checked={generateRubrics}
                    onChange={(e) => setGenerateRubrics(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded bg-slate-100 border-slate-300 focus:ring-blue-500 focus:ring-2"
                  />
                </div>

                {error && (
                  <div className="p-2 text-xs text-rose-500 font-semibold bg-rose-500/10 border border-rose-500/20 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/10 transition-all hover:translate-y-[-1px] disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {generating ? "Generating..." : "Generate Sheet"}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-3 space-y-4">
            {!courseState?.assignment ? (
              <div className="glass-panel p-10 text-center py-20 flex flex-col items-center justify-center h-full">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                <h4 className="font-bold text-slate-800 dark:text-slate-205">No Assignment Generated Yet</h4>
                <p className="text-xs text-slate-455 mt-1 max-w-sm">
                  Configure assignment guidelines on the left and trigger generation to view a professional draft here.
                </p>
              </div>
            ) : (
              <div className="glass-panel p-6 space-y-6">
                {/* Actions Header */}
                <div className="flex justify-between items-center border-b dark:border-slate-850 pb-4">
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider">Assignment Preview</h4>
                    <p className="text-[10px] text-slate-455">MIT Academy of Engineering Assessment Dossier</p>
                  </div>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                  >
                    {downloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download Official PDF
                  </button>
                </div>

                {/* Printable Assignment View */}
                <div className="p-6 bg-white dark:bg-slate-900 border dark:border-slate-850 rounded-2xl shadow-inner text-slate-800 dark:text-slate-100 max-h-[70vh] overflow-y-auto space-y-6 font-sans">
                  {/* Branding heading */}
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-extrabold text-blue-900 dark:text-blue-400 tracking-wide">
                      {courseState.assignment.college_header}
                    </h2>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      DEPARTMENT OF COMPUTER ENGINEERING
                    </h4>
                    <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase pt-2">
                      {courseState.assignment.title}
                    </h3>
                  </div>

                  {/* Meta table grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-955 p-4 rounded-xl border dark:border-slate-850 text-xs">
                    <div>
                      <span className="text-slate-450 block font-semibold">Course Subject</span>
                      <strong className="text-slate-800 dark:text-slate-200">{courseState.assignment.subject_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-455 block font-semibold">Academic Year</span>
                      <strong className="text-slate-800 dark:text-slate-200">{courseState.assignment.academic_year}</strong>
                    </div>
                    <div>
                      <span className="text-slate-455 block font-semibold">Difficulty Level</span>
                      <strong className="text-slate-800 dark:text-slate-200">{courseState.assignment.difficulty}</strong>
                    </div>
                    <div>
                      <span className="text-slate-455 block font-semibold">Assessment Type</span>
                      <strong className="text-slate-800 dark:text-slate-200">{courseState.assignment.assignment_type}</strong>
                    </div>
                  </div>

                  {/* Regulations and instructions */}
                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                    <h5 className="text-xs font-bold text-blue-600 dark:text-blue-400">General Instructions:</h5>
                    <ul className="list-decimal pl-4 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                      {(courseState.assignment.instructions || []).map((inst, i) => (
                        <li key={i}>{inst}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Student placeholders */}
                  <div className="border border-dashed border-slate-350 dark:border-slate-700 p-3 rounded-lg flex flex-wrap gap-4 text-xs font-semibold text-slate-400 justify-between">
                    <span>Roll No: __________________</span>
                    <span>Name: _____________________________________________</span>
                    <span>Batch: _________</span>
                  </div>

                  {/* Section blocks */}
                  <div className="space-y-6">
                    {(courseState.assignment.sections || []).map((sec, secIdx) => (
                      <div key={secIdx} className="space-y-3">
                        <div className="px-3 py-1.5 bg-blue-900 text-white rounded-lg font-bold text-[11px] uppercase tracking-wider flex justify-between items-center">
                          <span>{sec.section_name}: Course Outcome {sec.co_id}</span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Bloom: L{sec.blooms_level}</span>
                        </div>
                        <p className="text-[11px] text-slate-455 font-medium italic pl-1">
                          CO Target: {sec.co_statement}
                        </p>

                        {/* Questions list */}
                        <div className="overflow-x-auto border dark:border-slate-850 rounded-xl">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-955 border-b dark:border-slate-850 text-slate-500 font-bold">
                                <th className="p-3 w-16 text-center">Q.No</th>
                                <th className="p-3">Question Statement</th>
                                <th className="p-3 w-20 text-center">CO Mapping</th>
                                <th className="p-3 w-24 text-center">Bloom Level</th>
                                <th className="p-3 w-16 text-center">Marks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(sec.questions || []).map((q, qIdx) => (
                                <React.Fragment key={qIdx}>
                                  <tr className="border-b dark:border-slate-850 hover:bg-slate-500/5 transition-colors">
                                    <td className="p-3 text-center font-bold text-slate-500">{q.id}</td>
                                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-350">{q.question_text}</td>
                                    <td className="p-3 text-center">
                                      <span className="badge-blue text-[9px]">{q.co_id}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="badge-orange text-[9px]">L{q.blooms_level}</span>
                                    </td>
                                    <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-100">{q.marks}M</td>
                                  </tr>
                                  {(q.answer_key || q.rubric) && (
                                    <tr>
                                      <td colSpan="5" className="p-3 bg-slate-50/50 dark:bg-slate-950/30">
                                        <div className="pl-4 border-l-2 border-indigo-500 space-y-2 py-1">
                                          {q.answer_key && (
                                            <div className="text-[11px]">
                                              <strong className="text-emerald-500 block">Sample Solution:</strong>
                                              <p className="text-slate-550 dark:text-slate-400 mt-0.5 whitespace-pre-line leading-relaxed">{q.answer_key}</p>
                                            </div>
                                          )}
                                          {q.rubric && (
                                            <div className="text-[11px]">
                                              <strong className="text-amber-500 block">Marking Rubric:</strong>
                                              <p className="text-slate-550 dark:text-slate-400 mt-0.5 whitespace-pre-line leading-relaxed">{q.rubric}</p>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
