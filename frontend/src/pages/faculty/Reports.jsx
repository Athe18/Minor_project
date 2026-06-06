import React, { useState } from 'react';
import { facultyAPI } from '../../api';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Loader2,
  HelpCircle
} from 'lucide-react';

export default function Reports() {
  const [downloading, setDownloading] = useState({});
  const activeSubject = localStorage.getItem('active_subject_id') || '';

  const handleDownload = async (type) => {
    setDownloading((prev) => ({ ...prev, [type]: true }));
    try {
      let res;
      let filename = '';
      const timestamp = new Date().toISOString().slice(0, 10);
      const safeName = activeSubject.replace(/\s+/g, '_');

      if (type === 'excel') {
        res = await facultyAPI.exportExcel();
        filename = `${safeName}_Attainment_${timestamp}.xlsx`;
      } else if (type === 'pdf') {
        res = await facultyAPI.exportPDF();
        filename = `${safeName}_CourseReport_${timestamp}.pdf`;
      } else if (type === 'analysis_pdf') {
        res = await facultyAPI.exportAnalysisPDF();
        filename = `${safeName}_AnalysisDossier_${timestamp}.pdf`;
      }

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || `Failed to download ${type} report. Ensure attainment is calculated.`);
    } finally {
      setDownloading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const reportsList = [
    {
      id: 'analysis_pdf',
      title: 'Subject Attainment Analysis Dossier',
      description: 'Comprehensive PDF compilation containing CO targets, actual CIE/MSE/ESE achievements, and gap analysis charts.',
      format: 'PDF Document',
      icon: FileText,
      iconColor: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
    },
    {
      id: 'excel',
      title: 'Marks Summary & Attainment Spreadsheet',
      description: 'Tabular worksheets consisting of student roll numbers, CIE/MSE/ESE marks, CO attainment mappings, and articulation levels.',
      format: 'Excel Spreadsheet',
      icon: FileSpreadsheet,
      iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
    },
    {
      id: 'pdf',
      title: 'Course Outline Multi-Agent PDF Report',
      description: 'Curriculum audit report listing course descriptions, syllabus parse text, Bloom\'s keywords, and locked CO-PO mappings.',
      format: 'PDF Document',
      icon: FileText,
      iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Academic Analytics & Exports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate and export accreditation-ready reports in spreadsheet and print-ready document formats.
          </p>
        </div>
        <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
          Export Only
        </span>
      </div>

      {!activeSubject ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl text-center text-slate-500 text-xs">
          No subject selected. Please select a subject from 'My Subjects' first.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportsList.map((report) => {
            const Icon = report.icon;
            const isDownloading = downloading[report.id];
            return (
              <div 
                key={report.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between h-full space-y-5"
              >
                <div className="space-y-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-xs leading-snug">
                      {report.title}
                    </h3>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                      Format: {report.format}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    {report.description}
                  </p>
                </div>

                <button
                  onClick={() => handleDownload(report.id)}
                  disabled={isDownloading}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Download Report
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Audit Warning */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-slate-500">
        <HelpCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-700 dark:text-slate-300">Auditable System Export Records</p>
          <p className="font-semibold">All exports are logged automatically inside the ERP audit trail under EXPORT_REPORT action keys. These reports contain locked data and cannot be modified within these documents.</p>
        </div>
      </div>
    </div>
  );
}
