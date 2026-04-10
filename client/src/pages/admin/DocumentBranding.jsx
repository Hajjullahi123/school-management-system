import React, { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import { api, API_BASE_URL } from '../../api';

const getBorderStyle = (type, primary, secondary) => {
  switch (type) {
    case 'modern':
      return { border: `8px solid ${primary || '#3b82f6'}`, outline: `1px solid ${secondary || '#1e40af'}`, outlineOffset: '-12px' };
    case 'minimal':
      return { border: `2px solid ${primary || '#1e40af'}`, outline: '0.5px solid #ccc', outlineOffset: '-6px' };
    case 'solid':
      return { border: `12px solid ${primary || '#1e40af'}` };
    case 'none':
      return {};
    case 'ornate':
    default:
      return {
        border: '10px solid',
        borderImage: `linear-gradient(45deg, ${primary || '#d4af37'}, ${secondary || '#f4d03f'}) 1`
      };
  }
};

const DocumentBranding = () => {
  const [settings, setSettings] = useState({
    schoolName: '',
    schoolMotto: '',
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    reportFontFamily: 'serif',
    reportColorScheme: '',
    showPositionOnReport: true,
    showFeesOnReport: true,
    showAttendanceOnReport: true,
    reportLayout: 'classic',
    certFontFamily: 'serif',
    certBorderType: 'ornate',
    certPrimaryColor: '',
    certSecondaryColor: '',
    testimFontFamily: 'sans-serif',
    testimBorderType: 'modern',
    testimPrimaryColor: '',
    testimSecondaryColor: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put('/api/settings', settings);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }
      toast.success('Document styling saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Document Branding</h1>
          <p className="text-gray-500 font-medium">Customize the visual identity of your school's official documents</p>
        </div>
        <button 
          onClick={handleSaveSettings} 
          disabled={saving} 
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:brightness-90 disabled:bg-gray-400 transition-all shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      <div className="space-y-12">
        {/* Report Card Customization */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 bg-gray-50/30">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Report Card Design</h2>
            </div>
            <p className="text-gray-500 font-medium ml-14">Tailor the look and feel of students' termly performance reports</p>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                {/* Font Selection */}
                <div>
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">Typography</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { value: 'serif', label: 'Serif (Classic)', preview: 'font-serif' },
                      { value: 'sans-serif', label: 'Sans-Serif (Modern)', preview: 'font-sans' },
                      { value: 'Inter, sans-serif', label: 'Inter (Premium)', preview: '' },
                      { value: '"Times New Roman", serif', label: 'Times New Roman', preview: '' },
                    ].map(font => (
                      <button
                        key={font.value}
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, reportFontFamily: font.value }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          settings.reportFontFamily === font.value
                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">{font.label}</p>
                        <p className="text-lg font-bold text-gray-800" style={{ fontFamily: font.value }}>Abc 123</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">Brand Color</h4>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.reportColorScheme || settings.primaryColor || '#1e40af'}
                        onChange={(e) => setSettings(prev => ({ ...prev, reportColorScheme: e.target.value }))}
                        className="h-14 w-20 rounded-xl cursor-pointer border-4 border-white shadow-lg"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-700">{settings.reportColorScheme || 'Theme Default'}</p>
                        <p className="text-xs text-gray-400">Primary report accent</p>
                      </div>
                    </div>
                    {settings.reportColorScheme && (
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, reportColorScheme: '' }))}
                        className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-4 py-2 rounded-xl transition-all"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Content Toggles */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-2">Content Visibility</h4>
                  {[
                    { key: 'showPositionOnReport', label: 'Student Position', desc: 'Display rank in class and subject' },
                    { key: 'showFeesOnReport', label: 'Fee Breakdown', desc: 'Display outstanding balance and payment status' },
                    { key: 'showAttendanceOnReport', label: 'Attendance Record', desc: 'Display student termly attendance percentage' }
                  ].map(toggle => (
                    <div key={toggle.key} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-800">{toggle.label}</p>
                        <p className="text-[11px] text-gray-500">{toggle.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name={toggle.key}
                          checked={settings[toggle.key]}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reports Preview Container */}
              <div className="bg-gray-100/50 rounded-3xl p-8 flex flex-col items-center border border-gray-200 shadow-inner">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Live Report Preview</span>
                <div
                  className={`bg-white shadow-2xl transition-all duration-500 w-full max-w-[400px] ${
                    settings.reportLayout === 'minimal' ? 'border-[1px] border-gray-400' :
                    settings.reportLayout === 'modern' ? 'border-[6px] rounded-[2rem]' :
                    'border-[10px]'
                  }`}
                  style={{
                    fontFamily: settings.reportFontFamily || 'serif',
                    borderColor: settings.reportLayout !== 'minimal'
                      ? (settings.reportColorScheme || settings.primaryColor || '#1e40af')
                      : '#9ca3af',
                    aspectRatio: '210 / 297',
                    maxHeight: '520px',
                    overflow: 'hidden'
                  }}
                >
                  <div className="p-5 h-full flex flex-col text-[8px]">
                    <div className="flex items-center gap-3 border-b-2 pb-3 mb-3" style={{ borderColor: settings.reportColorScheme || settings.primaryColor || '#1e40af' }}>
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[6px] font-bold text-gray-300">LOGO</div>
                      <div className="flex-1 text-center">
                        <p className="font-black uppercase tracking-tight text-[10px]" style={{ color: settings.reportColorScheme || settings.primaryColor || '#1e40af' }}>
                          {settings.schoolName || 'ACME ACADEMY'}
                        </p>
                        <p className="text-[6px] text-gray-400 italic">Excellence in Learning</p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 p-2 rounded mb-3 border border-gray-100">
                         <div className="grid grid-cols-2 gap-2 text-[6px] font-bold">
                            <div>NAME: JOHN SMITH</div>
                            <div>CLASS: JSS3 WHITE</div>
                         </div>
                      </div>
                      <div className="text-white py-1 px-2 mb-2 text-[7px] font-black uppercase tracking-widest" style={{ backgroundColor: settings.reportColorScheme || settings.primaryColor || '#1e40af' }}>
                        Academic Results
                      </div>
                      <div className="space-y-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="flex justify-between border-b border-gray-100 pb-1">
                            <span className="font-bold">Subject {i}</span>
                            <span className="font-black">75% (A) {settings.showPositionOnReport && <span className="text-gray-400 font-normal ml-2">1st</span>}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {settings.showAttendanceOnReport && (
                      <div className="flex justify-between border-t border-black pb-1 my-1">
                        <span className="font-bold">ATTENDANCE:</span>
                        <span className="font-black">95% (PRESENT)</span>
                      </div>
                    )}
                    {settings.showFeesOnReport && (
                       <div className="mt-auto pt-4 border-t border-gray-100">
                          <div className="bg-emerald-50 p-2 rounded text-emerald-800 text-[6px] font-bold flex justify-between">
                             <span>FEE STATUS:</span>
                             <span>₦0.00 (PAID)</span>
                          </div>
                       </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex gap-2">
                   {['classic', 'modern', 'minimal'].map(l => (
                     <button 
                       key={l}
                       onClick={() => setSettings(prev => ({ ...prev, reportLayout: l }))}
                       className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${
                         settings.reportLayout === l 
                         ? 'bg-primary text-white shadow-lg' 
                         : 'bg-white text-gray-500 hover:bg-gray-50'
                       }`}
                     >
                       {l}
                     </button>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Credentials Styling (Certificates & Testimonials) */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 bg-gray-50/30">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Credentials & Awards</h2>
            </div>
            <p className="text-gray-500 font-medium ml-14">Design certificates and testimonials for graduating or outstanding students</p>
          </div>

          <div className="p-8 space-y-12">
             {/* Certificate Part */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                   <h3 className="text-lg font-black text-gray-800 border-l-4 border-amber-500 pl-4 mb-6">Certificate Styling</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Font Style</label>
                        <select name="certFontFamily" value={settings.certFontFamily || 'serif'} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50/50 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                          <option value="serif">Traditional Serif</option>
                          <option value="sans-serif">Modern Sans</option>
                          <option value="cursive">Classic Cursive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Border Concept</label>
                        <select name="certBorderType" value={settings.certBorderType || 'ornate'} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50/50 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                          <option value="ornate">🏛️ Ornate / Formal</option>
                          <option value="modern">✨ Modern / Sleek</option>
                          <option value="minimal">📏 Minimalist</option>
                          <option value="solid">⬛ Bold Solid</option>
                        </select>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Accent</label>
                        <input type="color" name="certPrimaryColor" value={settings.certPrimaryColor || settings.primaryColor || '#1e40af'} onChange={handleInputChange} className="h-12 w-full rounded-xl cursor-pointer border-4 border-white shadow-md" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Secondary Accent</label>
                        <input type="color" name="certSecondaryColor" value={settings.certSecondaryColor || settings.secondaryColor || '#3b82f6'} onChange={handleInputChange} className="h-12 w-full rounded-xl cursor-pointer border-4 border-white shadow-md" />
                      </div>
                   </div>
                </div>

                <div className="bg-gray-100/50 rounded-3xl p-8 flex flex-col items-center border border-gray-200 shadow-inner">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Certificate Preview</span>
                  <div
                    className="bg-white shadow-2xl w-full flex items-center justify-center p-8 transition-all duration-500"
                    style={{
                      aspectRatio: '1.414 / 1',
                      fontFamily: settings.certFontFamily || 'serif',
                      ...getBorderStyle(settings.certBorderType, settings.certPrimaryColor || settings.primaryColor, settings.certSecondaryColor || settings.secondaryColor)
                    }}
                  >
                    <div className="text-center">
                      <h4 className="font-black text-[18px] leading-tight mb-2 uppercase" style={{ color: settings.certPrimaryColor || settings.primaryColor || '#1e40af' }}>OFFICIAL CERTIFICATE</h4>
                      <div className="h-px w-12 bg-gray-200 mx-auto my-3"></div>
                      <p className="text-[8px] text-gray-500 italic mb-2">Presented To</p>
                      <p className="text-[12px] font-bold border-b border-gray-100 pb-1 inline-block px-10">Alexander Graves</p>
                    </div>
                  </div>
                </div>
             </div>

             <div className="h-px bg-gray-100"></div>

             {/* Testimonial Part */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="bg-gray-100/50 rounded-3xl p-8 flex flex-col items-center border border-gray-200 shadow-inner order-2 lg:order-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Testimonial Preview</span>
                  <div
                    className="bg-white shadow-2xl w-full max-w-[280px] p-6 transition-all duration-500"
                    style={{
                      aspectRatio: '1 / 1.414',
                      fontFamily: settings.testimFontFamily || 'sans-serif',
                      ...getBorderStyle(settings.testimBorderType, settings.testimPrimaryColor || settings.primaryColor, settings.testimSecondaryColor || settings.secondaryColor)
                    }}
                  >
                    <div className="text-center w-full">
                       <p className="text-[8px] font-black uppercase tracking-tighter mb-4 py-1 border-y-2 inline-block px-2" style={{ color: settings.testimPrimaryColor || settings.primaryColor || '#1e40af', borderColor: settings.testimPrimaryColor || settings.primaryColor || '#1e40af' }}>STUDENT TESTIMONIAL</p>
                       <div className="space-y-2 text-left">
                          <div className="h-2 w-full bg-gray-50 rounded"></div>
                          <div className="h-2 w-5/6 bg-gray-50 rounded"></div>
                          <div className="h-2 w-full bg-gray-50 rounded"></div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 order-1 lg:order-2">
                   <h3 className="text-lg font-black text-gray-800 border-l-4 border-indigo-500 pl-4 mb-6">Testimonial Styling</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Font Style</label>
                        <select name="testimFontFamily" value={settings.testimFontFamily || 'sans-serif'} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50/50 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                          <option value="serif">Traditional Serif</option>
                          <option value="sans-serif">Modern Sans</option>
                          <option value="cursive">Classic Cursive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Border Concept</label>
                        <select name="testimBorderType" value={settings.testimBorderType || 'modern'} onChange={handleInputChange} className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50/50 font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                          <option value="ornate">🏛️ Ornate / Formal</option>
                          <option value="modern">✨ Modern / Sleek</option>
                          <option value="minimal">📏 Minimalist</option>
                          <option value="solid">⬛ Bold Solid</option>
                        </select>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Accent</label>
                        <input type="color" name="testimPrimaryColor" value={settings.testimPrimaryColor || settings.primaryColor || '#1e40af'} onChange={handleInputChange} className="h-12 w-full rounded-xl cursor-pointer border-4 border-white shadow-md" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Secondary Accent</label>
                        <input type="color" name="testimSecondaryColor" value={settings.testimSecondaryColor || settings.secondaryColor || '#3b82f6'} onChange={handleInputChange} className="h-12 w-full rounded-xl cursor-pointer border-4 border-white shadow-md" />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
         <button 
           onClick={handleSaveSettings} 
           disabled={saving} 
           className="px-12 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 disabled:bg-gray-400 transition-all shadow-[0_20px_50px_rgba(30,64,175,0.3)] flex items-center gap-4"
         >
           {saving ? (
             <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
           ) : (
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
           )}
           <span>{saving ? 'Synchronizing...' : 'Apply Document Branding'}</span>
         </button>
      </div>
    </div>
  );
};

export default DocumentBranding;
