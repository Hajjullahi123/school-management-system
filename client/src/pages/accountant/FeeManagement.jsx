import { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import PrintReceiptModal from '../../components/PrintReceiptModal';
import PrintScholarshipModal from '../../components/PrintScholarshipModal';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { toast } from 'react-hot-toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { API_BASE_URL } from '../../api';

export default function FeeManagement() {
  const { user: authUser } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [students, setStudents] = useState([]);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Term/Session selection for payment
  const [allTerms, setAllTerms] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState(null);
  const [selectedPaymentSession, setSelectedPaymentSession] = useState(null);

  // Edit Payment State
  const [editingPayment, setEditingPayment] = useState(null);

  // Print Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [receiptStudent, setReceiptStudent] = useState(null);

  // Scholarship Print State
  const [scholarshipModalOpen, setScholarshipModalOpen] = useState(false);
  const [scholarshipStudent, setScholarshipStudent] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [classes, setClasses] = useState([]);

  // Class navigation
  const [selectedClassView, setSelectedClassView] = useState(null);
  const [classSummaries, setClassSummaries] = useState({});

  // Bulk operations
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showBulkClear, setShowBulkClear] = useState(false);

  // Payment history
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyStudent, setHistoryStudent] = useState(null);

  // Restriction Management State
  const [restrictionModalOpen, setRestrictionModalOpen] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictionStudent, setRestrictionStudent] = useState(null);

  // Fee Adjustment State
  const [editingFeeRecord, setEditingFeeRecord] = useState(null);
  const [adjustedExpected, setAdjustedExpected] = useState('');
  const [adjustedPaid, setAdjustedPaid] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState('standard'); // 'standard' or 'misc'
  const [detailedAnalytics, setDetailedAnalytics] = useState([]);
  const [loadingMisc, setLoadingMisc] = useState(false);
  const [expandedFee, setExpandedFee] = useState(null);
  const [expandedClass, setExpandedClass] = useState(null);
  const [selectedMiscTerm, setSelectedMiscTerm] = useState(null);
  const [selectedMiscSession, setSelectedMiscSession] = useState(null);

  // Misc Payment States
  const [selectedMiscPayment, setSelectedMiscPayment] = useState(null);
  const [showMiscFeeModal, setShowMiscFeeModal] = useState(false);
  const [miscFeeLoading, setMiscFeeLoading] = useState(false);
  const [miscFeeFormData, setMiscFeeFormData] = useState({
    title: '',
    description: '',
    amount: '',
    isCompulsory: false,
    classIds: [],
    sessionId: '',
    termId: ''
  });
  const [miscFormData, setMiscFormData] = useState({
    amount: '',
    paymentMethod: 'cash',
    receiptNumber: ''
  });

  const handleEditFee = (student) => {
    const record = student.feeRecords[0];
    setEditingFeeRecord({ student, record });
    setAdjustedExpected(record?.expectedAmount.toString() || '0');
    setAdjustedPaid(record?.paidAmount.toString() || '0');
  };

  const saveFeeRecord = async () => {
    if (!editingFeeRecord) return;

    try {
      const expected = parseFloat(adjustedExpected) || 0;
      const paid = parseFloat(adjustedPaid) || 0;
      const opening = editingFeeRecord.record?.openingBalance || 0;
      const totalDue = opening + expected;

      if (expected < 0 || paid < 0) {
        alert('Fee amounts cannot be negative');
        return;
      }

      if (paid > totalDue) {
        alert(`Total Paid (₦${formatNumber(paid)}) cannot exceed the total amount due (₦${formatNumber(totalDue)})`);
        return;
      }

      setLoading(true);
      const response = await api.post('/api/fees/record', {
        studentId: editingFeeRecord.student.id,
        termId: currentTerm.id,
        academicSessionId: currentSession.id,
        expectedAmount: expected,
        paidAmount: paid
      });

      const data = await response.json();
      if (response.ok) {
        alert('Fee record adjusted successfully');
        setEditingFeeRecord(null);
        await loadStudents(currentTerm.id, currentSession.id);
        await loadSummary(currentTerm.id, currentSession.id);
      } else {
        alert(data.error || 'Failed to adjust fee record');
      }
    } catch (error) {
      console.error('Error adjusting fee:', error);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleRestrictClick = (student) => {
    setRestrictionStudent(student);
    setIsRestricted(student.isExamRestricted || false);
    setRestrictionReason(student.examRestrictionReason || '');
    setRestrictionModalOpen(true);
  };

  const saveRestriction = async () => {
    if (!restrictionStudent) return;

    try {
      const response = await api.put(`/api/students/${restrictionStudent.id}`, {
        isExamRestricted: isRestricted,
        examRestrictionReason: restrictionReason
      });

      if (response.ok) {
        alert('Restriction settings updated successfully');
        setRestrictionModalOpen(false);
        // Refresh data
        if (viewAllTerms) {
          await loadStudentsAllTerms(selectedViewSession.id);
        } else {
          await loadStudents(currentTerm.id, currentSession.id);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update restriction');
      }
    } catch (error) {
      console.error('Error saving restriction:', error);
      alert('Failed to save restriction settings');
    }
  };

  // View mode
  const [viewMode, setViewMode] = useState('table');

  // View filters - for selecting which term/session to view
  const [selectedViewTerm, setSelectedViewTerm] = useState(null);
  const [selectedViewSession, setSelectedViewSession] = useState(null);
  const [viewAllTerms, setViewAllTerms] = useState(false);
  const [viewAllSessions, setViewAllSessions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'misc') {
      fetchDetailedAnalytics();
    }
  }, [activeTab, selectedMiscTerm, selectedMiscSession]);

  const fetchDetailedAnalytics = async () => {
    try {
      setLoadingMisc(true);
      let url = '/api/misc-fees/detailed-analytics';
      const params = new URLSearchParams();
      if (selectedMiscSession) params.append('sessionId', selectedMiscSession);
      if (selectedMiscTerm) params.append('termId', selectedMiscTerm);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      if (response.ok) {
        const data = await response.json();
        setDetailedAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching detailed analytics:', error);
    } finally {
      setLoadingMisc(false);
    }
  };

  const handleCreateMiscFee = async (e) => {
    e.preventDefault();
    if (!miscFeeFormData.title || !miscFeeFormData.amount) {
      toast.error('Title and Amount are required');
      return;
    }
    if (miscFeeFormData.classIds.length === 0) {
      toast.error('Please select at least one class');
      return;
    }

    try {
      setMiscFeeLoading(true);
      const response = await api.post('/api/misc-fees', {
        ...miscFeeFormData,
        academicSessionId: miscFeeFormData.sessionId || selectedMiscSession,
        termId: miscFeeFormData.termId || selectedMiscTerm,
        amount: parseFloat(miscFeeFormData.amount)
      });

      if (response.ok) {
        toast.success('Miscellaneous fee created successfully');
        setShowMiscFeeModal(false);
        setMiscFeeFormData({
          title: '',
          description: '',
          amount: '',
          isCompulsory: false,
          classIds: [],
          sessionId: '',
          termId: ''
        });
        fetchDetailedAnalytics();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create fee');
      }
    } catch (error) {
      console.error('Error creating misc fee:', error);
      toast.error('An error occurred while creating the fee');
    } finally {
      setMiscFeeLoading(false);
    }
  };

  const handleMiscClassToggle = (classId) => {
    const idStr = classId.toString();
    setMiscFeeFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(idStr)
        ? prev.classIds.filter(id => id !== idStr)
        : [...prev.classIds, idStr]
    }));
  };

  const handleMiscPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMiscPayment) return;

    try {
      setLoadingMisc(true);
      const response = await api.post('/api/misc-fees/payments', {
        studentId: selectedMiscPayment.student.id,
        feeId: selectedMiscPayment.fee.id,
        amount: parseFloat(miscFormData.amount),
        paymentMethod: miscFormData.paymentMethod,
        receiptNumber: miscFormData.receiptNumber
      });

      if (response.ok) {
        toast.success('Payment recorded successfully');
        setSelectedMiscPayment(null);
        setMiscFormData({ amount: '', paymentMethod: 'cash', receiptNumber: '' });
        fetchDetailedAnalytics(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording misc payment:', error);
      toast.error('An error occurred while recording payment');
    } finally {
      setLoadingMisc(false);
    }
  };

  const handlePrintMiscReceipt = async (paymentId) => {
    try {
      const response = await api.get(`/api/misc-fees/receipt/${paymentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch receipt data');
      }
      const payment = await response.json();

      const primaryColor = schoolSettings.primaryColor || '#0f766e';
      const logoUrl = schoolSettings.logoUrl
        ? (schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL}${schoolSettings.logoUrl}`)
        : null;

      // Generate security markers
      const securityHash = btoa(`MISC-${payment.id}-${payment.student.id}`).substring(0, 12).toUpperCase();
      const barcodeText = `MISC-${payment.id}`;
      const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeText)}&scale=3&rotate=N&includetext=true&backgroundcolor=ffffff&height=12`;      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${payment.student.admissionNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: 74mm 105mm;
            margin: 0;
          }
          @media print {
            body { margin: 0; padding: 0; background: white !important; }
            .no-print { display: none !important; }
            .receipt-card { box-shadow: none !important; border: 1px solid #eee !important; margin: 0 !important; width: 74mm !important; height: 105mm !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Outfit', sans-serif;
            margin: 0;
            padding: 4mm;
            background: #f1f5f9;
            color: #1e293b;
            line-height: 1.2;
            font-size: 10px;
          }
          .receipt-card {
            background: white;
            width: 74mm;
            height: 105mm;
            margin: 0 auto;
            border-radius: 4mm;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            position: relative;
            border: 0.5mm solid rgba(0,0,0,0.05);
            display: flex;
            flex-direction: column;
          }
          .security-bg {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(${primaryColor}05 1px, transparent 1px);
            background-size: 3mm 3mm;
            pointer-events: none;
            z-index: 0;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 50px;
            font-weight: 800;
            color: rgba(0, 0, 0, 0.03);
            pointer-events: none;
            text-transform: uppercase;
            white-space: nowrap;
            z-index: 0;
            letter-spacing: 2mm;
          }
          .receipt-header {
            background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd);
            padding: 3mm 4mm;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1mm solid rgba(0,0,0,0.1);
            position: relative;
            z-index: 1;
          }
          .school-info h1 {
            margin: 0;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: -0.2mm;
            line-height: 1;
          }
          .school-info p {
            margin: 1mm 0 0;
            opacity: 0.9;
            font-size: 7px;
            font-weight: 600;
          }
          .receipt-badge {
            background: white;
            color: ${primaryColor};
            padding: 1mm 2mm;
            border-radius: 1mm;
            font-size: 8px;
            font-weight: 800;
            text-transform: uppercase;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .receipt-body {
            padding: 3mm 4mm;
            position: relative;
            z-index: 1;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
          }
          .id-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2mm;
            font-size: 8px;
            font-weight: 700;
            color: #64748b;
          }
          .section-title {
            font-size: 8px;
            font-weight: 800;
            color: ${primaryColor};
            text-transform: uppercase;
            letter-spacing: 0.5mm;
            margin-bottom: 2mm;
            display: flex;
            align-items: center;
          }
          .section-title::after {
            content: '';
            flex: 1;
            height: 0.2mm;
            background: ${primaryColor}20;
            margin-left: 2mm;
          }
          .info-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2mm;
            margin-bottom: 2mm;
          }
          .info-group {
            margin-bottom: 1.5mm;
          }
          .info-label {
            font-size: 7px;
            color: #94a3b8;
            text-transform: uppercase;
            font-weight: 800;
            margin-bottom: 0.2mm;
          }
          .info-value {
            font-size: 9px;
            font-weight: 700;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .amount-section {
            background: #f8fafc;
            border-radius: 2mm;
            padding: 3mm;
            text-align: center;
            border: 0.5mm dashed #e2e8f0;
            margin: 2mm 0;
            position: relative;
          }
          .amount-label {
            font-size: 8px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 1mm;
          }
          .amount-value {
            font-size: 18px;
            font-weight: 800;
            color: ${primaryColor};
            font-family: 'JetBrains Mono', monospace;
          }
          .security-footer {
            margin-top: auto;
            padding-top: 2mm;
            border-top: 0.2mm solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .security-hash-box {
            font-family: 'JetBrains Mono', monospace;
            font-size: 7px;
            color: #64748b;
            background: #f1f5f9;
            padding: 0.5mm 1.5mm;
            border-radius: 0.5mm;
          }
          .signatures {
            margin-top: 2mm;
            display: flex;
            justify-content: center;
          }
          .sig-box {
            width: 30mm;
            text-align: center;
          }
          .sig-line {
            border-top: 0.3mm solid #cbd5e1;
            margin-bottom: 1mm;
          }
          .sig-label {
            font-size: 7px;
            color: #94a3b8;
            font-weight: 700;
            text-transform: uppercase;
          }
          .digital-seal {
            position: absolute;
            bottom: 15mm;
            right: 2mm;
            width: 20mm;
            height: 20mm;
            opacity: 0.6;
            pointer-events: none;
            z-index: 5;
            transform: rotate(-10deg);
          }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="security-bg"></div>
          <div class="watermark">PAID</div>
          
          <div class="receipt-header">
            <div class="school-info">
              <h1>${schoolSettings.schoolName || 'SMS'}</h1>
              <p>${schoolSettings.schoolAddress?.substring(0, 30) || 'Official Receipt'}</p>
            </div>
            <div class="receipt-badge">MISC</div>
          </div>

          <div class="receipt-body">
            <div class="id-line">
              <span>NO: ${payment.receiptNumber || payment.id}</span>
              <span>${new Date(payment.paymentDate).toLocaleDateString()}</span>
            </div>

            <div class="section-title">Student Details</div>
            <div class="info-group">
              <div class="info-label">Student Name</div>
              <div class="info-value">${payment.student.user.firstName} ${payment.student.user.lastName}</div>
            </div>
            <div class="info-row">
              <div class="info-group">
                <div class="info-label">Student ID</div>
                <div class="info-value">${payment.student.admissionNumber}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Class</div>
                <div class="info-value">${payment.student.classModel?.name || ''} ${payment.student.classModel?.arm || ''}</div>
              </div>
            </div>

            <div class="section-title" style="margin-top: 1mm;">Payment Info</div>
            <div class="info-group" style="margin-bottom: 1mm;">
              <div class="info-label">Fee Title</div>
              <div class="info-value">${payment.fee.title}</div>
            </div>
            <div class="info-row">
              <div class="info-group">
                <div class="info-label">Method</div>
                <div class="info-value" style="text-transform: uppercase;">${payment.paymentMethod}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Recorded By</div>
                <div class="info-value">STAFF</div>
              </div>
            </div>

            <div class="amount-section">
              <div class="amount-label">Verified Payment</div>
              <div class="amount-value">₦${payment.amount.toLocaleString()}</div>
            </div>

            <div style="text-align: center; margin-top: 1mm;">
              <img src="${barcodeUrl}" alt="Barcode" style="max-width: 40mm; height: auto;" />
            </div>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Authorized Signature</div>
              </div>
            </div>

            <div class="security-footer">
              <div class="security-hash-box">${securityHash}</div>
              <div style="font-size: 6px; color: #94a3b8; font-weight: 700;">
                SECURE PRINT • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div class="digital-seal">
              <svg width="100%" height="100%" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="55" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="3,2" />
                <path id="sealPath" d="M 60,60 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none"/>
                <text font-size="8" font-weight="800" fill="${primaryColor}">
                  <textPath href="#sealPath">AUTHENTIC RECEIPT • ${schoolSettings.schoolName?.split(' ')[0] || 'SMS'} • </textPath>
                </text>
                <text x="60" y="65" text-anchor="middle" font-size="14" font-weight="900" fill="${primaryColor}">VALID</text>
              </svg>
            </div>
          </div>
        </div>

        <div class="no-print" style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
          <button onclick="window.print()" style="padding: 6px 12px; background: ${primaryColor}; color: white; border: none; border-radius: 4px; font-weight: 800; font-size: 10px; cursor: pointer; text-transform: uppercase;">Print</button>
          <button onclick="window.close()" style="padding: 6px 12px; background: white; color: #475569; border: 1px solid #e2e8f0; border-radius: 4px; font-weight: 800; font-size: 10px; cursor: pointer; text-transform: uppercase;">Close</button>
        </div>
      </body>
      </html>
    `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (error) {
      toast.error('Error generating receipt: ' + error.message);
    }
  };

  const fetchData = async () => {
    try {
      // Get current term, session, and classes
      const [termsRes, sessionsRes, classesRes] = await Promise.all([
        api.get('/api/terms'),
        api.get('/api/academic-sessions'),
        api.get('/api/classes')
      ]);

      const termsData = await termsRes.json();
      const sessionsData = await sessionsRes.json();
      const classesData = await classesRes.json();

      const terms = Array.isArray(termsData) ? termsData : [];
      const sessions = Array.isArray(sessionsData) ? sessionsData : [];
      const classesArr = Array.isArray(classesData) ? classesData : [];

      const activeTerm = terms.find(t => t.isCurrent) || terms[0] || null;
      const activeSession = sessions.find(s => s.isCurrent) || sessions[0] || null;

      setCurrentTerm(activeTerm);
      setCurrentSession(activeSession);
      setAllTerms(terms);
      setAllSessions(sessions);
      setClasses(classesArr);

      // Initialize misc filters
      if (activeTerm) setSelectedMiscTerm(activeTerm.id);
      if (activeSession) setSelectedMiscSession(activeSession.id);

      setAllTerms(terms);
      setAllSessions(sessions);

      // Set default payment term/session to current
      setSelectedPaymentTerm(activeTerm);
      setSelectedPaymentSession(activeSession);

      // Set default VIEW term/session to current
      setSelectedViewTerm(activeTerm);
      setSelectedViewSession(activeSession);

      if (activeTerm && activeSession) {
        await loadStudents(activeTerm.id, activeSession.id);
        await loadSummary(activeTerm.id, activeSession.id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewFilterChange = async (termId, sessionId, viewAllTerms = false, viewAllSessions = false) => {
    setViewAllTerms(viewAllTerms);
    setViewAllSessions(viewAllSessions);

    if (viewAllSessions) {
      setSelectedViewSession(null);
      setSelectedViewTerm(null);
      await loadStudentsAllSessions();
    } else if (viewAllTerms) {
      const session = allSessions.find(s => s.id === sessionId);
      setSelectedViewSession(session);
      setSelectedViewTerm(null);
      await loadStudentsAllTerms(sessionId);
    } else {
      const term = allTerms.find(t => t.id === termId);
      const session = allSessions.find(s => s.id === sessionId);
      setSelectedViewTerm(term);
      setSelectedViewSession(session);
      await loadStudents(termId, sessionId);
      await loadSummary(termId, sessionId);
    }
  };

  const loadStudentsAllSessions = async () => {
    try {
      setLoading(true);
      let allStudentsData = [];

      for (const session of allSessions) {
        const sessionTerms = allTerms.filter(t => t.academicSessionId === session.id);
        for (const term of sessionTerms) {
          const response = await api.get(
            `/api/fees/students?termId=${term.id}&academicSessionId=${session.id}`
          );

          if (!response.ok) continue;

          const data = await response.json();
          if (Array.isArray(data)) {
            data.forEach(student => {
              if (student.feeRecords && student.feeRecords.length > 0) {
                student.feeRecords.forEach(record => {
                  record.termName = term.name;
                  record.sessionName = session.name;
                });
              }
            });
            allStudentsData = [...allStudentsData, ...data];
          }
        }
      }

      const studentMap = new Map();
      allStudentsData.forEach(student => {
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            ...student,
            feeRecords: []
          });
        }
        const existingStudent = studentMap.get(student.id);
        if (student.feeRecords && student.feeRecords.length > 0) {
          existingStudent.feeRecords.push(...student.feeRecords);
        }
      });

      const studentsArray = Array.from(studentMap.values()).map(student => {
        const aggregatedRecord = student.feeRecords.reduce((acc, curr) => ({
          expectedAmount: acc.expectedAmount + curr.expectedAmount,
          paidAmount: acc.paidAmount + curr.paidAmount,
          balance: acc.balance + curr.balance,
          isClearedForExam: curr.isClearedForExam // Use most recent
        }), { expectedAmount: 0, paidAmount: 0, balance: 0, isClearedForExam: true });

        return {
          ...student,
          feeRecords: [aggregatedRecord, ...student.feeRecords]
        };
      });

      setStudents(studentsArray);
      calculateClassSummaries(studentsArray);

      const totalExpected = studentsArray.reduce((sum, s) => sum + (s.feeRecords[0]?.expectedAmount || 0), 0);
      const totalPaid = studentsArray.reduce((sum, s) => sum + (s.feeRecords[0]?.paidAmount || 0), 0);
      const totalBalance = studentsArray.reduce((sum, s) => sum + (s.feeRecords[0]?.balance || 0), 0);
      const clearedStudents = studentsArray.filter(s => s.feeRecords[0]?.isClearedForExam).length;

      setSummary({
        totalStudents: studentsArray.length,
        totalExpected,
        totalPaid,
        totalBalance,
        clearedStudents,
        restrictedStudents: studentsArray.length - clearedStudents
      });

    } catch (error) {
      console.error('Error loading all sessions data:', error);
      alert('Failed to load cumulative session data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsAllTerms = async (sessionId) => {
    try {
      setLoading(true);
      const termsInSession = allTerms.filter(t => t.academicSessionId === sessionId);
      let allStudentsData = [];

      for (const term of termsInSession) {
        const response = await api.get(
          `/api/fees/students?termId=${term.id}&academicSessionId=${sessionId}`
        );

        if (!response.ok) {
          console.error(`Failed to load students for term ${term.name}`);
          continue;
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          data.forEach(student => {
            if (student.feeRecords && student.feeRecords.length > 0) {
              student.feeRecords.forEach(record => {
                record.termName = term.name;
              });
            }
          });
          allStudentsData = [...allStudentsData, ...data];
        }
      }

      const studentMap = new Map();
      allStudentsData.forEach(student => {
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            ...student,
            feeRecords: []
          });
        }
        const existingStudent = studentMap.get(student.id);
        if (student.feeRecords && student.feeRecords.length > 0) {
          existingStudent.feeRecords.push(...student.feeRecords);
        }
      });

      const studentsArray = Array.from(studentMap.values()).map(student => {
        // Aggregate fee records for the student
        const aggregatedRecord = student.feeRecords.reduce((acc, curr) => ({
          expectedAmount: acc.expectedAmount + curr.expectedAmount,
          paidAmount: acc.paidAmount + curr.paidAmount,
          balance: acc.balance + curr.balance,
          // A student is cleared cumulatively only if cleared in the most recent term record
          isClearedForExam: curr.isClearedForExam // Last record in the array should be the most recent term fetched
        }), { expectedAmount: 0, paidAmount: 0, balance: 0, isClearedForExam: true });

        return {
          ...student,
          // We'll keep the actual records but put an aggregated summary at index 0 for UI components
          feeRecords: [aggregatedRecord, ...student.feeRecords]
        };
      });

      setStudents(studentsArray);
      calculateClassSummaries(studentsArray);

      // Calculate overall session summary for Cumulative View
      const totalExpected = studentsArray.reduce((sum, s) => sum + (s.feeRecords[0]?.expectedAmount || 0), 0);
      const totalPaid = studentsArray.reduce((sum, s) => sum + (s.feeRecords[0]?.paidAmount || 0), 0);
      const totalBalance = studentsArray.reduce((sum, s) => sum + (s.feeRecords[0]?.balance || 0), 0);
      const clearedStudents = studentsArray.filter(s => s.feeRecords[0]?.isClearedForExam).length;

      setSummary({
        totalStudents: studentsArray.length,
        totalExpected,
        totalPaid,
        totalBalance,
        clearedStudents,
        restrictedStudents: studentsArray.length - clearedStudents
      });

    } catch (error) {
      console.error('Error loading all terms data:', error);
      alert('Failed to load cumulative data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (termId, sessionId) => {
    try {
      const response = await api.get(
        `/api/fees/students?termId=${termId}&academicSessionId=${sessionId}`
      );

      if (!response.ok) {
        // API returned an error
        const errorData = await response.json();
        console.error('Error loading students:', errorData);
        setStudents([]);
        return;
      }

      const data = await response.json();

      // Ensure data is an array
      if (Array.isArray(data)) {
        setStudents(data);
        calculateClassSummaries(data);
      } else {
        console.error('Expected array but got:', typeof data);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
    }
  };

  const calculateClassSummaries = (studentsData) => {
    const summaries = {};

    studentsData.forEach(student => {
      if (!student.classId) return;

      if (!summaries[student.classId]) {
        summaries[student.classId] = {
          classId: student.classId,
          className: student.classModel ? `${student.classModel.name}${student.classModel.arm || ''}` : 'Unknown',
          totalStudents: 0,
          totalExpected: 0,
          totalPaid: 0,
          totalBalance: 0,
          clearedStudents: 0,
          unclearedStudents: 0
        };
      }

      const feeRecord = student.feeRecords[0];
      summaries[student.classId].totalStudents++;
      summaries[student.classId].totalExpected += feeRecord?.expectedAmount || 0;
      summaries[student.classId].totalPaid += feeRecord?.paidAmount || 0;
      summaries[student.classId].totalBalance += feeRecord?.balance || 0;

      if (feeRecord?.isClearedForExam) {
        summaries[student.classId].clearedStudents++;
      } else {
        summaries[student.classId].unclearedStudents++;
      }
    });

    setClassSummaries(summaries);
  };

  const loadSummary = async (termId, sessionId) => {
    try {
      const response = await api.get(
        `/api/fees/summary?termId=${termId}&academicSessionId=${sessionId}`
      );

      if (!response.ok) {
        console.error('Error loading summary: API returned error');
        setSummary(null);
        return;
      }

      const data = await response.json();

      // Ensure data has the expected properties
      if (data && typeof data === 'object' && 'totalStudents' in data) {
        setSummary(data);
      } else {
        console.error('Invalid summary data received');
        setSummary(null);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
      setSummary(null);
    }
  };

  const recordPayment = async (studentId) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    const currentBalance = selectedStudent.feeRecords[0]?.balance || 0;
    if (currentBalance <= 0) {
      alert(`This student has no outstanding balance for this term. No further payments can be recorded.`);
      return;
    }
    if (parseFloat(paymentAmount) > currentBalance) {
      alert(`Payment amount cannot exceed the outstanding balance (₦${formatNumber(currentBalance)})`);
      return;
    }

    try {
      const response = await api.post('/api/fees/payment', {
        studentId,
        termId: selectedPaymentTerm?.id || currentTerm.id,
        academicSessionId: selectedPaymentSession?.id || currentSession.id,
        amount: parseFloat(paymentAmount),
        paymentMethod,
        reference: paymentReference,
        notes: paymentNotes
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record payment');
      }

      alert('Payment recorded successfully');

      // Generate receipt
      if (confirm('Would you like to print a receipt?')) {
        setReceiptPayment(data.payment);
        setReceiptStudent(selectedStudent);
        setReceiptModalOpen(true);
      }

      // Reset form
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentReference('');
      setPaymentNotes('');
      setSelectedStudent(null);

      // Refresh data
      if (viewAllTerms) {
        await loadStudentsAllTerms(selectedViewSession.id);
      } else {
        await loadStudents(currentTerm.id, currentSession.id);
        await loadSummary(currentTerm.id, currentSession.id);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert(error.message || 'Failed to record payment');
    }
  };

  const updatePayment = async () => {
    if (!editingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      const response = await api.put(`/api/fees/payment/${editingPayment.id}`, {
        amount: parseFloat(paymentAmount),
        paymentMethod,
        reference: paymentReference,
        notes: paymentNotes
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payment');
      }

      alert('Payment updated successfully');

      // Refresh history
      await viewPaymentHistory(historyStudent);

      // Refresh main data
      if (viewAllTerms) {
        await loadStudentsAllTerms(selectedViewSession.id);
      } else {
        await loadStudents(currentTerm.id, currentSession.id);
        await loadSummary(currentTerm.id, currentSession.id);
      }

      // Close modal
      setEditingPayment(null);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentReference('');
      setPaymentNotes('');
    } catch (error) {
      console.error('Error updating payment:', error);
      alert(error.message || 'Failed to update payment');
    }
  };

  const toggleClearance = async (studentId, isRestricted) => {
    const actionText = isRestricted ? 'Allow' : 'Restrict';
    const confirmMsg = isRestricted
      ? 'Allow student to print examination card?'
      : 'Restrict student from printing examination card? Use this if they haven\'t met minimum deposit or provided valid excuse.';

    if (!confirm(confirmMsg)) return;

    try {
      await api.post(`/api/fees/toggle-clearance/${studentId}`, {
        termId: currentTerm.id,
        academicSessionId: currentSession.id
      });

      alert(`Student ${actionText.toLowerCase()}ed successfully`);
      await loadStudents(currentTerm.id, currentSession.id);
      await loadSummary(currentTerm.id, currentSession.id);
    } catch (error) {
      console.error('Error toggling clearance:', error);
      alert(error.message || 'Failed to update clearance status');
    }
  };

  const bulkToggleClearance = async (action) => {
    const isAllowing = action === 'allow';
    const actionText = isAllowing ? 'Allow' : 'Restrict';

    if (!confirm(`${actionText} ${selectedStudents.length} selected student(s) for examination?`)) return;

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const studentId of selectedStudents) {
        try {
          // We use the appropriate endpoint based on action
          const endpoint = isAllowing ? '/api/fees/clear/' : '/api/fees/revoke-clearance/';
          await api.post(`${endpoint}${studentId}`, {
            termId: currentTerm.id,
            academicSessionId: currentSession.id
          });
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      alert(`${actionText}ed ${successCount} student(s). Failed: ${failCount}`);
      setSelectedStudents([]);
      await loadStudents(currentTerm.id, currentSession.id);
      await loadSummary(currentTerm.id, currentSession.id);
    } catch (error) {
      console.error('Error in bulk clearance:', error);
      alert('Failed to process bulk action');
    } finally {
      setLoading(false);
    }
  };

  const viewPaymentHistory = async (student) => {
    try {
      const response = await api.get(
        `/api/fees/payments/${student.id}?termId=${currentTerm.id}&academicSessionId=${currentSession.id}`
      );

      const data = await response.json();
      if (data) {
        setPaymentHistory(data);
        setHistoryStudent(student);
        setShowPaymentHistory(true);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      alert('Failed to load payment history');
    }
  };

  const startEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentAmount(payment.amount.toString());
    setPaymentMethod(payment.paymentMethod || 'cash');
    setPaymentReference(payment.reference || '');
    setPaymentNotes(payment.notes || '');
  };

  const sendBulkReminders = async () => {
    if (!confirm(`Are you sure you want to send fee payment reminders to all students with outstanding balances for ${currentTerm?.name}?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/fees/bulk-reminder', {
        termId: currentTerm?.id,
        academicSessionId: currentSession?.id,
        classId: selectedClassView || undefined
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'Reminders are being sent!');
      } else {
        alert(data.error || 'Failed to send reminders');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('Failed to send reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRecords = async () => {
    if (!selectedViewTerm || !selectedViewSession) {
      alert('Please select a specific term and session to sync');
      return;
    }

    if (!confirm(`This will automatically generate missing fee records for all active students for ${selectedViewTerm.name}. Standard fees will be applied to non-scholarship students. Proceed?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/fees/sync-records', {
        termId: selectedViewTerm.id,
        academicSessionId: selectedViewSession.id
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        await loadStudents(selectedViewTerm.id, selectedViewSession.id);
        await loadSummary(selectedViewTerm.id, selectedViewSession.id);
      } else {
        alert(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync records');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (mode = 'cumulative') => {
    const allStudents = Array.isArray(filteredStudents) ? filteredStudents : [];
    if (allStudents.length === 0) {
      toast.error('No students to export');
      return;
    }

    const schoolName = schoolSettings?.schoolName || 'School';
    const schoolAddr = schoolSettings?.schoolAddress || '';
    const termName = selectedViewTerm?.name || currentTerm?.name || '';
    const sessionName = selectedViewSession?.name || currentSession?.name || '';

    // School header rows
    const headerRows = [
      [schoolName],
      [schoolAddr],
      [`Term: ${termName}`, `Session: ${sessionName}`],
      [`Downloaded: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`],
      [] // blank row
    ];

    const colHeaders = ['S/N', 'Admission Number', 'Student Name', 'Class', 'Previous Balance', 'Current Expected', 'Paid', 'Total Balance'];

    if (mode === 'class') {
      // Group students by class
      const classGroups = {};
      allStudents.forEach(student => {
        const className = student.classModel ? `${student.classModel.name}${student.classModel.arm || ''}` : 'Unassigned';
        if (!classGroups[className]) classGroups[className] = [];
        classGroups[className].push(student);
      });

      const dataRows = [];
      let grandPrev = 0, grandExpected = 0, grandPaid = 0, grandBalance = 0;

      Object.keys(classGroups).sort().forEach(className => {
        const classStudents = classGroups[className];
        dataRows.push([]); // blank row before class
        dataRows.push([`CLASS: ${className}`, '', '', '', '', '', '', '']);
        dataRows.push(colHeaders);

        let classPrev = 0, classExpected = 0, classPaid = 0, classBalance = 0;

        classStudents.forEach((student, idx) => {
          const fr = student.feeRecords?.[0];
          const prev = fr?.openingBalance || 0;
          const expected = fr?.expectedAmount || 0;
          const paid = fr?.paidAmount || 0;
          const balance = fr?.balance || 0;
          classPrev += prev; classExpected += expected; classPaid += paid; classBalance += balance;

          dataRows.push([
            idx + 1,
            student.admissionNumber || 'N/A',
            `${student.user?.firstName || ''} ${student.user?.lastName || ''}`,
            className,
            student.isScholarship ? 'scholarship' : prev,
            student.isScholarship ? 'scholarship' : expected,
            student.isScholarship ? 'scholarship' : paid,
            student.isScholarship ? 'scholarship' : balance
          ]);
        });

        dataRows.push(['', '', '', `${className} SUBTOTAL:`, classPrev, classExpected, classPaid, classBalance]);
        grandPrev += classPrev; grandExpected += classExpected; grandPaid += classPaid; grandBalance += classBalance;
      });

      dataRows.push([]);
      dataRows.push(['', '', '', 'GRAND TOTAL:', grandPrev, grandExpected, grandPaid, grandBalance]);

      const csvContent = [
        ...headerRows.map(r => r.join(',')),
        ...dataRows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `fee-records-by-class-${termName}-${sessionName}.csv`);
    } else {
      // Cumulative - all students in one table
      const dataRows = [colHeaders];
      let totalPrev = 0, totalExpected = 0, totalPaid = 0, totalBalance = 0;

      allStudents.forEach((student, idx) => {
        const fr = student.feeRecords?.[0];
        const prev = fr?.openingBalance || 0;
        const expected = fr?.expectedAmount || 0;
        const paid = fr?.paidAmount || 0;
        const balance = fr?.balance || 0;
        totalPrev += prev; totalExpected += expected; totalPaid += paid; totalBalance += balance;

        dataRows.push([
          idx + 1,
          student.admissionNumber || 'N/A',
          `${student.user?.firstName || ''} ${student.user?.lastName || ''}`,
          student.classModel ? `${student.classModel.name}${student.classModel.arm || ''}` : 'N/A',
          student.isScholarship ? 'scholarship' : prev,
          student.isScholarship ? 'scholarship' : expected,
          student.isScholarship ? 'scholarship' : paid,
          student.isScholarship ? 'scholarship' : balance
        ]);
      });

      dataRows.push([]);
      dataRows.push(['', '', '', 'TOTAL:', totalPrev, totalExpected, totalPaid, totalBalance]);

      const csvContent = [
        ...headerRows.map(r => r.join(',')),
        ...dataRows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `fee-records-cumulative-${termName}-${sessionName}.csv`);
    }
  };

  const printReceipt = (payment, student) => {
    setReceiptPayment(payment);
    setReceiptStudent(student);
    setReceiptModalOpen(true);
  };

  // Filter students
  const filteredStudents = (Array.isArray(students) ? students : []).filter(student => {
    const feeRecord = student.feeRecords?.[0];
    const fullName = `${student.user?.firstName || ''} ${student.user?.lastName || ''} `.toLowerCase();
    const admissionNumber = (student.admissionNumber || '').toLowerCase();
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch = fullName.includes(searchLower) || admissionNumber.includes(searchLower);
    const matchesClass = filterClass === 'all' || student.classId === parseInt(filterClass);
    const matchesClassView = selectedClassView === null || student.classId === selectedClassView;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'cleared' && feeRecord?.isClearedForExam) ||
      (filterStatus === 'not-cleared' && !feeRecord?.isClearedForExam) ||
      (filterStatus === 'owing' && feeRecord?.balance > 0) ||
      (filterStatus === 'paid' && feeRecord?.balance === 0);

    return matchesSearch && matchesClass && matchesClassView && matchesStatus;
  });

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fee records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Fee Management</h1>
        <p className="text-gray-600 mt-1">
          {currentTerm?.name} - {currentSession?.name}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('standard')}
          className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'standard'
            ? 'border-b-4 border-primary text-primary'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          Standard Fees
        </button>
        <button
          onClick={() => setActiveTab('misc')}
          className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'misc'
            ? 'border-b-4 border-primary text-primary'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          Miscellaneous Fees
        </button>
      </div>

      {activeTab === 'standard' ? (
        <>

          {/* Term/Session Selector */}
          {!loading && allSessions.length > 0 && (
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }} className="text-primary">
                📅 View Fee Records
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>
                    Academic Session
                  </label>
                  <select
                    value={viewAllSessions ? 'all' : (selectedViewSession?.id || '')}
                    onChange={(e) => {
                      if (e.target.value === 'all') {
                        handleViewFilterChange(null, null, true, true);
                      } else {
                        const sessionId = parseInt(e.target.value);
                        const session = allSessions.find(s => s.id === sessionId);
                        setSelectedViewSession(session);

                        if (viewAllTerms) {
                          handleViewFilterChange(null, sessionId, true, false);
                        } else {
                          const firstTerm = allTerms.find(t => t.academicSessionId === sessionId);
                          if (firstTerm) {
                            handleViewFilterChange(firstTerm.id, sessionId, false, false);
                          }
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">📊 All Sessions (Cumulative)</option>
                    {(Array.isArray(allSessions) ? allSessions : []).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>
                    Term
                  </label>
                  <select
                    value={viewAllTerms ? 'all' : (selectedViewTerm?.id || '')}
                    onChange={(e) => {
                      if (e.target.value === 'all') {
                        handleViewFilterChange(null, selectedViewSession.id, true, false);
                      } else {
                        const termId = parseInt(e.target.value);
                        handleViewFilterChange(termId, selectedViewSession.id, false, false);
                      }
                    }}
                    disabled={viewAllSessions}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">📊 All Terms (Cumulative)</option>
                    {(Array.isArray(allTerms) ? allTerms : [])
                      .filter(t => t.academicSessionId === selectedViewSession?.id)
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.isCurrent ? '(Current)' : ''}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                  padding: '10px 15px',
                  borderRadius: '6px',
                  border: '2px solid var(--color-primary)'
                }}>
                  <div style={{ fontSize: '11px', color: '#059669', marginBottom: '3px', fontWeight: '600', textTransform: 'uppercase' }}>
                    Currently Viewing
                  </div>
                  <div className="text-primary font-bold">
                    {viewAllTerms
                      ? `${selectedViewSession?.name} - All Terms`
                      : `${selectedViewSession?.name} - ${selectedViewTerm?.name} `
                    }
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => {
                      if (viewAllTerms) {
                        handleViewFilterChange(null, selectedViewSession.id, true);
                      } else {
                        handleViewFilterChange(selectedViewTerm.id, selectedViewSession.id, false);
                      }
                    }}
                    className="bg-primary hover:brightness-90 text-white flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm transition-all"
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseOver={(e) => e.target.style.filter = 'brightness(0.9)'}
                    onMouseOut={(e) => e.target.style.filter = 'brightness(1)'}
                  >
                    <span>🔄</span>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {viewAllTerms && (
                <div style={{
                  marginTop: '15px',
                  padding: '12px',
                  background: '#fffbeb',
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#92400e'
                }}>
                  ℹ️ <strong>Cumulative View:</strong> Showing combined fee records from all terms in {selectedViewSession?.name}.
                  Each student shows total expected, paid, and balance across all terms.
                </div>
              )}
            </div>
          )}

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-primary to-primary/90 text-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4">Quick Info</h3>
                <div className="space-y-3 text-sm">
                  <p className="text-white/90">📊 Total Students: <span className="font-bold text-white">{summary.totalStudents}</span></p>
                  <p className="text-white/90">💰 Avg. Payment: <span className="font-bold text-white">₦{summary.totalStudents > 0 ? formatNumber(summary.totalPaid / summary.totalStudents, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 0}</span></p>
                  <p className="text-white/90">✅ Allowance Rate: <span className="font-bold text-white">{summary.totalStudents > 0 ? ((summary.clearedStudents / summary.totalStudents) * 100).toFixed(1) : 0}%</span></p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                <p className="text-sm opacity-90 mb-1">Total Collected</p>
                <p className="text-3xl font-bold">₦{formatNumber(summary.totalPaid)}</p>
                <p className="text-xs opacity-75 mt-2">
                  {summary.totalExpected > 0 ? ((summary.totalPaid / summary.totalExpected) * 100).toFixed(1) : 0}% collected
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
                <p className="text-sm opacity-90 mb-1">Outstanding</p>
                <p className="text-3xl font-bold">₦{formatNumber(summary.totalBalance)}</p>
                <p className="text-xs opacity-75 mt-2">
                  {summary.totalExpected > 0 ? ((summary.totalBalance / summary.totalExpected) * 100).toFixed(1) : 0}% pending
                </p>
              </div>
            </div>
          )}

          {/* Class Navigation */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">📚 Navigate by Class</h2>
              {selectedClassView !== null && (
                <button
                  onClick={() => setSelectedClassView(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  View All Classes
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* All Classes Card */}
              <button
                onClick={() => setSelectedClassView(null)}
                className={`p-5 rounded-xl border-2 transition-all transform hover:scale-105 hover:shadow-lg text-left ${selectedClassView === null
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-primary/50'
                  }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">All Classes</h3>
                  {selectedClassView === null && (
                    <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Students:</span>
                    <span className="font-semibold text-gray-900">{students.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Expected:</span>
                    <span className="font-semibold text-blue-600">₦{formatNumber(summary?.totalExpected || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Collected:</span>
                    <span className="font-semibold text-green-600">₦{formatNumber(summary?.totalPaid || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Balance:</span>
                    <span className="font-semibold text-red-600">₦{formatNumber(summary?.totalBalance || 0)}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-green-500 to-primary h-1.5 rounded-full transition-all"
                        style={{
                          width: `${summary?.totalExpected > 0 ? (summary.totalPaid / summary.totalExpected) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5 text-center font-medium">
                      {summary?.totalExpected > 0 ? ((summary.totalPaid / summary.totalExpected) * 100).toFixed(1) : 0}% overall collection
                    </p>
                  </div>
                </div>
              </button>

              {/* Individual Class Cards */}
              {Object.values(classSummaries || {}).map((classSummary) => (
                <button
                  key={classSummary.classId}
                  onClick={() => setSelectedClassView(classSummary.classId)}
                  className={`p-5 rounded-xl border-2 transition-all transform hover:scale-105 hover:shadow-lg text-left ${selectedClassView === classSummary.classId
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-gray-200 bg-white hover:border-primary/50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900">{classSummary.className}</h3>
                    {selectedClassView === classSummary.classId && (
                      <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Students:</span>
                      <span className="font-semibold text-gray-900">{classSummary.totalStudents}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Expected:</span>
                      <span className="font-semibold text-blue-600">₦{formatNumber(classSummary.totalExpected)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Collected:</span>
                      <span className="font-semibold text-green-600">₦{formatNumber(classSummary.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Balance:</span>
                      <span className="font-semibold text-red-600">₦{formatNumber(classSummary.totalBalance)}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between text-[10px] font-medium">
                        <span className="text-gray-400 uppercase tracking-tighter">Allowed:</span>
                        <span className="text-indigo-600">{classSummary.clearedStudents}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-medium mt-1">
                        <span className="text-gray-400 uppercase tracking-tighter">Restricted:</span>
                        <span className="text-amber-600">{classSummary.unclearedStudents}</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-green-500 to-primary h-1.5 rounded-full transition-all"
                          style={{
                            width: `${classSummary.totalExpected > 0 ? (classSummary.totalPaid / classSummary.totalExpected) * 100 : 0}%`
                          }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1.5 text-center font-medium">
                        {classSummary.totalExpected > 0 ? ((classSummary.totalPaid / classSummary.totalExpected) * 100).toFixed(1) : 0}% collected
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedClassView !== null && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary">
                  <strong>📌 Viewing:</strong> {Object.values(classSummaries).find(c => c.classId === selectedClassView)?.className || 'Selected Class'} -
                  Showing {filteredStudents.length} student(s)
                </p>
              </div>
            )}
          </div>

          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by name or admission number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Class</label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Classes</option>
                  {classes?.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}{cls.arm || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="cleared">✅ Access Allowed</option>
                  <option value="not-cleared">🚫 Restricted</option>
                  <option value="owing">💸 Owing</option>
                  <option value="paid">💰 Fully Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">View Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex-1 px-3 py-2 rounded-md ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex-1 px-3 py-2 rounded-md ${viewMode === 'cards' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    Cards
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => exportToCSV('class')}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                By Class
              </button>
              <button
                onClick={() => exportToCSV('cumulative')}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Cumulative
              </button>
              <button
                onClick={handleSyncRecords}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync
              </button>

              <div className="flex gap-4 items-center mt-4">
                <div className="flex-1 bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-lg shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-0.5">Currently Viewing</p>
                    <p className="text-sm font-bold text-blue-900">
                      {viewAllSessions ? 'GLOBAL ACADEMIC HISTORY - ALL SESSIONS' : `${selectedViewSession?.name || 'Loading...'} - ${viewAllTerms ? 'All Terms (Cumulative)' : (selectedViewTerm?.name || 'Term')}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => viewAllSessions ? loadStudentsAllSessions() : (viewAllTerms ? loadStudentsAllTerms(selectedViewSession.id) : handleViewFilterChange(selectedViewTerm.id, selectedViewSession.id, false, false))}
                  className="bg-primary text-white p-4 rounded-xl shadow-lg hover:brightness-95 transition-all active:scale-95 flex items-center gap-2 font-black uppercase text-xs tracking-widest"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              {viewAllSessions && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs font-bold text-amber-800">
                    Showing aggregated fee records from every academic session in history. Each student shows their total expected, paid, and balance across all years.
                  </p>
                </div>
              )}

              {viewAllTerms && !viewAllSessions && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs font-bold text-blue-800">
                    Showing cumulative fee records for all terms within the selected academic session. Each student shows their total expected, paid, and balance across all terms.
                  </p>
                </div>
              )}

              <div className="w-full sm:w-auto flex flex-wrap gap-2">
                {selectedStudents.length > 0 && (
                  <>
                    <button
                      onClick={() => bulkToggleClearance('allow')}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2 text-xs font-bold"
                    >
                      ✅ Allow ({selectedStudents.length})
                    </button>
                    <button
                      onClick={() => bulkToggleClearance('restrict')}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center justify-center gap-2 text-xs font-bold"
                    >
                      🚫 Restrict ({selectedStudents.length})
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={sendBulkReminders}
                className="w-full sm:w-auto px-4 py-2.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Fee Reminders
              </button>
            </div>
            <div className="mt-4 text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest text-center sm:text-left">
              Showing {filteredStudents.length} of {students.length} students
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 relative">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                          onChange={selectAll}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Student
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Class
                      </th>
                      <th className="px-3 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Prev. Balance
                      </th>
                      <th className="px-3 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Current Expected
                      </th>
                      <th className="px-3 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Paid
                      </th>
                      <th className="px-3 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Total Balance
                      </th>
                      <th className="px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => {
                      const feeRecord = student.feeRecords[0];
                      const prevBalance = feeRecord?.openingBalance || 0;
                      const currentExpected = feeRecord?.expectedAmount || 0;
                      const paid = feeRecord?.paidAmount || 0;
                      const totalBalance = feeRecord?.balance || 0;
                      return (
                        <tr key={student.id} className={`hover:bg-gray-50 ${student.isScholarship ? 'bg-emerald-50/30' : ''}`}>
                          <td className="px-3 py-4 border-b border-gray-100">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => toggleStudentSelection(student.id)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="px-3 py-4 border-b border-gray-100">
                            <div className="min-w-[140px]">
                              <div className="font-bold text-gray-900 leading-tight">
                                {student.user.firstName} {student.user.lastName}
                              </div>
                              <div className="text-[10px] text-gray-400 font-medium">
                                {student.admissionNumber}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-xs font-semibold text-gray-700 border-b border-gray-100">
                            {student.classModel ?
                              `${student.classModel.name}${student.classModel.arm || ''}` :
                              'N/A'}
                          </td>

                          {student.isScholarship ? (
                            <td colSpan="5" className="p-3 border-b border-gray-100">
                              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-4 text-white shadow-lg border border-emerald-400">
                                {/* Decorative background elements */}
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
                                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white opacity-10 blur-xl"></div>

                                <div className="relative flex items-center justify-between gap-4">
                                  {/* Logo Section */}
                                  <div className="hidden sm:flex shrink-0 w-16 h-16 bg-white/20 rounded-full p-2 backdrop-blur-sm border border-white/30 items-center justify-center">
                                    {schoolSettings?.logoUrl ? (
                                      <img src={schoolSettings.logoUrl} alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
                                    ) : (
                                      <span className="text-2xl">🎓</span>
                                    )}
                                  </div>

                                  {/* Main Content Section */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest rounded-sm shadow-sm">
                                        Scholarship Awardee
                                      </span>
                                      <span className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                                        {viewAllSessions ? 'All Sessions' : (viewAllTerms ? `${selectedViewSession?.name} (All Terms)` : `${selectedViewTerm?.name || currentTerm?.name} - ${selectedViewSession?.name || currentSession?.name}`)}
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm font-medium leading-relaxed max-w-2xl text-white drop-shadow-sm">
                                      This serves as official confirmation that <strong className="text-yellow-300 mx-1">{student.user.firstName} {student.user.lastName}</strong>
                                      of <strong className="text-yellow-300 mx-1">{student.classModel ? `${student.classModel.name}${student.classModel.arm || ''}` : ''}</strong>
                                      is exempted from paying school fees. Kindly take note and grant all necessary clearances.
                                    </p>
                                  </div>

                                  {/* Signature & Actions Section */}
                                  <div className="shrink-0 flex flex-col items-center justify-center gap-2 border-l border-white/20 pl-4 ml-2">
                                    {schoolSettings?.principalSignatureUrl ? (
                                      <div className="h-10 w-24 bg-white/10 rounded backdrop-blur-sm flex items-center justify-center p-1 border border-white/20">
                                        <img src={schoolSettings.principalSignatureUrl} alt="Signature" className="h-full w-full object-contain opacity-90" style={{ filter: 'brightness(0) invert(1)' }} />
                                      </div>
                                    ) : (
                                      <div className="h-10 w-24 bg-white/10 rounded flex items-center justify-center border border-white/10 text-[8px] text-white/50 uppercase tracking-widest text-center leading-tight">
                                        Authorized<br />Signature
                                      </div>
                                    )}
                                    <div className="flex gap-1.5 w-full mt-1">
                                      <button
                                        onClick={() => {
                                          setScholarshipStudent(student);
                                          setScholarshipModalOpen(true);
                                        }}
                                        className="flex-1 bg-yellow-400 text-yellow-900 hover:bg-yellow-500 px-2 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-tighter shadow-sm transition-all shadow-yellow-500/20"
                                      >
                                        🖨️ Print Card
                                      </button>
                                      <button
                                        onClick={() => handleEditFee(student)}
                                        className="bg-emerald-800 text-white hover:bg-emerald-900 border border-emerald-600 px-2 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-tighter shadow-sm transition-all flex-none aspect-square w-8"
                                        title="Adjust settings"
                                      >
                                        ⚙️
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td className="px-3 py-4 text-xs font-bold text-right border-b border-gray-100">
                                <span className={prevBalance > 0 ? 'text-red-500' : 'text-gray-400'}>
                                  ₦{formatNumber(prevBalance)}
                                </span>
                              </td>
                              <td className="px-3 py-4 text-xs font-bold text-gray-900 text-right border-b border-gray-100">
                                ₦{formatNumber(currentExpected)}
                              </td>
                              <td className="px-3 py-4 text-xs font-black text-green-600 text-right border-b border-gray-100">
                                ₦{formatNumber(paid)}
                              </td>
                              <td className="px-3 py-4 text-xs font-black text-right border-b border-gray-100">
                                <span className={totalBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                                  ₦{formatNumber(totalBalance)}
                                </span>
                              </td>
                              <td className="px-3 py-4 border-b border-gray-100">
                                <div className="flex flex-wrap gap-1.5 min-w-[160px]">
                                  <button
                                    onClick={() => setSelectedStudent(student)}
                                    className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all"
                                  >
                                    💰 Pay
                                  </button>
                                  <button
                                    onClick={() => viewPaymentHistory(student)}
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all"
                                  >
                                    🕒 History
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReceiptStudent(student);
                                      setReceiptPayment(null);
                                      setReceiptModalOpen(true);
                                    }}
                                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all"
                                  >
                                    🖨️ Receipt
                                  </button>
                                  <button
                                    onClick={() => handleEditFee(student)}
                                    className="bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all"
                                  >
                                    ⚙️ Adjust
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {/* Period Selectors for Misc Fees */}
          <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Academic Session</label>
              <select
                value={selectedMiscSession || ''}
                onChange={(e) => setSelectedMiscSession(e.target.value || null)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all"
              >
                <option value="">All Sessions</option>
                {allSessions?.map(session => (
                  <option key={session.id} value={session.id}>{session.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Term</label>
              <select
                value={selectedMiscTerm || ''}
                onChange={(e) => setSelectedMiscTerm(e.target.value || null)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all"
              >
                <option value="">All Terms</option>
                {allTerms?.map(term => (
                  <option key={term.id} value={term.id}>{term.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setMiscFeeFormData(prev => ({
                  ...prev,
                  sessionId: selectedMiscSession || '',
                  termId: selectedMiscTerm || ''
                }));
                setShowMiscFeeModal(true);
              }}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-95 active:scale-95 transition-all"
            >
              + Create New Fee
            </button>
          </div>

          {/* Misc Fees Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Expected</p>
              <p className="text-2xl font-black text-gray-900">
                ₦{formatNumber(detailedAnalytics.reduce((sum, f) => sum + (f.totalExpected || 0), 0))}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Received</p>
              <p className="text-2xl font-black text-green-600">
                ₦{formatNumber(detailedAnalytics.reduce((sum, f) => sum + (f.totalReceived || 0), 0))}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Outstanding</p>
              <p className="text-2xl font-black text-red-600">
                ₦{formatNumber(detailedAnalytics.reduce((sum, f) => sum + (f.outstanding || 0), 0))}
              </p>
            </div>
          </div>

          {loadingMisc ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {detailedAnalytics.map(fee => (
                <div key={fee.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                  <div
                    onClick={() => setExpandedFee(expandedFee === fee.id ? null : fee.id)}
                    className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50 bg-gradient-to-r from-gray-50 to-white"
                  >
                    <div>
                      <h3 className="text-xl font-black text-gray-900">{fee.title}</h3>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
                          Amount: ₦{formatNumber(fee.amount)}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${fee.isCompulsory ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {fee.isCompulsory ? 'Compulsory' : 'Optional'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outstanding</p>
                        <p className="text-lg font-black text-red-600">₦{formatNumber(fee.outstanding)}</p>
                      </div>
                      <svg className={`w-6 h-6 transform transition-transform ${expandedFee === fee.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {expandedFee === fee.id && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
                      {fee.classes.map(cls => (
                        <div key={cls.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                          <button
                            onClick={() => setExpandedClass(expandedClass === `${fee.id}-${cls.id}` ? null : `${fee.id}-${cls.id}`)}
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                                {cls.students.length}
                              </span>
                              <span className="font-bold text-gray-800">{cls.name} {cls.arm}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right text-xs">
                                <span className="text-gray-400 font-medium">Collection: </span>
                                <span className="font-bold text-green-600">₦{formatNumber(cls.totalReceived)}</span>
                              </div>
                              <svg className={`w-4 h-4 transform transition-transform ${expandedClass === `${fee.id}-${cls.id}` ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>

                          {expandedClass === `${fee.id}-${cls.id}` && (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {cls.students.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{student.name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium">{student.admissionNumber}</div>
                                      </td>
                                      <td className="px-6 py-4 font-bold text-green-600 text-sm">
                                        ₦{formatNumber(student.totalPaid)}
                                      </td>
                                      <td className="px-6 py-4 font-bold text-red-600 text-sm">
                                        ₦{formatNumber(student.balance)}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={() => {
                                              setSelectedMiscPayment({ student, fee });
                                              setMiscFormData({ ...miscFormData, amount: student.balance });
                                            }}
                                            className="px-3 py-1 bg-primary text-white text-[10px] font-black uppercase rounded-lg hover:brightness-90"
                                          >
                                            Update
                                          </button>
                                          {student.payments.length > 0 && (
                                            <button
                                              onClick={() => {
                                                handlePrintMiscReceipt(student.payments[0].id);
                                              }}
                                              className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-lg hover:bg-gray-200"
                                            >
                                              Receipt
                                            </button>
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
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Render Payment Modal, History Modal etc. */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-end sm:items-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Record Payment</h2>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <div className="mb-4 text-sm text-gray-600">
                Record payment for {selectedStudent.user.firstName} {selectedStudent.user.lastName} ({selectedStudent.admissionNumber})
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={selectedStudent.feeRecords[0]?.balance || 0}
                    className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Outstanding: ₦{formatNumber(selectedStudent.feeRecords[0]?.balance || 0)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="pos">POS</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference No. (Optional)</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                    placeholder="e.g. Teller Number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                    rows="2"
                  ></textarea>
                </div>
              </div>

            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 rounded-b-2xl sm:rounded-b-xl">
              <button
                onClick={() => setSelectedStudent(null)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => recordPayment(selectedStudent.id)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-95 active:scale-95 transition-all"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Misc Payment Modal */}
      {selectedMiscPayment && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 bg-gradient-to-br from-primary to-primary/90 text-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-1">Record Payment</h3>
                  <p className="text-primary-100 text-xs font-bold uppercase tracking-widest">{selectedMiscPayment.fee.title}</p>
                </div>
                <button
                  onClick={() => setSelectedMiscPayment(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-100 mb-1">Student</p>
                <p className="font-bold text-lg">{selectedMiscPayment.student.name}</p>
                <div className="flex justify-between mt-2 pt-2 border-t border-white/10">
                  <div className="text-xs">
                    <span className="text-primary-100">Fee Amount:</span>
                    <span className="font-bold ml-1">₦{formatNumber(selectedMiscPayment.fee.amount || 0)}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-primary-100">Balance:</span>
                    <span className="font-bold ml-1">₦{formatNumber(selectedMiscPayment.student.balance || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleMiscPaymentSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Payment Amount (₦)</label>
                  <input
                    type="number"
                    required
                    value={miscFormData.amount}
                    onChange={(e) => setMiscFormData({ ...miscFormData, amount: e.target.value })}
                    max={selectedMiscPayment.student.balance}
                    placeholder="0.00"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xl font-black focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Method</label>
                    <select
                      value={miscFormData.paymentMethod}
                      onChange={(e) => setMiscFormData({ ...miscFormData, paymentMethod: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Receipt No.</label>
                    <input
                      type="text"
                      value={miscFormData.receiptNumber}
                      onChange={(e) => setMiscFormData({ ...miscFormData, receiptNumber: e.target.value })}
                      placeholder="Optional"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedMiscPayment(null)}
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-gray-500 hover:bg-gray-50 transition-all uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingMisc}
                  className="flex-3 bg-gray-900 text-white py-4 px-8 rounded-2xl font-black text-sm hover:bg-black active:scale-95 transition-all shadow-xl shadow-gray-200 uppercase tracking-widest disabled:opacity-50"
                >
                  {loadingMisc ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && historyStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex justify-center items-end sm:items-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col transform transition-all">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl sm:rounded-t-2xl">
              <h2 className="text-xl font-black text-gray-900 italic tracking-tighter uppercase">Payment History</h2>
              <button
                onClick={() => setShowPaymentHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50 border-b border-gray-100">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="col-span-2 lg:col-span-1">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Student Name</span>
                  <span className="font-bold text-gray-900 truncate block">{historyStudent.user.firstName} {historyStudent.user.lastName}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Admission No</span>
                  <span className="font-bold text-gray-900">{historyStudent.admissionNumber}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Paid</span>
                  <span className="font-black text-green-600">
                    ₦{formatNumber(historyStudent.feeRecords[0]?.paidAmount || 0)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Outstanding</span>
                  <span className="font-black text-red-600">
                    ₦{formatNumber(historyStudent.feeRecords[0]?.balance || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs sm:text-sm text-gray-500 italic">
                  📝 Use <strong>Edit</strong> to update payment records.
                </p>
              </div>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payments found for this term.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorder</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paymentHistory?.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                            ₦{formatNumber(payment.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                            {payment.paymentMethod}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {payment.reference || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.recordedByUser?.firstName} {payment.recordedByUser?.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => printReceipt(payment, historyStudent)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4 font-semibold"
                              title="Regenerate payment receipt"
                            >
                              📄 Regenerate Receipt
                            </button>
                            <button
                              onClick={() => startEditPayment(payment)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowPaymentHistory(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-[60]">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Payment</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="pos">POS</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-primary focus:border-primary"
                  rows="2"
                ></textarea>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingPayment(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={updatePayment}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restriction Modal */}
      {restrictionModalOpen && restrictionStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-[70]">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              🛑 Examination Card Restriction
            </h2>
            <p className="text-gray-600 mb-4">
              Manage restriction for <strong>{restrictionStudent.user.firstName} {restrictionStudent.user.lastName}</strong> ({restrictionStudent.admissionNumber}).
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-md border border-red-100">
                <input
                  type="checkbox"
                  id="isExamRestricted"
                  checked={isRestricted}
                  onChange={(e) => setIsRestricted(e.target.checked)}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <label htmlFor="isExamRestricted" className="font-medium text-red-900 cursor-pointer">
                  Block Examination Card Access
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Restriction
                </label>
                <textarea
                  value={restrictionReason}
                  onChange={(e) => setRestrictionReason(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
                  rows="3"
                  placeholder="e.g. Outstanding Fees, Disciplinary Action, etc."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be visible to the student when they try to print their card.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRestrictionModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveRestriction}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
              >
                Save Restriction
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Fee Adjustment Modal */}
      {editingFeeRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-[80]">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-orange-600">⚙️</span> Fee Adjustment
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Directly adjust the expected and total paid amounts for <strong>{editingFeeRecord.student.user.firstName} {editingFeeRecord.student.user.lastName}</strong>.
              <br /><span className="text-red-500 font-semibold">Note:</span> This updates the summary record directly.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Fee (Charge) ₦</label>
                <input
                  type="number"
                  value={adjustedExpected}
                  onChange={(e) => setAdjustedExpected(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Paid (Override) ₦</label>
                <input
                  type="number"
                  value={adjustedPaid}
                  onChange={(e) => setAdjustedPaid(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="text-[10px] text-gray-400 mt-1 italic">
                  * Changing this may cause discrepancy with individual payment logs.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-xs border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Arrears/Opening:</span>
                  <span className="font-semibold text-gray-700">₦{formatNumber(editingFeeRecord.record?.openingBalance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Expected:</span>
                  <span className="font-semibold text-gray-700">₦{formatNumber(parseFloat(adjustedExpected) || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 border-gray-200">
                  <span className="text-gray-600 font-bold">Total Due:</span>
                  <span className="font-bold text-gray-900 underline">₦{formatNumber((editingFeeRecord.record?.openingBalance || 0) + (parseFloat(adjustedExpected) || 0))}</span>
                </div>
                <div className={`flex justify-between border-t pt-1 mt-1 ${((editingFeeRecord.record?.openingBalance || 0) + (parseFloat(adjustedExpected) || 0) - (parseFloat(adjustedPaid) || 0)) < 0 ? 'text-red-600' : 'text-orange-800'}`}>
                  <span className="font-bold">Remaining Balance:</span>
                  <span className="font-bold">₦{formatNumber((editingFeeRecord.record?.openingBalance || 0) + (parseFloat(adjustedExpected) || 0) - (parseFloat(adjustedPaid) || 0))}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingFeeRecord(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={saveFeeRecord}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 font-medium transition-colors"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Update Record'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Receipt Modal */}
      {receiptModalOpen && receiptStudent && (
        <PrintReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            setReceiptPayment(null);
            setReceiptStudent(null);
          }}
          student={receiptStudent}
          currentPayment={receiptPayment}
          currentTerm={currentTerm}
          currentSession={currentSession}
          allTerms={allTerms}
          allSessions={allSessions}
        />
      )}

      {/* Scholarship Print Modal */}
      {scholarshipModalOpen && scholarshipStudent && (
        <PrintScholarshipModal
          isOpen={scholarshipModalOpen}
          onClose={() => {
            setScholarshipModalOpen(false);
            setScholarshipStudent(null);
          }}
          student={scholarshipStudent}
          currentTerm={currentTerm}
          currentSession={currentSession}
        />
      )}

      {/* Create Misc Fee Modal */}
      {showMiscFeeModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full flex justify-center items-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Create Miscellaneous Fee</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Configure new custom charge</p>
              </div>
              <button
                onClick={() => setShowMiscFeeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateMiscFee} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Fee Title</label>
                  <input
                    type="text"
                    required
                    value={miscFeeFormData.title}
                    onChange={(e) => setMiscFeeFormData({ ...miscFeeFormData, title: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                    placeholder="e.g., Computer Lab Maintenance, Anniversary Cloth"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Amount (₦)</label>
                  <input
                    type="number"
                    required
                    value={miscFeeFormData.amount}
                    onChange={(e) => setMiscFeeFormData({ ...miscFeeFormData, amount: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all font-mono"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Fee Type</label>
                  <div className="flex gap-4 items-center h-[52px]">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={miscFeeFormData.isCompulsory}
                        onChange={(e) => setMiscFeeFormData({ ...miscFeeFormData, isCompulsory: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ms-3 text-xs font-bold text-gray-700 uppercase tracking-tighter">Compulsory Fee</span>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Description (Optional)</label>
                  <textarea
                    value={miscFeeFormData.description}
                    onChange={(e) => setMiscFeeFormData({ ...miscFeeFormData, description: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none"
                    rows="2"
                    placeholder="Briefly describe what this fee covers..."
                  ></textarea>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Applicable Classes</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 max-h-60 overflow-y-auto">
                    {classes.map(cls => (
                      <div
                        key={cls.id}
                        onClick={() => handleMiscClassToggle(cls.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${miscFeeFormData.classIds.includes(cls.id.toString())
                            ? 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                            : 'bg-white border-gray-100 text-gray-600 hover:border-primary/30'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${miscFeeFormData.classIds.includes(cls.id.toString()) ? 'bg-white border-white' : 'border-gray-300'}`}>
                          {miscFeeFormData.classIds.includes(cls.id.toString()) && (
                            <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-tighter">{cls.name} {cls.arm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowMiscFeeModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={miscFeeLoading}
                  className="px-8 py-3 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-95 active:scale-95 transition-all disabled:opacity-50"
                >
                  {miscFeeLoading ? 'Processing...' : 'Create Basic Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
