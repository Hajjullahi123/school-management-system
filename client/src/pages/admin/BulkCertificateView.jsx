import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../api';
import { useReactToPrint } from 'react-to-print';
import { Printer, Shield, Eye } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';

const BulkCertificateView = () => {
  const { year } = useParams();
  const navigate = useNavigate();
  const componentRef = useRef();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBulkData();
  }, [year]);

  const fetchBulkData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/certificates/bulk/${year}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch certificates');
      }
      const data = await response.json();
      setCertificates(data);
    } catch (err) {
      console.error('Bulk fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Bulk_Certificates_${year}`,
    pageStyle: `
            @page {
                size: A4 landscape;
                margin: 0;
            }
            @media print {
                .certificate-page {
                    page-break-after: always;
                   -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .certificate-page:last-child {
                    page-break-after: auto;
                }
            }
        `
  });

  if (loading) return (
    <div className="flex justify-center items-center h-screen flex-col gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-gray-500 font-medium">Preparing certificates for printing...</p>
    </div>
  );

  if (error) return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-red-800 font-bold text-xl mb-2">Error Loading Certificates</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700">Go Back</button>
      </div>
    </div>
  );

  if (certificates.length === 0) return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h2 className="text-yellow-800 font-bold text-xl mb-2">No Certificates Found</h2>
        <p className="text-yellow-600 mb-6">No certificates have been generated for the year {year} yet.</p>
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
              <h1 className="font-bold text-lg">Bulk Certificates: Class of {year}</h1>
              <p className="text-xs text-gray-500">{certificates.length} documents ready to print</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="bg-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-primary/90 transition-colors"
            >
              <Printer size={18} />
              Print All Certificates
            </button>
          </div>
        </div>
      </div>

      {/* Print Container */}
      <div ref={componentRef} className="print-container overflow-x-auto md:overflow-visible pb-10">
        {certificates.map((cert) => {
          const studentName = `${cert.student?.user?.firstName || ''} ${cert.student?.user?.lastName || ''} ${cert.student?.middleName || ''}`.trim();
          const verificationUrl = `${window.location.origin}/verify/certificate/${cert.certificateNumber}`;
          const displayPhotoUrl = cert.passportUrl || cert.student?.user?.photoUrl || cert.student?.photoUrl;

          const primaryCol = cert.school?.certPrimaryColor || cert.school?.primaryColor || '#1e40af';
          const secondaryCol = cert.school?.certSecondaryColor || cert.school?.secondaryColor || '#3b82f6';

          const getBorderStyle = (type, primary, secondary) => {
            switch (type) {
              case 'modern':
                return { border: `15px solid ${primary || '#3b82f6'}`, outline: `2px solid ${secondary || '#1e40af'}`, outlineOffset: '-25px' };
              case 'minimal':
                return { border: `4px solid ${primary || '#1e40af'}`, outline: '1px solid #ccc', outlineOffset: '-10px' };
              case 'solid':
                return { border: `30px solid ${primary || '#1e40af'}` };
              case 'none':
                return {};
              case 'ornate':
              default:
                return {
                  border: '15px solid',
                  borderImage: `linear-gradient(45deg, ${primary || '#d4af37'}, ${secondary || '#f4d03f'}) 1`
                };
            }
          };

          return (
            <div key={cert.id} className="certificate-page bg-white p-0 m-0 relative mx-auto my-4 shadow-xl md:shadow-none print:emerald-print-A4-landscape" style={{ width: '297mm', minWidth: '297mm', height: '210mm', overflow: 'hidden', fontFamily: cert.school?.certFontFamily || 'serif' }}>
              <div className="absolute inset-0" style={{ ...getBorderStyle(cert.school?.certBorderType, primaryCol, secondaryCol), margin: '0' }}>
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none"
                  style={{ fontSize: '100px', fontWeight: 'bold', transform: 'rotate(-45deg)' }}>
                  OFFICIAL
                </div>

                <div className="p-8 h-full flex flex-col justify-between relative z-10">
                  {/* Header */}
                  <div className="text-center relative">
                    <div className="absolute top-0 left-0">
                      {cert.school?.logoUrl && (
                        <img src={cert.school.logoUrl} alt="Logo" className="h-14 w-14 object-contain" />
                      )}
                    </div>
                    <div className="absolute top-0 right-0">
                      {displayPhotoUrl ? (
                        <img src={displayPhotoUrl} alt="Photo" className="h-20 w-20 object-cover border-2 border-gray-200 shadow-sm" />
                      ) : (
                        <div className="h-20 w-20 border-2 border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">No Photo</div>
                      )}
                    </div>

                    <h1 className="text-2xl font-bold mb-1 pt-2 outline-none hover:bg-gray-50 focus:bg-gray-50 rounded" style={{ color: primaryCol }} contentEditable suppressContentEditableWarning>
                      {cert.school?.name}
                    </h1>
                    <p className="text-gray-600 text-xs outline-none hover:bg-gray-50 focus:bg-gray-50 rounded" contentEditable suppressContentEditableWarning>{cert.school?.address}</p>

                    <div className="mt-4 mb-2">
                      <div className="inline-block border-t-2 border-b-2 border-yellow-600 py-1 px-8">
                        <h2 className="text-2xl font-serif text-yellow-700 uppercase tracking-tight outline-none focus:ring-2 focus:ring-yellow-500/50 rounded" contentEditable suppressContentEditableWarning>
                          CERTIFICATE
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 flex flex-col justify-center text-center px-6">
                    <p className="text-lg mb-2 text-gray-700 outline-none hover:bg-gray-50 focus:bg-gray-50 rounded" contentEditable suppressContentEditableWarning>This is to certify that</p>
                    <h3 className="text-3xl font-bold mb-2 text-gray-900 border-b-2 border-gray-200 pb-1 inline-block mx-auto px-4 outline-none hover:bg-gray-50 focus:bg-gray-50 rounded" contentEditable suppressContentEditableWarning>
                      {studentName.toUpperCase()}
                    </h3>
                    <p className="text-lg mb-2 text-gray-700 max-w-3xl mx-auto leading-tight outline-none hover:bg-gray-50 focus:bg-gray-50 rounded" contentEditable suppressContentEditableWarning>
                      {cert.content || 'has successfully completed the academic program and is hereby awarded this'}
                    </p>
                    <p className="text-xl font-semibold mb-2 outline-none hover:bg-gray-50 focus:bg-gray-50 rounded" style={{ color: primaryCol }} contentEditable suppressContentEditableWarning>
                      {cert.programType || 'Certificate of Graduation'}
                    </p>
                    <div className="text-base text-gray-700">
                      <span className="outline-none hover:bg-gray-50 focus:bg-gray-50 rounded" contentEditable suppressContentEditableWarning>in recognition of achievement from</span> <span className="font-semibold outline-none hover:bg-gray-50 focus:bg-gray-50 rounded" contentEditable suppressContentEditableWarning>{cert.commencementYear || '____'}</span> <span className="outline-none hover:bg-gray-50 focus:bg-gray-50 rounded" contentEditable suppressContentEditableWarning>to</span> <span className="font-semibold outline-none hover:bg-gray-50 focus:bg-gray-50 rounded" contentEditable suppressContentEditableWarning>{cert.graduationYear}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="grid grid-cols-3 gap-4 items-end mb-4">
                    <div className="text-center">
                      <div className="border-t border-gray-400 pt-1 mt-4">
                        <p className="font-semibold text-xs text-gray-700">Date Issued</p>
                        <p className="text-[10px] text-gray-500">{new Date(cert.dateIssued).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <QRCode value={verificationUrl} size={60} level="H" />
                      <p className="text-[8px] text-gray-400 font-mono mt-1">{cert.certificateNumber}</p>
                    </div>
                    <div className="text-center">
                      <div className="border-t border-gray-400 pt-1 mt-4">
                        <p className="font-semibold text-xs text-gray-700">Principal/Registrar</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest opacity-50">Signature</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-[9px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                      <Shield size={10} />
                      <span>Official Document • Verify at {window.location.host}/verify/certificate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
                @media print {
                    body { margin: 0; padding: 0; }
                    .no-print { display: none !important; }
                    .print-container { width: 100%; }
                }

                @media screen and (max-width: 1024px) {
                  .certificate-page {
                    zoom: 0.4;
                    -moz-transform: scale(0.4);
                    -moz-transform-origin: top center;
                  }
                }
            `}</style>
    </div>
  );
};

export default BulkCertificateView;
