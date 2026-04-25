import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../api';
import { useReactToPrint } from 'react-to-print';
import { Printer, Shield, ChevronLeft } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { toast } from '../../utils/toast';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';
import { formatDateVerbose } from '../../utils/formatters';

const TestimonialView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const componentRef = useRef();
  const { settings: schoolSettings } = useSchoolSettings();
  const [testimonial, setTestimonial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const response = await api.post(`/api/testimonials/generate/${studentId}`, {});
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate testimonial');
      }
      toast.success('Testimonial generated successfully');
      fetchTestimonialData();
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const [formData, setFormData] = useState({
    conduct: '',
    character: '',
    remarks: '',
    programType: ''
  });

  useEffect(() => {
    fetchTestimonialData();
  }, [studentId]);

  useEffect(() => {
    if (testimonial) {
      setFormData({
        conduct: testimonial.conduct || 'Good',
        character: testimonial.character || '',
        remarks: testimonial.remarks || '',
        programType: testimonial.programType || ''
      });
    }
  }, [testimonial]);

  const fetchTestimonialData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/testimonials/${studentId}`);
      const data = await response.json();

      if (response.ok) {
        setTestimonial(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to load testimonial');
      }
    } catch (error) {
      console.error('Error fetching testimonial:', error);
      setError('Connection error or server failure');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put(`/api/testimonials/${studentId}`, formData);
      if (response.ok) {
        toast.success('Testimonial updated successfully');
        setIsEditing(false);
        fetchTestimonialData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update testimonial');
      }
    } catch (error) {
      console.error('Testimonial update error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred while updating';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Testimonial_${testimonial?.student?.user?.firstName}_${testimonial?.student?.user?.lastName}`,
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Testimonial</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
          
          {error.includes('not found') && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="mt-4 ml-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 inline-flex items-center gap-2"
            >
              {generating ? 'Generating...' : 'Generate Testimonial Now'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!testimonial) {
    return null;
  }

  const studentName = `${testimonial.student?.user?.firstName || ''} ${testimonial.student?.user?.middleName || ''} ${testimonial.student?.user?.lastName || ''}`.trim();
  const verificationUrl = `${window.location.origin}/verify/testimonial/${testimonial.testimonialNumber}`;
  const currentDate = formatDateVerbose(testimonial.dateIssued);

  const primaryCol = schoolSettings?.testimPrimaryColor || testimonial.school?.testimPrimaryColor || schoolSettings?.primaryColor || testimonial.school?.primaryColor || '#1e40af';
  const secondaryCol = schoolSettings?.testimSecondaryColor || testimonial.school?.testimSecondaryColor || schoolSettings?.secondaryColor || testimonial.school?.secondaryColor || '#3b82f6';
  const testimFont = schoolSettings?.testimFontFamily || testimonial.school?.testimFontFamily || 'sans-serif';
  const testimBorder = schoolSettings?.testimBorderType || testimonial.school?.testimBorderType || 'modern';
  
  const getBorderStyle = (type, primary, secondary) => {
    switch (type) {
      case 'modern':
        return `15px solid ${primary || '#3b82f6'}`;
      case 'minimal':
        return `4px solid ${primary || '#1e40af'}`;
      case 'solid':
        return `30px solid ${primary || '#1e40af'}`;
      case 'none':
        return 'none';
      case 'ornate':
      default:
        return `16px double ${primary || '#1e40af'}`;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6 no-print">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all font-semibold flex items-center gap-2"
        >
          <ChevronLeft size={18} />
          Back to Alumni
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => setIsEditing(true)}
            className="px-6 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all flex items-center gap-2 font-bold shadow-md"
          >
            Edit testimonial
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-primary text-white rounded-lg hover:brightness-90 transition-all flex items-center gap-2 font-bold shadow-md"
          >
            <Printer size={18} />
            Print Official Testimonial
          </button>
        </div>
      </div>

      {/* Testimonial Content */}
      <div className="overflow-x-auto md:overflow-visible pb-12">
      <div
        ref={componentRef}
        className="bg-white relative overflow-hidden testimonial-paper mx-auto shadow-xl print:shadow-none"
        style={{
          width: '210mm',
          minWidth: '210mm',
          height: '297mm',
          padding: '15mm',
          boxSizing: 'border-box',
          fontFamily: testimFont || 'sans-serif'
        }}
      >
        {/* Border */}
        <div className="absolute inset-0 pointer-events-none z-20" style={{ border: getBorderStyle(testimBorder, primaryCol, secondaryCol), opacity: testimBorder === 'ornate' ? 0.15 : 0.9 }}></div>
        <div className="absolute inset-4 border border-gray-200 pointer-events-none z-20" style={{ display: testimonial.school?.testimBorderType === 'none' ? 'none' : 'block' }}></div>

        {/* Security Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-45deg] select-none z-0">
          <h1 className="text-[140px] font-black uppercase text-gray-900 whitespace-nowrap">
            OFFICIAL DOCUMENT
          </h1>
        </div>

        <div className="px-8 py-8 relative z-10 flex flex-col h-full items-center text-center">
          {/* Letterhead */}
          <div className="mb-8 w-full">
            {testimonial.school?.logoUrl ? (
              <img
                src={testimonial.school.logoUrl.startsWith('data:') || testimonial.school.logoUrl.startsWith('http') ? testimonial.school.logoUrl : `${API_BASE_URL}${testimonial.school.logoUrl}`}
                alt="School Logo"
                className="h-24 mx-auto mb-6 object-contain"
              />
            ) : (
              <div className="h-24 w-24 mx-auto mb-6 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-200">
                <Shield size={40} className="text-gray-200" />
              </div>
            )}
            <h1 className="text-4xl font-serif font-black tracking-tight mb-3 uppercase" style={{ color: primaryCol }}>
              {testimonial.school?.name}
            </h1>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-[0.2em]">
              {testimonial.school?.address}
            </p>
          </div>

          <div className="w-1/2 h-1 mb-8" style={{ background: `linear-gradient(to right, transparent, ${testimonial.school?.primaryColor || '#1e40af'}, transparent)` }}></div>

          {/* Document Title */}
          <div className="mb-8">
            <h2 className="text-4xl font-serif italic font-bold mb-4" style={{ color: primaryCol }}>
              Student Testimonial
            </h2>
            <div className="inline-block px-4 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-500">
              REF NO: {testimonial.testimonialNumber}
            </div>
          </div>

          {/* Body */}
          <div className="max-w-2xl mx-auto text-gray-800 space-y-8 text-lg leading-relaxed font-serif flex-grow flex flex-col justify-center">
            <p className="text-center italic mb-4">To Whom It May Concern,</p>

            <p className="text-center">
              This is to formally certify that <span className="font-bold border-b-2 border-gray-300 px-2 uppercase">{studentName}</span> was a bonafide student of this institution and has successfully satisfied all academic requirements for <span className="font-bold underline uppercase">{testimonial.programType || 'the academic program'}</span>, graduating in the year <span className="font-bold">{testimonial.student?.alumniProfile?.graduationYear || 'N/A'}</span>.
            </p>

            <p className="text-center">
              During the period of study, the candidate exhibited <span className="font-bold underline uppercase">{testimonial.conduct || 'Good'}</span> conduct. {testimonial.character}
            </p>

            {testimonial.remarks && (
              <p className="text-center text-lg italic bg-gray-50 p-6 rounded-lg border border-gray-100 italic">
                "{testimonial.remarks}"
              </p>
            )}

            <p className="text-center">
              We highly recommend {studentName.split(' ')[0]} for any further academic or professional endeavors and wish them continuous success.
            </p>
          </div>

          {/* Edit Modal */}
          {isEditing && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 no-print">
              <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-gray-900">Edit Testimonial</h3>
                  <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <form onSubmit={handleUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Graduation Program / Level</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-gray-200"
                      placeholder="e.g. Primary School"
                      value={formData.programType}
                      onChange={(e) => setFormData({ ...formData, programType: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Conduct</label>
                      <select
                        className="w-full rounded-xl border-gray-200"
                        value={formData.conduct}
                        onChange={(e) => setFormData({ ...formData, conduct: e.target.value })}
                      >
                        <option value="Excellent">Excellent</option>
                        <option value="Very Good">Very Good</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Character Notes</label>
                    <textarea
                      rows={2}
                      className="w-full rounded-xl border-gray-200"
                      placeholder="e.g. He was hardworking and diligent."
                      value={formData.character}
                      onChange={(e) => setFormData({ ...formData, character: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Principal's Remarks</label>
                    <textarea
                      rows={2}
                      className="w-full rounded-xl border-gray-200"
                      placeholder="Special notes for the testimonial..."
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all border-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-4 font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/20 hover:brightness-95 transition-all border-none"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Signatures & Seal Section */}
          <div className="mt-8 w-full pt-8 grid grid-cols-3 items-end gap-6">
            <div className="flex flex-col items-center">
              <div className="h-20 w-full flex items-end justify-center">
                <div className="italic font-serif text-blue-900/30 text-xl select-none mb-2">Registrar Signature</div>
              </div>
              <div className="w-full border-t border-gray-900 pt-2 text-xs font-bold uppercase tracking-wider">
                Registrar
              </div>
            </div>

            <div className="flex flex-col items-center relative">
              {/* Official Seal Positioning */}
              <div className="absolute -top-16 opacity-70">
                <div className="w-32 h-32 border-4 border-double border-red-600/60 rounded-full flex flex-col items-center justify-center rotate-[-15deg] bg-white/50 backdrop-blur-[1px]">
                  <div className="text-[10px] font-black text-red-600/80 uppercase tracking-tighter">OFFICIAL SEAL</div>
                  <div className="text-[12px] font-black text-red-600/80 uppercase my-1">CERTIFIED</div>
                  <div className="text-[8px] font-black text-red-600/80 uppercase tracking-widest leading-none">
                    {testimonial.school?.name?.slice(0, 15)}...
                  </div>
                </div>
              </div>
              <div className="mt-16">
                <QRCode value={verificationUrl} size={70} level="H" includeMargin={false} />
                <p className="text-[9px] text-gray-400 mt-2 font-mono uppercase tracking-tighter">Scan to Verify</p>
              </div>
            </div>

            <div className="flex flex-col items-center relative">
              <div className="h-20 w-full flex items-end justify-center relative">
                {testimonial.school?.principalSignatureUrl ? (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                    <img src={testimonial.school.principalSignatureUrl.startsWith('data:') || testimonial.school.principalSignatureUrl.startsWith('http') ? testimonial.school.principalSignatureUrl : `${API_BASE_URL}${testimonial.school.principalSignatureUrl}`} alt="Principal Signature" className="h-[50px] w-auto mix-blend-multiply" />
                  </div>
                ) : (
                  <div className="italic font-serif text-blue-900/30 text-xl select-none mb-2">Principal Signature</div>
                )}
              </div>
              <div className="w-full border-t border-gray-900 pt-2 text-xs font-bold uppercase tracking-wider">
                Principal / School Head
              </div>
            </div>
          </div>

          {/* Verification Footer */}
          <div className="mt-12 text-[10px] text-gray-400 font-medium">
            <p>This document is electronically generated and verified. Date Issued: {currentDate}</p>
            <p className="mt-1">Verification URL: {verificationUrl}</p>
          </div>
        </div>
      </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap');
        
        .testimonial-paper {
          background-color: #fff;
          background-image: radial-gradient(#f0f0f0 1px, transparent 1px);
          background-size: 40px 40px;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .testimonial-paper {
            width: 100% !important;
            height: 100% !important;
            box-shadow: none !important;
            padding: 10mm !important;
          }
        }

        @media screen and (max-width: 794px) {
          .testimonial-paper {
            zoom: 0.45;
            -moz-transform: scale(0.45);
            -moz-transform-origin: top center;
          }
        }
      `}} />
    </div>
  );
};

export default TestimonialView;
