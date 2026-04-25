import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';

const MiscFeePayments = () => {
  const { user } = useAuth();
  const { settings: schoolSettings } = useSchoolSettings();
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFees, setStudentFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    feeId: '',
    amount: '',
    paymentMethod: 'cash',
    receiptNumber: ''
  });

  useEffect(() => {
    fetchStudents();
    fetchFees();
    fetchPayments();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/api/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    }
  };

  const fetchFees = async () => {
    try {
      const response = await api.get('/api/misc-fees');
      if (response.ok) {
        const data = await response.json();
        setFees(data);
      }
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast.error('Failed to load fees');
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await api.get('/api/misc-fees/payments');
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payment history');
    }
  };

  const handleStudentSelect = async (studentId) => {
    try {
      const student = students.find(s => s.id === parseInt(studentId));
      setSelectedStudent(student);

      const response = await api.get(`/api/misc-fees/student/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setStudentFees(data);
        setShowPaymentForm(false);
      } else {
        toast.error('Failed to load student fee details');
      }
    } catch (error) {
      console.error('Error fetching student fees:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/misc-fees/payments', {
        studentId: selectedStudent.id,
        ...formData,
        amount: parseFloat(formData.amount)
      });

      if (response.ok) {
        toast.success('Payment recorded successfully!');
        handleStudentSelect(selectedStudent.id);
        fetchPayments();
        resetPaymentForm();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetPaymentForm = () => {
    setFormData({
      feeId: '',
      amount: '',
      paymentMethod: 'cash',
      receiptNumber: ''
    });
    setShowPaymentForm(false);
  };

  const handlePrintReceipt = async (paymentId) => {
    try {
      const response = await api.get(`/api/misc-fees/receipt/${paymentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch receipt data');
      }
      const payment = await response.json();

      const primaryColor = schoolSettings?.primaryColor || '#0f766e';
      const logoUrl = schoolSettings?.logoUrl
        ? (schoolSettings.logoUrl.startsWith('http') ? schoolSettings.logoUrl : `${API_BASE_URL}${schoolSettings.logoUrl}`)
        : null;

      // Generate security markers
      const securityHash = btoa(`MISC-${payment.id}-${payment.student.id}`).substring(0, 12).toUpperCase();
      const barcodeText = `MISC-${payment.id}`;
      const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(barcodeText)}&scale=3&rotate=N&includetext=true&backgroundcolor=ffffff&height=12`;

      const printWindow = window.open('', '_blank');
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
              <h1>${schoolSettings?.schoolName || 'SMS'}</h1>
              <p>${schoolSettings?.schoolAddress?.substring(0, 30) || 'Official Receipt'}</p>
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
              <div class="info-value">${payment.student.user.firstName} ${payment.student.user.lastName} ${payment.student.middleName || ''}</div>
            </div>
            <div class="info-row">
              <div class="info-group">
                <div class="info-label">Student ID</div>
                <div class="info-value">${payment.student.admissionNumber}</div>
              </div>
              <div class="info-group">
                <div class="info-label">Class</div>
                <div class="info-value">${payment.student.classModel?.name || 'N/A'}</div>
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
                <div class="info-value" style="text-transform: uppercase;">${payment.paymentMethod || 'CASH'}</div>
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
                  <textPath href="#sealPath">AUTHENTIC RECEIPT • ${schoolSettings?.schoolName?.split(' ')[0] || 'SMS'} • </textPath>
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

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;

    try {
      const response = await api.delete(`/api/misc-fees/payments/${id}`);
      if (response.ok) {
        toast.success('Payment deleted successfully!');
        fetchPayments();
        if (selectedStudent) {
          handleStudentSelect(selectedStudent.id);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const filteredStudents = students.filter(student => {
    const name = `${student.user.firstName} ${student.user.lastName} ${student.middleName || ''}`.toLowerCase();
    const admission = student.admissionNumber.toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || admission.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Miscellaneous Fee Payments</h1>
        <p className="text-gray-600">Record and manage payments for custom fees</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="font-semibold text-lg mb-4">Select Student</h2>
            <input
              type="text"
              placeholder="Search by name or admission number..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredStudents.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No students found</p>
              ) : (
                filteredStudents.map(student => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentSelect(student.id)}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${selectedStudent?.id === student.id ? 'bg-blue-50 border-blue-500' : ''
                      }`}
                  >
                    <div className="font-bold text-gray-900">{student.user.firstName} {student.user.lastName} {student.middleName || ''}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">{student.admissionNumber}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{student.classModel?.name || 'No Class'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Fee Details & Payment Form */}
        <div className="lg:col-span-2">
          {!selectedStudent ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
              Please select a student to view their fee details
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-md p-6 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-lg">
                    {selectedStudent.user.firstName} {selectedStudent.user.lastName} {selectedStudent.middleName || ''}'s Fees
                  </h2>
                  <button
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark text-sm"
                  >
                    {showPaymentForm ? 'Cancel' : '+ Record Payment'}
                  </button>
                </div>

                {showPaymentForm && (
                  <form onSubmit={handlePaymentSubmit} className="bg-gray-50 p-4 rounded-md mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fee *</label>
                        <select
                          value={formData.feeId}
                          onChange={(e) => {
                            const selectedFee = studentFees.find(f => f.id === parseInt(e.target.value));
                            setFormData({
                              ...formData,
                              feeId: e.target.value,
                              amount: selectedFee?.balance || ''
                            });
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        >
                          <option value="">Select fee</option>
                          {studentFees.filter(f => f.balance > 0).map(fee => (
                            <option key={fee.id} value={fee.id}>
                              {fee.title} (Balance: ₦{fee.balance.toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₦) *</label>
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                        <select
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="cash">Cash</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="online">Online Payment</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Number</label>
                        <input
                          type="text"
                          value={formData.receiptNumber}
                          onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                          placeholder="Optional"
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                      <button
                        type="button"
                        onClick={resetPaymentForm}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:bg-gray-400"
                      >
                        {loading ? 'Recording...' : 'Record Payment'}
                      </button>
                    </div>
                  </form>
                )}

                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fee</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Paid</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentFees.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-4 text-center text-gray-500">
                          No fees assigned to this student
                        </td>
                      </tr>
                    ) : (
                      studentFees.map(fee => (
                        <tr key={fee.id}>
                          <td className="px-4 py-2">{fee.title}</td>
                          <td className="px-4 py-2">₦{fee.amount.toLocaleString()}</td>
                          <td className="px-4 py-2 text-green-600">₦{fee.paid.toLocaleString()}</td>
                          <td className="px-4 py-2">
                            <span className={fee.balance > 0 ? 'text-red-600' : 'text- green-600'}>
                              ₦{fee.balance.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payment History */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4">Payment History</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fee</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Method</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.filter(p => p.studentId === selectedStudent.id).length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                          No payments recorded yet
                        </td>
                      </tr>
                    ) : (
                      payments
                        .filter(p => p.studentId === selectedStudent.id)
                        .map(payment => (
                          <tr key={payment.id}>
                            <td className="px-4 py-2 text-sm">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-sm">{payment.fee.title}</td>
                            <td className="px-4 py-2 text-sm">₦{payment.amount.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm capitalize">{payment.paymentMethod || 'Cash'}</td>
                            <td className="px-4 py-2 text-sm">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handlePrintReceipt(payment.id)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  Print
                                </button>
                                <button
                                  onClick={() => handleDeletePayment(payment.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MiscFeePayments;
