import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../api';
import { useSchoolSettings } from '../../hooks/useSchoolSettings';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, Printer, ChevronLeft, ShieldCheck, Award, Pencil, Check } from 'lucide-react';

const TranscriptView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { settings: schoolSettings } = useSchoolSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingYear, setEditingYear] = useState(false);
  const [yearOfEntry, setYearOfEntry] = useState('');
  const componentRef = useRef();

  useEffect(() => {
    fetchTranscriptData();
  }, [studentId]);

  const fetchTranscriptData = async () => {
    try {
      const res = await api.get(`/api/promotion/transcript/${studentId}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        // Default year of entry from enrollment date; admin can override
        const defaultYear = d?.student?.enrollmentDate
          ? new Date(d.student.enrollmentDate).getFullYear()
          : '';
        setYearOfEntry(defaultYear);
      } else {
        setError('Failed to load transcript data');
      }
    } catch (err) {
      setError('Error fetching transcript');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Transcript_${data?.student?.user?.firstName}_${data?.student?.user?.lastName}`,
  });

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={() => navigate(-1)} className="text-primary flex items-center justify-center gap-2 mx-auto">
        <ChevronLeft className="w-4 h-4" /> Go Back
      </button>
    </div>
  );

  const { student, academicHistory, promotionHistory } = data;
  const verificationUrl = `${window.location.origin}/verify/transcript/${studentId}`;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Controls */}
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center no-print">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5" /> Back to Alumni
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg shadow hover:brightness-90 transition-all font-bold"
        >
          <Printer className="w-5 h-5" /> Print Secure Transcript
        </button>
      </div>

      {/* Transcript Preview */}
      <div
        ref={componentRef}
        className="mx-auto bg-white shadow-2xl rounded-none relative overflow-hidden transcript-container print:shadow-none"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm'
        }}
      >
        {/* Subtle Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-45deg] select-none">
          <h1 className="text-[120px] font-black uppercase text-gray-900 whitespace-nowrap">
            OFFICIAL TRANSCRIPT
          </h1>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start border-b-4 border-primary pb-8 mb-8 relative z-10">
          <div className="flex gap-6 items-center">
            {schoolSettings?.logoUrl && (
              <img
                src={schoolSettings.logoUrl}
                alt="Logo"
                className="w-24 h-24 object-contain"
              />
            )}
            <div>
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-tight">
                {schoolSettings?.schoolName || 'School Name'}
              </h1>
              <p className="text-gray-600 font-medium">Official Academic Transcript</p>
              <p className="text-sm text-gray-500 max-w-sm mt-1">
                {schoolSettings?.address || 'School Address Not Set'}
              </p>
              <p className="text-xs text-gray-400 mt-2 italic font-serif">
                "Excellence in Education and Character"
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-4">
            {student.photoUrl ? (
              <div className="w-24 h-24 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                <img
                  src={student.photoUrl.startsWith('http') ? student.photoUrl : `${API_BASE_URL || ''}${student.photoUrl}`}
                  alt="Student Passport"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                <div className="bg-gray-200 p-2 rounded-full mb-1">
                  <Loader2 className="w-6 h-6 opacity-20" /> {/* Reusing an icon for placeholder feel */}
                </div>
                <span className="text-[8px] font-bold uppercase tracking-tighter">Photo</span>
                <span className="text-[8px] font-bold uppercase tracking-tighter">Required</span>
              </div>
            )}
            <div className="text-right max-w-[160px]">
              <div className="bg-primary/10 px-2 py-1 rounded border border-primary/20 mb-1">
                <p className="text-[8px] font-bold text-primary uppercase tracking-wide">Transcript ID</p>
                <p className="text-[9px] font-mono text-primary break-all leading-tight">{student.user.username?.toUpperCase() || 'N/A'}</p>
              </div>
              <p className="text-[9px] text-gray-400">Issued: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Student Info Grid */}
        <div className="grid grid-cols-2 gap-12 mb-10 text-sm relative z-10">
          <div className="space-y-3 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <h3 className="font-bold uppercase text-xs text-gray-500 tracking-widest border-b pb-2">Student Particulars</h3>
            <p><span className="text-gray-500 font-medium inline-block w-32">Full Name:</span> <span className="font-bold text-gray-900 uppercase">{student.user.firstName} {student.middleName || ''} {student.user.lastName}</span></p>
            <p><span className="text-gray-500 font-medium inline-block w-32">Admission No:</span> <span className="font-bold font-mono">{student.admissionNumber}</span></p>
            <p><span className="text-gray-500 font-medium inline-block w-32">Alumni ID:</span> <span className="font-bold font-mono">{student.alumni?.alumniId || student.alumniId || 'N/A'}</span></p>
            <p><span className="text-gray-500 font-medium inline-block w-32">Gender:</span> <span>{student.gender}</span></p>
            <p><span className="text-gray-500 font-medium inline-block w-32">Date of Birth:</span> <span>{new Date(student.dateOfBirth).toLocaleDateString()}</span></p>
          </div>
          <div className="space-y-3 bg-gray-50 p-6 rounded-lg border border-gray-100">
            <h3 className="font-bold uppercase text-xs text-gray-500 tracking-widest border-b pb-2">Academic Record Summary</h3>
            <p className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-500 font-medium inline-block w-40">Year of Entry:</span>
              {editingYear ? (
                <span className="flex items-center gap-1 no-print">
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    className="border border-primary rounded px-1 py-0.5 w-24 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                    value={yearOfEntry}
                    onChange={e => setYearOfEntry(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setEditingYear(false)}
                    className="p-1 bg-primary text-white rounded no-print"
                    title="Confirm"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="font-bold">{yearOfEntry || 'N/A'}</span>
                  <button
                    type="button"
                    onClick={() => setEditingYear(true)}
                    className="p-1 text-gray-400 hover:text-primary rounded no-print"
                    title="Edit year of entry"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </span>
              )}
            </p>
            <p><span className="text-gray-500 font-medium inline-block w-40">Year of Graduation:</span> <span className="font-bold text-primary">{student.alumni?.graduationYear || 'N/A'}</span></p>
            <p><span className="text-gray-500 font-medium inline-block w-40">Class at Graduation:</span> <span>{
              (() => {
                const gradEvent = (promotionHistory || []).find(h => h.type === 'graduation');
                const cls = gradEvent?.fromClass;
                if (!cls) return student.classModel?.name || 'N/A';
                return cls.arm ? `${cls.name} ${cls.arm}` : cls.name;
              })()
            }</span></p>
            <p><span className="text-gray-500 font-medium inline-block w-40">Status:</span>
              <span className="ml-2 inline-flex items-center gap-1 text-green-600 font-bold uppercase text-[10px]">
                <ShieldCheck className="w-3 h-3" /> VERIFIED ALUMNI
              </span>
            </p>
          </div>
        </div>

        {/* Academic History Table */}
        <div className="space-y-8 relative z-10 mb-12">
          {Object.entries(academicHistory).length > 0 ? Object.entries(academicHistory).flatMap(([sessionName, terms]) =>
            Object.entries(terms).map(([termName, termData]) => (
              <div key={`${sessionName}-${termName}`} className="page-break-inside-avoid border rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="bg-gray-800 text-white px-4 py-2.5 flex justify-between items-center">
                  <h4 className="font-bold uppercase text-[10px] tracking-[0.2em]">
                    {termName} - {sessionName} ACADEMIC SESSION
                  </h4>
                  <div className="text-[10px] font-black bg-white/10 px-2 py-1 rounded border border-white/10 uppercase tracking-widest">
                    Performance Report
                  </div>
                </div>
                <div className="p-4">
                  <table className="min-w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px]">
                        <th className="px-3 py-2 text-left w-16 border">Subject Code</th>
                        <th className="px-3 py-2 text-left border">Course Description</th>
                        <th className="px-3 py-2 text-center w-24 border">Score (100)</th>
                        <th className="px-3 py-2 text-center w-16 border">Grade</th>
                        <th className="px-3 py-2 text-center w-24 border">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border">
                      {termData.results.map((res, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-500 border">{res.code || 'N/A'}</td>
                          <td className="px-3 py-2 font-bold text-gray-800 border uppercase">{res.subject}</td>
                          <td className="px-3 py-2 text-center font-black border text-gray-900">{res.score}</td>
                          <td className={`px-3 py-2 text-center font-black border ${res.grade === 'A' ? 'text-green-600' : res.grade === 'F' ? 'text-red-600' : 'text-gray-900'}`}>{res.grade}</td>
                          <td className="px-3 py-2 text-center text-[9px] uppercase font-black text-gray-400 border italic">
                            {res.score >= 70 ? 'Distinction' : res.score >= 60 ? 'Credit' : res.score >= 40 ? 'Pass' : 'Fail'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 flex justify-end">
                    <div className="text-[10px] font-black text-gray-600 bg-gray-50 px-4 py-2 rounded border border-gray-100 uppercase tracking-widest">
                      Term Weighted Average: <span className="text-primary ml-2">{termData.average}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 border-2 border-dashed rounded-xl text-gray-400">
              <Award className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No consolidated academic records found for this student.</p>
            </div>
          )}
        </div>

        {/* Authentication Footer */}
        <div className="mt-auto pt-10 border-t-2 border-gray-100 flex justify-between items-end relative z-10 page-break-inside-avoid">
          <div className="w-1/3 flex flex-col items-center">
            <div className="h-24 w-40 relative flex items-center justify-center">
              {/* Seal/Stamp Simulation */}
              <div className="absolute inset-0 flex items-center justify-center opacity-60">
                <div className="w-32 h-32 border-4 border-double border-red-600/60 rounded-full flex flex-col items-center justify-center rotate-[-15deg]">
                  <div className="text-[10px] font-black text-red-600/80 uppercase">DEPT OF EDUCATION</div>
                  <div className="text-[12px] font-black text-red-600/80 uppercase my-1">OFFICIAL SEAL</div>
                  <div className="text-[10px] font-black text-red-600/80 uppercase">APPROVED</div>
                </div>
              </div>
            </div>
            <div className="w-full border-b border-gray-900 mb-2 mt-4"></div>
            <p className="text-[10px] font-bold uppercase text-gray-800">Registrar / Exams Officer</p>
          </div>

          <div className="w-1/3 flex flex-col items-center text-center">
            <div className="p-2 border bg-white rounded-md mb-2">
              <QRCodeSVG
                value={verificationUrl}
                size={80}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-[8px] text-gray-400 mb-1">SCAN TO VERIFY AUTHENTICITY</p>
            <p className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">WWW.VERIFY.SCHOOL.EDU</p>
          </div>

          <div className="w-1/3 flex flex-col items-center relative">
            <div className="h-24 flex items-end justify-center relative w-full">
              {schoolSettings?.principalSignatureUrl ? (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                  <img src={schoolSettings.principalSignatureUrl.startsWith('data:') || schoolSettings.principalSignatureUrl.startsWith('http') ? schoolSettings.principalSignatureUrl : `${API_BASE_URL}${schoolSettings.principalSignatureUrl}`} alt="Principal Signature" className="h-[60px] w-auto mix-blend-multiply" />
                </div>
              ) : (
                <div className="italic font-serif text-2xl text-blue-900/40 select-none">Principal Signature</div>
              )}
            </div>
            <div className="w-full border-b border-gray-900 mb-2 mt-4"></div>
            <p className="text-[10px] font-bold uppercase text-gray-800">School Principal / Head</p>
          </div>
        </div>

        {/* Footer Legal */}
        <div className="mt-12 pt-6 border-t border-gray-100 text-[9px] text-gray-400 text-center relative z-10">
          <p>This document is an official transcript of academic records and is valid only with the school's embossed seal and authorized signatures.</p>
          <p className="mt-1">Any alteration to this document renders it null and void. For verification, scan the QR code above or contact {schoolSettings?.schoolName}.</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        background: white;
                    }
                    .no-print {
                        display: none !important;
                    }
                    input[type=number] {
                        display: none !important;
                    }
                    .transcript-container {
                        box-shadow: none !important;
                        padding: 20mm !important;
                        width: 100% !important;
                    }
                    .page-break-inside-avoid {
                        page-break-inside: avoid;
                    }
                }
                .transcript-container {
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }
                .term-block:last-child {
                    margin-bottom: 0 !important;
                }
            `}} />
    </div>
  );
};

export default TranscriptView;
