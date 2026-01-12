import { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function FeeManagement() {
  const { user: authUser } = useAuth();
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

      if (paid > totalDue) {
        alert(`Total Paid (₦${paid.toLocaleString()}) cannot exceed the total amount due (₦${totalDue.toLocaleString()})`);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get current term, session, and classes
      const [termsRes, sessionsRes, classesRes] = await Promise.all([
        api.get('/api/terms'),
        api.get('/api/academic-sessions'),
        api.get('/api/classes')
      ]);

      const terms = await termsRes.json();
      const sessions = await sessionsRes.json();
      const classesData = await classesRes.json();

      const activeTerm = terms.find(t => t.isCurrent);
      const activeSession = sessions.find(s => s.isCurrent);

      setCurrentTerm(activeTerm);
      setCurrentSession(activeSession);
      setClasses(classesData);

      // Store all terms and sessions for payment selection
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

  const handleViewFilterChange = async (termId, sessionId, viewAll = false) => {
    setViewAllTerms(viewAll);

    if (viewAll) {
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

  const loadStudentsAllTerms = async (sessionId) => {
    try {
      setLoading(true);
      const termsInSession = allTerms.filter(t => t.academicSessionId === sessionId);
      let allStudentsData = [];

      for (const term of termsInSession) {
        const response = await api.get(
          `/api/fees/students?termId=${term.id}&academicSessionId=${sessionId}`
        );
        const data = await response.json();

        data.forEach(student => {
          if (student.feeRecords && student.feeRecords.length > 0) {
            student.feeRecords.forEach(record => {
              record.termName = term.name;
            });
          }
        });

        allStudentsData = [...allStudentsData, ...data];
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

      const studentsArray = Array.from(studentMap.values());
      setStudents(studentsArray);
      calculateClassSummaries(studentsArray);
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
      const data = await response.json();
      setStudents(data);
      calculateClassSummaries(data);
    } catch (error) {
      console.error('Error loading students:', error);
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
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
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
      alert(`Payment amount cannot exceed the outstanding balance (₦${currentBalance.toLocaleString()})`);
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
        printReceipt(data.payment, selectedStudent);
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

  const exportToCSV = () => {
    const csvData = filteredStudents.map(student => {
      const feeRecord = student.feeRecords[0];
      return {
        'Admission Number': student.admissionNumber,
        'Student Name': `${student.user.firstName} ${student.user.lastName}`,
        'Class': student.classModel ? `${student.classModel.name}${student.classModel.arm || ''}` : 'N/A',
        'Expected Amount': feeRecord?.expectedAmount || 0,
        'Paid Amount': feeRecord?.paidAmount || 0,
        'Balance': feeRecord?.balance || 0,
        'Exam Access': feeRecord?.isClearedForExam ? 'Allowed' : 'Restricted'
      };
    });

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `fee-records-${currentTerm?.name}-${currentSession?.name}.csv`);
  };

  const printReceipt = (payment, student) => {
    const receiptWindow = window.open('', '_blank', 'width=800,height=600');
    if (!receiptWindow) {
      alert("Pop-up blocked. Please allow pop-ups for this site to print receipts.");
      return;
    }

    const schoolName = authUser?.school?.name || 'AL-BIRR ACADEMY';
    const schoolAddress = authUser?.school?.address || '';
    const schoolPhone = authUser?.school?.phone || '';

    // Improved Receipt HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt #${payment.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; background: #f0f2f5; margin: 0; }
          .receipt { max-width: 600px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-radius: 12px; border: 1px solid #e5e7eb; }
          .header { text-align: center; border-bottom: 2px dashed #e5e7eb; padding-bottom: 24px; margin-bottom: 24px; }
          .school-name { font-size: 24px; font-weight: 800; color: #111827; margin: 0; text-transform: uppercase; letter-spacing: -0.025em; }
          .school-info { font-size: 11px; color: #6b7280; margin-top: 4px; }
          .receipt-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #374151; margin-top: 12px; font-weight: 700; background: #f3f4f6; padding: 4px 12px; display: inline-block; border-radius: 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid #f3f4f6; padding-bottom: 24px; }
          .label { font-size: 10px; color: #9ca3af; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
          .value { font-size: 14px; color: #1f2937; font-weight: 600; margin-top: 2px; }
          .amount-section { background: #f0fdf4; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; border: 1px solid #bbf7d0; }
          .amount-label { font-size: 12px; color: #166534; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
          .amount-value { font-size: 36px; font-weight: 800; color: #15803d; }
          .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px dashed #e5e7eb; padding-top: 20px; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(0,0,0,0.03); font-weight: 900; z-index: 0; pointer-events: none; white-space: nowrap; }
          .print-btn { display: block; margin: 30px auto 0; padding: 12px 24px; background: #111827; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .print-btn:hover { background: #1f2937; transform: translateY(-1px); }
          @media print { 
            body { background: white; padding: 0; }
            .receipt { box-shadow: none; border: none; padding: 20px; }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt" style="position: relative;">
          <div class="watermark">OFFICIAL RECEIPT</div>
          <div class="header">
            <h1 class="school-name">${schoolName}</h1>
            <div class="school-info">${schoolAddress} ${schoolPhone ? '• ' + schoolPhone : ''}</div>
            <div class="receipt-title">Payment Receipt</div>
          </div>
          
          <div class="info-grid">
            <div>
               <div class="label">Payment Date</div>
               <div class="value">${new Date(payment.paymentDate || new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
            <div>
               <div class="label">Receipt Number</div>
               <div class="value" style="font-family: monospace;">#${payment.id.toString().padStart(6, '0')}</div>
            </div>
            <div>
               <div class="label">Student Name</div>
               <div class="value">${student.user.firstName} ${student.user.lastName}</div>
            </div>
            <div>
               <div class="label">Admission No.</div>
               <div class="value">${student.admissionNumber}</div>
            </div>
            <div>
               <div class="label">Class</div>
               <div class="value">${student.classModel ? `${student.classModel.name}${student.classModel.arm || ''}` : 'N/A'}</div>
            </div>
            <div>
               <div class="label">Academic Period</div>
               <div class="value">${currentSession?.name} • ${currentTerm?.name}</div>
            </div>
            <div>
               <div class="label">Payment Method</div>
               <div class="value" style="text-transform: capitalize;">${payment.paymentMethod || 'Cash'}</div>
            </div>
             <div>
               <div class="label">Reference No.</div>
               <div class="value">${payment.reference || 'None'}</div>
            </div>
          </div>

          <div class="amount-section">
            <div class="amount-label">Total Amount Paid</div>
            <div class="amount-value">₦${parseFloat(payment.amount).toLocaleString()}</div>
          </div>

          <div class="footer">
            <p>This is a computer-generated receipt. No signature required.</p>
            <p style="margin-top: 4px; color: #6b7280; font-weight: 600;">Thank you for your prompt payment!</p>
          </div>
          
          <button class="print-btn" onclick="window.print()">Print Official Receipt</button>
        </div>
      </body>
      </html>
    `;

    receiptWindow.document.open();
    receiptWindow.document.write(htmlContent);
    receiptWindow.document.close();
    receiptWindow.focus();
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    const feeRecord = student.feeRecords[0];
    const fullName = `${student.user.firstName} ${student.user.lastName}`.toLowerCase();
    const admissionNumber = student.admissionNumber.toLowerCase();
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

      {/* Term/Session Selector */}
      {!loading && selectedViewSession && (
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
                value={selectedViewSession?.id || ''}
                onChange={(e) => {
                  const sessionId = parseInt(e.target.value);
                  const session = allSessions.find(s => s.id === sessionId);
                  setSelectedViewSession(session);

                  if (viewAllTerms) {
                    handleViewFilterChange(null, sessionId, true);
                  } else {
                    const firstTerm = allTerms.find(t => t.academicSessionId === sessionId);
                    if (firstTerm) {
                      handleViewFilterChange(firstTerm.id, sessionId, false);
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
                {allSessions.map(s => (
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
                    handleViewFilterChange(null, selectedViewSession.id, true);
                  } else {
                    const termId = parseInt(e.target.value);
                    handleViewFilterChange(termId, selectedViewSession.id, false);
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
                <option value="all">📊 All Terms (Cumulative)</option>
                {allTerms
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
                  : `${selectedViewSession?.name} - ${selectedViewTerm?.name}`
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-primary to-primary/90 text-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Quick Info</h3>
            <div className="space-y-3 text-sm">
              <p className="text-white/90">📊 Total Students: <span className="font-bold text-white">{summary.totalStudents}</span></p>
              <p className="text-white/90">💰 Avg. Payment: <span className="font-bold text-white">₦{summary.totalStudents > 0 ? (summary.totalPaid / summary.totalStudents).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 0}</span></p>
              <p className="text-white/90">✅ Allowance Rate: <span className="font-bold text-white">{summary.totalStudents > 0 ? ((summary.clearedStudents / summary.totalStudents) * 100).toFixed(1) : 0}%</span></p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Total Collected</p>
            <p className="text-3xl font-bold">₦{summary.totalPaid.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">
              {summary.totalExpected > 0 ? ((summary.totalPaid / summary.totalExpected) * 100).toFixed(1) : 0}% collected
            </p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Outstanding</p>
            <p className="text-3xl font-bold">₦{summary.totalBalance.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">
              {summary.totalExpected > 0 ? ((summary.totalBalance / summary.totalExpected) * 100).toFixed(1) : 0}% pending
            </p>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Exam Access: Allowed</p>
            <p className="text-3xl font-bold">{summary.clearedStudents}</p>
            <p className="text-xs opacity-75 mt-2">
              {summary.totalStudents > 0 ? ((summary.clearedStudents / summary.totalStudents) * 100).toFixed(1) : 0}% have cards
            </p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Exam Access: Restricted</p>
            <p className="text-3xl font-bold">{summary.totalStudents - summary.clearedStudents}</p>
            <p className="text-xs opacity-75 mt-2">Students blocked</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Students:</span>
                <span className="font-semibold text-gray-900">{students.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Expected:</span>
                <span className="font-semibold text-blue-600">₦{summary?.totalExpected.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Collected:</span>
                <span className="font-semibold text-green-600">₦{summary?.totalPaid.toLocaleString() || 0}</span>
              </div>
            </div>
          </button>

          {/* Individual Class Cards */}
          {Object.values(classSummaries).map((classSummary) => (
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
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Students:</span>
                  <span className="font-semibold text-gray-900">{classSummary.totalStudents}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Expected:</span>
                  <span className="font-semibold text-blue-600">₦{classSummary.totalExpected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Collected:</span>
                  <span className="font-semibold text-green-600">₦{classSummary.totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-semibold text-red-600">₦{classSummary.totalBalance.toLocaleString()}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Allowed:</span>
                    <span className="font-medium text-indigo-600">{classSummary.clearedStudents}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-600">Restricted:</span>
                    <span className="font-medium text-amber-600">{classSummary.unclearedStudents}</span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${classSummary.totalExpected > 0 ? (classSummary.totalPaid / classSummary.totalExpected) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
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
              {classes.map(cls => (
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

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to CSV
          </button>
          {selectedStudents.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => bulkToggleClearance('allow')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
              >
                ✅ Allow ({selectedStudents.length})
              </button>
              <button
                onClick={() => bulkToggleClearance('restrict')}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center gap-2"
              >
                🚫 Restrict ({selectedStudents.length})
              </button>
            </div>
          )}
          <button
            onClick={sendBulkReminders}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Fee Reminders
          </button>
          <button
            onClick={handleSyncRecords}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Fee Records (Fix Missing)
          </button>
          <div className="ml-auto text-sm text-gray-600 flex items-center">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      onChange={selectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  const feeRecord = student.feeRecords[0];
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">
                            {student.user.firstName} {student.user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.admissionNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.classModel ?
                          `${student.classModel.name}${student.classModel.arm || ''}` :
                          'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₦{feeRecord?.expectedAmount.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ₦{feeRecord?.paidAmount.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        ₦{feeRecord?.balance.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {feeRecord?.isClearedForExam ? (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            ✓ Allowed
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                            🚫 Restricted
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="text-primary hover:text-primary-dark font-medium"
                          >
                            💰 Pay
                          </button>
                          <button
                            onClick={() => viewPaymentHistory(student)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            🕒 History
                          </button>
                          <button
                            onClick={() => handleEditFee(student)}
                            className="text-orange-600 hover:text-orange-900 font-medium"
                          >
                            ⚙️ Adjust
                          </button>
                          <button
                            onClick={() => toggleClearance(student.id, !feeRecord?.isClearedForExam)}
                            className={`${feeRecord?.isClearedForExam ? 'text-amber-600 hover:text-amber-900' : 'text-indigo-600 hover:text-indigo-900'} font-medium`}
                            title={feeRecord?.isClearedForExam ? 'Restrict Exam Card' : 'Allow Exam Card'}
                          >
                            {feeRecord?.isClearedForExam ? '🚫 Restrict (Fee)' : '✅ Allow (Fee)'}
                          </button>
                          <button
                            onClick={() => handleRestrictClick(student)}
                            className={`${student.isExamRestricted ? 'text-red-600 hover:text-red-800 font-bold' : 'text-gray-500 hover:text-gray-700'} font-medium flex items-center gap-1`}
                            title="Manage Global Card Restriction"
                          >
                            {student.isExamRestricted ? (
                              <>🔒 BLOCKED</>
                            ) : (
                              <>🛡️ Block</>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Render Payment Modal, History Modal etc. */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
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
                  Outstanding: ₦{selectedStudent.feeRecords[0]?.balance.toLocaleString() || 0}
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

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => recordPayment(selectedStudent.id)}
                className="px-4 py-2 bg-primary text-white rounded hover:brightness-90"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && historyStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Payment History</h2>
              <button
                onClick={() => setShowPaymentHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="block text-gray-500">Student Name</span>
                  <span className="font-medium">{historyStudent.user.firstName} {historyStudent.user.lastName}</span>
                </div>
                <div>
                  <span className="block text-gray-500">Admission No</span>
                  <span className="font-medium">{historyStudent.admissionNumber}</span>
                </div>
                <div>
                  <span className="block text-gray-500">Total Paid</span>
                  <span className="font-medium text-green-600">
                    ₦{historyStudent.feeRecords[0]?.paidAmount.toLocaleString() || 0}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-500">Total Outstanding</span>
                  <span className="font-medium text-red-600">
                    ₦{historyStudent.feeRecords[0]?.balance.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500 italic">
                  📝 You can use the <strong>Edit</strong> button below to update any previous payment records or correct mistakes.
                </p>
              </div>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payments found for this term.
                </div>
              ) : (
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
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          ₦{payment.amount.toLocaleString()}
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
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Print
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
                  <span className="font-semibold text-gray-700">₦{(editingFeeRecord.record?.openingBalance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Expected:</span>
                  <span className="font-semibold text-gray-700">₦{(parseFloat(adjustedExpected) || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-1 border-gray-200">
                  <span className="text-gray-600 font-bold">Total Due:</span>
                  <span className="font-bold text-gray-900 underline">₦{((editingFeeRecord.record?.openingBalance || 0) + (parseFloat(adjustedExpected) || 0)).toLocaleString()}</span>
                </div>
                <div className={`flex justify-between border-t pt-1 mt-1 ${((editingFeeRecord.record?.openingBalance || 0) + (parseFloat(adjustedExpected) || 0) - (parseFloat(adjustedPaid) || 0)) < 0 ? 'text-red-600' : 'text-orange-800'}`}>
                  <span className="font-bold">Remaining Balance:</span>
                  <span className="font-bold">₦{((editingFeeRecord.record?.openingBalance || 0) + (parseFloat(adjustedExpected) || 0) - (parseFloat(adjustedPaid) || 0)).toLocaleString()}</span>
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
    </div>
  );
}
