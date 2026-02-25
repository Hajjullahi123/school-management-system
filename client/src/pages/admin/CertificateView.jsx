import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { API_BASE_URL } from '../../config';
import { useReactToPrint } from 'react-to-print';
import { Printer, Shield, FileDown } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { toast } from '../../utils/toast';

const CertificateView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const componentRef = useRef();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    commencementYear: '',
    programType: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCertificateData();
  }, [studentId]);

  useEffect(() => {
    if (certificate) {
      setFormData({
        content: certificate.content || 'has successfully completed the academic program and is hereby awarded this',
        commencementYear: certificate.commencementYear || '',
        programType: certificate.programType || 'Graduation'
      });
    }
  }, [certificate]);

  const fetchCertificateData = async () => {
    if (!studentId || studentId === 'undefined') {
      setError('Invalid Student ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 10000)
      );

      const requestPromise = api.get(`/api/certificates/${studentId}`);

      const response = await Promise.race([requestPromise, timeoutPromise]);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch certificate');
      }
      const data = await response.json();
      console.log('Certificate Data:', data);
      setCertificate(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching certificate:', error);
      setError(error.message || 'Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put(`/api/certificates/${certificate.id}`, formData);
      if (!response.ok) {
        throw new Error('Failed to update certificate');
      }
      const updatedCert = await response.json();
      setCertificate(updatedCert.certificate);
      setIsEditing(false);
      toast.success('Certificate updated successfully');
    } catch (error) {
      console.error('Error updating certificate:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      setSaving(true);
      const token = localStorage.getItem('token');

      // Use manual fetch to avoid Content-Type automatically being set to application/json
      const response = await fetch(`${API_BASE_URL}/api/upload/certificate/${certificate.id}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Do NOT set Content-Type header, let browser set it with boundary for FormData
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (data.passportUrl) {
        setCertificate(prev => ({
          ...prev,
          passportUrl: data.passportUrl
        }));
      }

      // Refresh full data to be safe
      fetchCertificateData();
    } catch (error) {
      console.error('Error uploading photo:', error);
      const errorMessage = error.message || 'Failed to upload photo';
      alert(`Upload Failed: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Certificate_${certificate?.student?.user?.firstName}_${certificate?.student?.user?.lastName}`,
    pageStyle: `
        @page {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `
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
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Certificate</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return null;
  }

  const studentName = `${certificate.student?.user?.firstName || ''} ${certificate.student?.user?.lastName || ''}`.trim();
  const verificationUrl = `${window.location.origin}/verify/certificate/${certificate.certificateNumber}`;
  // Prefer certificate-specific photo, then student photo
  const displayPhotoUrl = certificate.passportUrl || certificate.student?.photoUrl;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6 no-print">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Back
        </button>
        <div className="flex gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Edit Certificate
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer size={18} />
            Print Certificate
          </button>
        </div>
      </div>

      {/* Certificate Content */}
      <div
        ref={componentRef}
        className="bg-white shadow-2xl mx-auto relative print:shadow-none"
        style={{
          width: '297mm',
          height: '210mm',
          border: '20px solid',
          borderImage: 'linear-gradient(45deg, #d4af37, #f4d03f) 1',
        }}
      >
        {/* Watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none"
          style={{ fontSize: '120px', fontWeight: 'bold', transform: 'rotate(-45deg)' }}
        >
          OFFICIAL
        </div>

        <div className="p-8 pt-6 h-full flex flex-col justify-between relative z-10" style={{ overflow: 'hidden' }}>
          {/* Header */}
          <div className="text-center relative">
            <div className="absolute top-0 left-0">
              {certificate.school?.logoUrl && (
                <img
                  src={certificate.school.logoUrl}
                  alt="School Logo"
                  className="h-16 w-16 object-contain"
                />
              )}
            </div>
            <div className="absolute top-0 right-0">
              <div className="relative group">
                {displayPhotoUrl ? (
                  <img
                    src={displayPhotoUrl}
                    alt="Student Photo"
                    className="h-24 w-24 object-cover border-3 border-gray-200 shadow-sm"
                  />
                ) : (
                  <div className="h-24 w-24 border-3 border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                    No Photo
                  </div>
                )}

                {isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <label htmlFor="photo-upload" className="cursor-pointer text-white text-xs text-center p-2">
                      Click to Upload
                    </label>
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-1 pt-1" style={{ color: certificate.school?.primaryColor || '#1e40af' }}>
              {certificate.school?.name}
            </h1>
            {certificate.school?.address && (
              <p className="text-gray-600 text-sm">{certificate.school.address}</p>
            )}

            <div className="mt-4 mb-3">
              <div className="inline-block border-t-4 border-b-4 border-yellow-600 py-2 px-10">
                <h2 className="text-3xl font-serif text-yellow-700 uppercase">
                  CERTIFICATE OF {formData.programType?.toUpperCase() || 'GRADUATION'}
                </h2>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col justify-center text-center px-8">
            <p className="text-xl mb-3 text-gray-700">This is to certify that</p>

            <h3 className="text-4xl font-bold mb-3 text-gray-900 border-b-2 border-gray-300 pb-2 inline-block mx-auto px-6">
              {studentName.toUpperCase()}
            </h3>

            {isEditing ? (
              <div className="mb-3">
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-2 border rounded text-xl text-center font-serif"
                  rows={2}
                />
              </div>
            ) : (
              <p className="text-xl mb-3 text-gray-700 max-w-4xl mx-auto">
                {certificate.content || 'has successfully completed the academic program and is hereby awarded this'}
              </p>
            )}

            {isEditing ? (
              <div className="mb-3">
                <input
                  type="text"
                  value={formData.programType}
                  onChange={(e) => setFormData({ ...formData, programType: e.target.value })}
                  className="text-2xl font-semibold text-center border rounded p-1"
                  placeholder="Graduation Level (e.g. Primary School)"
                  style={{ color: certificate.school?.primaryColor || '#1e40af' }}
                />
              </div>
            ) : (
              <p className="text-2xl font-semibold mb-3" style={{ color: certificate.school?.primaryColor || '#1e40af' }}>
                {formData.programType || 'Certificate of Graduation'}
              </p>
            )}

            <div className="flex justify-center items-center gap-2 text-lg text-gray-700">
              <span>in recognition of dedicated study and achievement from</span>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.commencementYear}
                  onChange={(e) => setFormData({ ...formData, commencementYear: e.target.value })}
                  placeholder="Year"
                  className="w-24 p-1 border rounded text-center"
                />
              ) : (
                <span className="font-semibold">{certificate.commencementYear || '____'}</span>
              )}
              <span>to</span>
              <span className="font-semibold">{certificate.graduationYear}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-3 gap-6 items-end">
            {/* Date */}
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-6">
                <p className="font-semibold text-sm">Date</p>
                <p className="text-xs text-gray-600">
                  {new Date(certificate.dateIssued).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center">
              <div className="inline-block">
                <QRCode value={verificationUrl} size={70} level="H" />
                <p className="text-[10px] text-gray-500 mt-1">Scan to Verify</p>
                <p className="text-[10px] text-gray-400 font-mono">{certificate.certificateNumber}</p>
              </div>
            </div>

            {/* Signature */}
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-6">
                <p className="font-semibold text-sm">Principal/Registrar</p>
                <p className="text-xs text-gray-600">Authorized Signature</p>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="mt-3 text-center">
            <div className="inline-flex items-center gap-2 text-[10px] text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              <Shield size={12} />
              <span>Official Document • Verification: {verificationUrl}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default CertificateView;
