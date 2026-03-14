import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../api';
import { useReactToPrint } from 'react-to-print';
import { Printer, Shield, ChevronLeft } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';

const BulkTestimonialView = () => {
  const { year } = useParams();
  const navigate = useNavigate();
  const componentRef = useRef();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBulkData();
  }, [year]);

  const fetchBulkData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/testimonials/bulk/${year}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch testimonials');
      }
      const data = await response.json();
      setTestimonials(data);
    } catch (err) {
      console.error('Bulk fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Bulk_Testimonials_${year}`,
    pageStyle: `
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap');
            @page {
                size: A4;
                margin: 0;
            }
            @media print {
                .testimonial-page {
                    page-break-after: always;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .testimonial-page:last-child {
                    page-break-after: auto;
                }
            }
        `
  });

  if (loading) return (
    <div className="flex justify-center items-center h-screen flex-col gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-gray-500 font-medium">Preparing testimonials for printing...</p>
    </div>
  );

  if (error) return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-red-800 font-bold text-xl mb-2">Error Loading Testimonials</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700">Go Back</button>
      </div>
    </div>
  );

  if (testimonials.length === 0) return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h2 className="text-yellow-800 font-bold text-xl mb-2">No Testimonials Found</h2>
        <p className="text-yellow-600 mb-6">No testimonials have been generated for the year {year} yet.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Control Header */}
      <div className="bg-white border-b p-4 sticky top-0 z-50 no-print shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">←</button>
            <div>
              <h1 className="font-bold text-lg">Bulk Testimonials: Class of {year}</h1>
              <p className="text-xs text-gray-500">{testimonials.length} documents ready to print</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="bg-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-primary/90 transition-colors"
            >
              <Printer size={18} />
              Print All Testimonials
            </button>
          </div>
        </div>
      </div>

      {/* Print Container */}
      <div ref={componentRef} className="print-container flex flex-col items-center gap-0">
        {testimonials.map((testimonial) => {
          const studentName = `${testimonial.student?.user?.firstName || ''} ${testimonial.student?.user?.middleName || ''} ${testimonial.student?.user?.lastName || ''}`.trim();
          const verificationUrl = `${window.location.origin}/verify/testimonial/${testimonial.testimonialNumber}`;
          const currentDate = new Date(testimonial.dateIssued).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          return (
            <div key={testimonial.id} className="testimonial-page bg-white relative overflow-hidden" style={{ width: '210mm', height: '297mm', padding: '20mm', fontFamily: "'Playfair Display', serif" }}>
              {/* Ornate Border */}
              <div className="absolute inset-0 border-[16px] border-double pointer-events-none z-20" style={{ borderColor: testimonial.school?.primaryColor || '#1e40af', opacity: 0.15 }}></div>
              <div className="absolute inset-4 border border-gray-200 pointer-events-none z-20"></div>

              {/* Security Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-45deg] select-none z-0">
                <h1 className="text-[100px] font-black uppercase text-gray-900 whitespace-nowrap">OFFICIAL DOCUMENT</h1>
              </div>

              <div className="h-full flex flex-col items-center text-center relative z-10 px-8 py-4">
                {/* Letterhead */}
                <div className="mb-8 w-full">
                  {testimonial.school?.logoUrl && (
                    <img src={testimonial.school.logoUrl} alt="Logo" className="h-20 mx-auto mb-4 object-contain" />
                  )}
                  <h1 className="text-3xl font-black tracking-tight mb-2 uppercase" style={{ color: testimonial.school?.primaryColor || '#1e40af' }}>
                    {testimonial.school?.name}
                  </h1>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
                    {testimonial.school?.address}
                  </p>
                </div>

                <div className="w-1/2 h-0.5 mb-8" style={{ background: `linear-gradient(to right, transparent, ${testimonial.school?.primaryColor || '#1e40af'}, transparent)` }}></div>

                {/* Document Title */}
                <div className="mb-10">
                  <h2 className="text-4xl italic font-bold mb-4" style={{ color: testimonial.school?.primaryColor || '#1e40af' }}>
                    Student Testimonial
                  </h2>
                  <div className="inline-block px-3 py-1 bg-gray-50 border border-gray-100 rounded text-[9px] font-mono text-gray-400">
                    REF NO: {testimonial.testimonialNumber}
                  </div>
                </div>

                {/* Body */}
                <div className="max-w-2xl mx-auto text-gray-800 space-y-8 text-lg leading-[1.8] flex-grow flex flex-col justify-center">
                  <p className="italic mb-2">To Whom It May Concern,</p>

                  <p>
                    This is to formally certify that <span className="font-bold border-b-2 border-gray-300 px-2 uppercase">{studentName}</span> was a bonafide student of this institution and has successfully satisfied all academic requirements for <span className="font-bold underline uppercase">{testimonial.programType || 'the academic program'}</span>, graduating in the year <span className="font-bold">{testimonial.student?.alumniProfile?.graduationYear || 'N/A'}</span>.
                  </p>

                  <p>
                    During the period of study, the candidate exhibited <span className="font-bold underline uppercase">{testimonial.conduct || 'Good'}</span> conduct. {testimonial.character}
                  </p>

                  {testimonial.remarks && (
                    <p className="text-base italic bg-gray-50 p-4 rounded-lg border border-gray-50">
                      "{testimonial.remarks}"
                    </p>
                  )}

                  <p>
                    We highly recommend {studentName.split(' ')[0]} for any further academic or professional endeavors and wish them continuous success.
                  </p>
                </div>

                {/* Signatures & Seal Section */}
                <div className="mt-auto w-full pt-10 grid grid-cols-3 items-end gap-6">
                  <div className="flex flex-col items-center">
                    <div className="h-14 w-full border-b border-gray-900 mb-1"></div>
                    <div className="text-[10px] font-bold uppercase tracking-wider">Registrar</div>
                  </div>

                  <div className="flex flex-col items-center">
                    <QRCode value={verificationUrl} size={60} level="H" />
                    <p className="text-[8px] text-gray-400 mt-2 font-mono uppercase tracking-tighter">Scan to Verify</p>
                  </div>

                  <div className="flex flex-col items-center relative">
                    <div className="h-14 w-full border-b border-gray-900 mb-1 relative">
                      {testimonial.school?.principalSignatureUrl && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                          <img src={testimonial.school.principalSignatureUrl.startsWith('data:') || testimonial.school.principalSignatureUrl.startsWith('http') ? testimonial.school.principalSignatureUrl : `${API_BASE_URL}${testimonial.school.principalSignatureUrl}`} alt="Principal Signature" className="h-[40px] w-auto mix-blend-multiply" />
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider">Principal</div>
                  </div>
                </div>

                {/* Verification Footer */}
                <div className="mt-8 text-[9px] text-gray-400 font-medium">
                  <p>This document is electronically generated and verified on {currentDate}</p>
                  <p className="mt-0.5">Verification URL: {verificationUrl}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap');
                @media print {
                    body { margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    .testimonial-page { width: 100% !important; margin: 0 !important; }
                    .print-container { width: 100%; }
                }
            `}</style>
    </div>
  );
};

export default BulkTestimonialView;
