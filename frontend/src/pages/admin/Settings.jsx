import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { 
  Save, 
  Settings2, 
  BookMarked, 
  Sliders, 
  ShieldAlert, 
  Palette,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Settings form states
  const [academicYear, setAcademicYear] = useState('2025-26');
  
  // Thresholds (defaults: FY -> 50/55/60, SY -> 60/65/70, TY -> 65/75/80)
  const [fyL1, setFyL1] = useState('50');
  const [fyL2, setFyL2] = useState('55');
  const [fyL3, setFyL3] = useState('60');

  const [syL1, setSyL1] = useState('60');
  const [syL2, setSyL2] = useState('65');
  const [syL3, setSyL3] = useState('70');

  const [tyL1, setTyL1] = useState('65');
  const [tyL2, setTyL2] = useState('75');
  const [tyL3, setTyL3] = useState('80');

  const [jwtTimeout, setJwtTimeout] = useState(45);
  const [theme, setTheme] = useState('light');
  const [collegeName, setCollegeName] = useState('MIT Academy of Engineering');
  const [logoText, setLogoText] = useState('MIT');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await adminAPI.getSettings();
        if (res.data) {
          setAcademicYear(res.data.academic_year || '2025-26');
          setJwtTimeout(res.data.jwt_session_timeout || 45);
          setTheme(res.data.theme || 'light');
          setCollegeName(res.data.branding_college_name || 'MIT Academy of Engineering');
          setLogoText(res.data.branding_logo_text || 'MIT');

          const fy = (res.data.fy_thresholds || '50,55,60').split(',');
          if (fy.length === 3) {
            setFyL1(fy[0]); setFyL2(fy[1]); setFyL3(fy[2]);
          }
          const sy = (res.data.sy_thresholds || '60,65,70').split(',');
          if (sy.length === 3) {
            setSyL1(sy[0]); setSyL2(sy[1]); setSyL3(sy[2]);
          }
          const ty = (res.data.ty_thresholds || '65,75,80').split(',');
          if (ty.length === 3) {
            setTyL1(ty[0]); setTyL2(ty[1]); setTyL3(ty[2]);
          }
        }
      } catch (err) {
        setError('Failed to fetch current system settings.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const fy_thresholds = `${fyL1},${fyL2},${fyL3}`;
      const sy_thresholds = `${syL1},${syL2},${syL3}`;
      const ty_thresholds = `${tyL1},${tyL2},${tyL3}`;

      await adminAPI.saveSettings({
        academic_year: academicYear,
        fy_thresholds,
        sy_thresholds,
        ty_thresholds,
        jwt_session_timeout: parseInt(jwtTimeout),
        theme,
        branding_college_name: collegeName,
        branding_logo_text: logoText
      });

      setSuccess('System configurations successfully saved.');
      // Auto-reload settings in case details updated theme
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save system settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Panel */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">ERP System Governance Configurations</h2>
        <p className="text-xs text-slate-500 mt-0.5">Control institutional boundaries, baseline attainment parameters, JWT session tokens expiration, and college branding assets.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        
        {/* Core Calendar Settings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-blue-600" />
            Academic Calendar Baseline
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-400">Current Academic Year</label>
              <input
                type="text"
                required
                placeholder="e.g. 2025-26"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Acts as the baseline default year when creating subjects and department setups.</span>
            </div>
          </div>
        </div>

        {/* Attainment Thresholds */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Accreditation Threshold Defaults
          </h3>
          
          <p className="text-[10px] text-slate-500">
            Define default student marks percentage thresholds required to achieve Attainment Levels 1, 2, and 3 across course years.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* First Year Thresholds */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">First Year (FY) Defaults</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 block">Level 1 %</label>
                  <input type="number" required value={fyL1} onChange={(e) => setFyL1(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 block">Level 2 %</label>
                  <input type="number" required value={fyL2} onChange={(e) => setFyL2(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 block">Level 3 %</label>
                  <input type="number" required value={fyL3} onChange={(e) => setFyL3(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none" />
                </div>
              </div>
            </div>

            {/* Second Year Thresholds */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Second Year (SY) Defaults</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 block">Level 1 %</label>
                  <input type="number" required value={syL1} onChange={(e) => setSyL1(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 block">Level 2 %</label>
                  <input type="number" required value={syL2} onChange={(e) => setSyL2(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 block">Level 3 %</label>
                  <input type="number" required value={syL3} onChange={(e) => setSyL3(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none" />
                </div>
              </div>
            </div>

            {/* Third Year Thresholds */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Third Year (TY) Defaults</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 block">Level 1 %</label>
                  <input type="number" required value={tyL1} onChange={(e) => setTyL1(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 block">Level 2 %</label>
                  <input type="number" required value={tyL2} onChange={(e) => setTyL2(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 block">Level 3 %</label>
                  <input type="number" required value={tyL3} onChange={(e) => setTyL3(e.target.value)} className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security & System Settings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            Security & Governance Parameters
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-650 dark:text-slate-400">JWT Token Expiry Timeout (Minutes)</label>
              <input
                type="number"
                required
                min="5"
                max="1440"
                value={jwtTimeout}
                onChange={(e) => setJwtTimeout(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Specify how long user credentials tokens remain valid before automatic sign-out.</span>
            </div>
          </div>
        </div>

        {/* Branding & Aesthetics Settings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Palette className="w-4 h-4 text-emerald-600" />
            Institutional Branding & Interface
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-650 dark:text-slate-400">College Name</label>
              <input
                type="text"
                required
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="space-y-1">
              <label className="font-bold text-slate-655 dark:text-slate-400">Logo Badge Text</label>
              <input
                type="text"
                required
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-650 dark:text-slate-400">Default Color Palette Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-lg outline-none focus:border-blue-500"
              >
                <option value="light">MIT Classic Light (Standard ERP)</option>
                <option value="dark">Accreditation Dark Mode</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/10 transition-all hover:scale-[1.01]"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Configurations...' : 'Save Configuration Defaults'}
          </button>
        </div>

      </form>
    </div>
  );
}
