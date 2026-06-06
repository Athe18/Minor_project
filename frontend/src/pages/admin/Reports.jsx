import React, { useState } from 'react';
import { adminAPI } from '../../api';
import { 
  Download, 
  FileSpreadsheet, 
  FileText,
  Loader2,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

export default function Reports() {
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [error, setError] = useState('');

  const triggerExcelExport = async () => {
    setDownloadingExcel(true);
    setError('');
    try {
      const res = await adminAPI.exportExcel();
      
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `MIT_OBE_ERP_MasterReport_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to download Excel report.');
      console.error(err);
    } finally {
      setDownloadingExcel(false);
    }
  };

  const triggerPDFExport = async () => {
    setDownloadingPDF(true);
    setError('');
    try {
      const res = await adminAPI.exportPDF();
      
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `MIT_OBE_ERP_AdminGovernanceReport_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Failed to generate PDF report.');
      console.error(err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Accreditation Analytics Reports</h2>
        <p className="text-xs text-slate-500 mt-0.5">Generate and download branch-wide Excel spreadsheets and formatted PDF dossiers for NAAC/NBA reviews.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reports Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Excel Export Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center">
              <FileSpreadsheet className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Master Excel Spreadsheet</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Download a multi-sheet spreadsheet containing compiled lists of departments, user accounts, subjects, course allocations, progress tracking status, and subject average attainment results.
              </p>
            </div>
            <ul className="text-[11px] text-slate-550 dark:text-slate-400 space-y-1.5 pt-2">
              <li className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Sheet 1: Academic Departments vision & mission statements
              </li>
              <li className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Sheet 2: Faculty directory listing with statuses
              </li>
              <li className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Sheet 3: Subjects directory with course champion mappings
              </li>
              <li className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Sheet 4: Attainment progress tracker indices
              </li>
            </ul>
          </div>
          <button
            onClick={triggerExcelExport}
            disabled={downloadingExcel || downloadingPDF}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01]"
          >
            {downloadingExcel ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Workbook...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Excel Workbook
              </>
            )}
          </button>
        </div>

        {/* PDF Export Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center">
              <FileText className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Admin System Governance Dossier</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Generate a formatted, publication-ready PDF report presenting summary statistics, department vision/missions, user permissions lists, and active course attainment indices in standard compliance layouts.
              </p>
            </div>
            <ul className="text-[11px] text-slate-550 dark:text-slate-400 space-y-1.5 pt-2">
              <li className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                Publication-ready design with structured tables
              </li>
              <li className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                Comprehensive overview statistics section
              </li>
              <li className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                Accredited department vision & mission records
              </li>
              <li className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                Subject monitoring progress & branch attainment overview
              </li>
            </ul>
          </div>
          <button
            onClick={triggerPDFExport}
            disabled={downloadingExcel || downloadingPDF}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01]"
          >
            {downloadingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating PDF Document...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF Dossier
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
