import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { toast } from 'react-hot-toast';

export default function ExamCardManagement() {
  const { settings: schoolSettings } = useSchoolSettings();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'print'

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId && currentTerm && currentSession) {
      fetchStudentsAndCards();
    }
  }, [selectedClassId]);

  const fetchInitialData = async () => {
    try {
      const [termsRes, sessionsRes, classesRes] = await Promise.all([
        api.get('/api/terms'),
        api.get('/api/academic-sessions'),
        api.get('/api/classes')
      ]);

      const terms = await termsRes.json();
      const sessions = await sessionsRes.json();
      const classData = await classesRes.json();

      const activeTerm = terms.find(t => t.isCurrent);
      const activeSession = sessions.find(s => s.isCurrent);

      setCurrentTerm(activeTerm);
      setCurrentSession(activeSession);
      setClasses(Array.isArray(classData) ? classData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsAndCards = async () => {
    try {
      setLoading(true);
      // Get students in the selected class
      const studentsRes = await api.get(`/api/students?classId=${selectedClassId}`);
      const studentsData = await studentsRes.json();
      const studentList = Array.isArray(studentsData) ? studentsData : (studentsData.students || []);

      // Get existing exam cards for this class
      let existingCards = [];
      try {
        const cardsRes = await api.get(`/api/exam-cards/all?termId=${currentTerm.id}&academicSessionId=${currentSession.id}`);
        const cardsData = await cardsRes.json();
        existingCards = Array.isArray(cardsData) ? cardsData : [];
      } catch (e) {
        // No cards yet
      }

      // Map cards to students
      const cardMap = {};
      existingCards.forEach(card => {
        cardMap[card.studentId] = card;
      });

      const enriched = studentList.map(s => ({
        ...s,
        hasCard: !!cardMap[s.id],
        cardNumber: cardMap[s.id]?.cardNumber || null,
        issuedAt: cardMap[s.id]?.issuedAt || null
      }));

      setStudents(enriched);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const generateForStudent = async (studentId) => {
    try {
      const res = await api.post('/api/exam-cards/generate', {
        termId: currentTerm.id,
        academicSessionId: currentSession.id,
        studentId
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Exam card generated!');
        fetchStudentsAndCards();
      } else {
        toast.error(data.error || 'Failed to generate');
      }
    } catch (error) {
      toast.error('Failed to generate exam card');
    }
  };

  const bulkGenerate = async () => {
    if (!selectedClassId) {
      toast.error('Please select a class first');
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post('/api/exam-cards/bulk-generate', {
        termId: currentTerm.id,
        academicSessionId: currentSession.id,
        classId: parseInt(selectedClassId)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Bulk generation complete!');
        fetchStudentsAndCards();
      } else {
        toast.error(data.error || 'Bulk generation failed');
      }
    } catch (error) {
      toast.error('Bulk generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const loadCardsForPrint = async () => {
    if (!selectedClassId) {
      toast.error('Please select a class first');
      return;
    }

    // Filter students who have cards
    const studentsWithCards = students.filter(s => s.hasCard);
    if (studentsWithCards.length === 0) {
      toast.error('No exam cards generated yet. Generate cards first.');
      return;
    }

    // Load full card data for each student
    const cards = [];
    for (const student of studentsWithCards) {
      try {
        const res = await api.get(`/api/exam-cards/student/${student.id}?termId=${currentTerm.id}&academicSessionId=${currentSession.id}`);
        if (res.ok) {
          const data = await res.json();
          cards.push(data);
        }
      } catch (e) {
        // Skip failed ones
      }
    }

    setGeneratedCards(cards);
    setViewMode('print');
  };

  const printSingleCard = async (studentId) => {
    try {
      const res = await api.get(`/api/exam-cards/student/${studentId}?termId=${currentTerm.id}&academicSessionId=${currentSession.id}`);
      if (res.ok) {
        const data = await res.json();
        setGeneratedCards([data]);
        setViewMode('print');
      } else {
        toast.error('Failed to load card for printing');
      }
    } catch (e) {
      toast.error('Failed to load card');
    }
  };

  const printCards = () => {
    window.print();
  };

  const selectedClass = classes.find(c => c.id === parseInt(selectedClassId));
  const studentsWithCards = students.filter(s => s.hasCard).length;
  const studentsWithoutCards = students.filter(s => !s.hasCard).length;

  if (loading && classes.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (viewMode === 'print' && generatedCards.length > 0) {
    return (
      <div>
        <div className="print:hidden p-6 bg-white shadow rounded-lg mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Print Exam Cards</h1>
            <p className="text-gray-600 text-sm">{generatedCards.length} cards ready • {selectedClass ? `${selectedClass.name} ${selectedClass.arm || ''}`.trim() : ''}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              ← Back
            </button>
            <button
              onClick={printCards}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print All Cards
            </button>
          </div>
        </div>

        {/* Printable Cards Grid - 2 cards per A4 page */}
        <div className="print-cards-container" id="print-area">
          {generatedCards.map((card, idx) => (
            <div key={idx} className="exam-card-print" style={{
              width: '105mm',
              minHeight: '148mm',
              padding: '10mm 8mm',
              border: '1px solid #ccc',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              background: 'white',
              pageBreakInside: 'avoid',
              margin: '8px auto'
            }}>
              {/* Watermark */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.03, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                {schoolSettings?.logoUrl && (
                  <img src={schoolSettings.logoUrl} alt="" style={{ width: '50%', filter: 'grayscale(1)' }} />
                )}
              </div>

              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: '6px', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
                {schoolSettings?.logoUrl && (
                  <img src={schoolSettings.logoUrl} alt="Logo" style={{ height: '36px', width: '36px', position: 'absolute', left: 0, top: 0, objectFit: 'contain' }} />
                )}
                <h2 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, padding: '0 40px' }}>
                  {schoolSettings?.schoolName || 'EXAMINATION CARD'}
                </h2>
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#4338ca', letterSpacing: '2px', margin: '3px 0 0 0' }}>EXAMINATION CARD</p>
                <p style={{ fontSize: '9px', color: '#666', margin: '2px 0 0 0' }}>
                  {currentSession?.name} • {currentTerm?.name}
                </p>
              </div>

              {/* Student Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px', position: 'relative', zIndex: 1 }}>
                <div>
                  {card.student?.photoUrl ? (
                    <img src={`${API_BASE_URL}${card.student.photoUrl}`} alt="Student" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '3/4', background: '#f3f4f6', borderRadius: '4px', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#999' }}>No Photo</div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                  <div>
                    <label style={{ fontSize: '7px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>Student Name</label>
                    <p style={{ fontSize: '11px', fontWeight: 'bold', margin: 0 }}>{card.student?.name}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>
                      <label style={{ fontSize: '7px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>Admission No</label>
                      <p style={{ fontSize: '9px', fontWeight: 'bold', margin: 0 }}>{card.student?.admissionNumber}</p>
                    </div>
                    <div>
                      <label style={{ fontSize: '7px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>Class</label>
                      <p style={{ fontSize: '9px', fontWeight: 'bold', margin: 0 }}>{card.student?.class}</p>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '7px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>Card Access ID</label>
                    <p style={{ fontSize: '8px', fontFamily: 'monospace', color: '#555', margin: 0 }}>{card.cardNumber}</p>
                  </div>
                </div>
              </div>

              {/* Subjects */}
              <div style={{ marginTop: '8px', flexGrow: 1, position: 'relative', zIndex: 1 }}>
                <h3 style={{ fontSize: '9px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '3px', marginBottom: '4px' }}>Registered Subjects:</h3>
                {card.subjects && card.subjects.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
                    {card.subjects.slice(0, 14).map((subject, i) => (
                      <div key={i} style={{ fontSize: '8px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: '3px', height: '3px', background: '#6366f1', borderRadius: '50%', flexShrink: 0 }}></span>
                        <span>{subject.name}</span>
                      </div>
                    ))}
                    {card.subjects.length > 14 && (
                      <div style={{ fontSize: '7px', color: '#888', fontStyle: 'italic' }}>+{card.subjects.length - 14} more...</div>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '8px', color: '#d97706' }}>No subjects registered</p>
                )}
              </div>

              {/* Footer */}
              <div style={{ marginTop: 'auto', borderTop: '1px solid #eee', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '7px', color: '#666' }}>
                  <p style={{ fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase', fontSize: '7px', margin: 0 }}>Security Notice:</p>
                  <p style={{ margin: '1px 0 0 0' }}>Must be presented for entry.</p>
                  <p style={{ margin: '3px 0 0 0' }}>Issued: {card.issuedAt ? new Date(card.issuedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {schoolSettings?.principalSignatureUrl ? (
                    <img
                      src={schoolSettings.principalSignatureUrl.startsWith('data:') || schoolSettings.principalSignatureUrl.startsWith('http') ? schoolSettings.principalSignatureUrl : `${API_BASE_URL}${schoolSettings.principalSignatureUrl}`}
                      alt="Principal Signature"
                      style={{ height: '28px', width: 'auto', margin: '0 auto', objectFit: 'contain', mixBlendMode: 'multiply' }}
                    />
                  ) : (
                    <div style={{ height: '18px' }}></div>
                  )}
                  <div style={{ borderTop: '1px solid #333', width: '100%', marginTop: '2px', paddingTop: '1px' }}>
                    <p style={{ fontSize: '7px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', margin: 0 }}>Principal</p>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <QRCodeCanvas value={card.cardNumber || 'N/A'} size={48} />
                  <p style={{ fontSize: '6px', color: '#aaa', margin: '2px 0 0 0' }}>VERIFY</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <style>{`
          @media screen {
            .print-cards-container {
              display: flex;
              flex-wrap: wrap;
              gap: 16px;
              justify-content: center;
              padding: 16px;
            }
          }
          @media print {
            body * { visibility: hidden; margin: 0 !important; padding: 0 !important; }
            #print-area, #print-area * { visibility: visible; }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .exam-card-print {
              page-break-inside: avoid;
              page-break-after: always;
              margin: 0 auto !important;
            }
            .exam-card-print:last-child {
              page-break-after: auto;
            }
            @page { size: A4; margin: 10mm; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Card Management</h1>
          <p className="text-gray-500 text-sm mt-1">Generate and print examination cards for students</p>
        </div>
        {currentTerm && currentSession && (
          <div className="text-right text-sm">
            <p className="font-bold text-gray-800">{currentSession.name}</p>
            <p className="text-gray-500">{currentTerm.name}</p>
          </div>
        )}
      </div>

      {/* Class Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => { setSelectedClassId(e.target.value); setStudents([]); setGeneratedCards([]); setViewMode('list'); }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 outline-none"
            >
              <option value="">-- Choose a class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.arm || ''}</option>
              ))}
            </select>
          </div>
          {selectedClassId && students.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={bulkGenerate}
                disabled={generating}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Generate All Cards
                  </>
                )}
              </button>
              {studentsWithCards > 0 && (
                <button
                  onClick={loadCardsForPrint}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print All ({studentsWithCards})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {selectedClassId && students.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <p className="text-3xl font-black text-gray-800">{students.length}</p>
            <p className="text-xs font-bold text-gray-500 uppercase mt-1">Total Students</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <p className="text-3xl font-black text-emerald-600">{studentsWithCards}</p>
            <p className="text-xs font-bold text-gray-500 uppercase mt-1">Cards Generated</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <p className="text-3xl font-black text-amber-600">{studentsWithoutCards}</p>
            <p className="text-xs font-bold text-gray-500 uppercase mt-1">Pending</p>
          </div>
        </div>
      )}

      {/* Student List */}
      {selectedClassId && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800">
              Students {selectedClass ? `- ${selectedClass.name} ${selectedClass.arm || ''}`.trim() : ''}
            </h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No students found in this class</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3 text-left font-bold">#</th>
                    <th className="px-6 py-3 text-left font-bold">Student</th>
                    <th className="px-6 py-3 text-left font-bold">Admission No.</th>
                    <th className="px-6 py-3 text-center font-bold">Status</th>
                    <th className="px-6 py-3 text-center font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-500 font-mono text-xs">{idx + 1}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {student.photoUrl ? (
                            <img src={`${API_BASE_URL}${student.photoUrl}`} alt="" className="w-8 h-8 rounded-full object-cover border" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {(student.user?.firstName?.[0] || '')}{(student.user?.lastName?.[0] || '')}
                            </div>
                          )}
                          <span className="font-medium text-gray-900">
                            {student.user?.firstName} {student.user?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600 font-mono text-xs">{student.admissionNumber}</td>
                      <td className="px-6 py-3 text-center">
                        {student.hasCard ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Generated
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!student.hasCard ? (
                            <button
                              onClick={() => generateForStudent(student.id)}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                            >
                              Generate
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => printSingleCard(student.id)}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Print
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!selectedClassId && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-600 mb-2">Select a Class</h3>
          <p className="text-gray-400">Choose a class above to view students and manage exam cards</p>
        </div>
      )}
    </div>
  );
}
