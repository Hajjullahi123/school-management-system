import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const MiscFeePayments = () => {
  const { user } = useAuth();
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

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { margin: 20px 0; }
            .row { display: flex; justify-content: space-between; margin: 10px 0; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${payment.school.name}</h2>
            <h3>Payment Receipt</h3>
            <p>Receipt No: ${payment.receiptNumber || payment.id}</p>
          </div>
          <div class="details">
            <div class="row"><strong>Student:</strong> ${payment.student.user.firstName} ${payment.student.user.lastName}</div>
            <div class="row"><strong>Class:</strong> ${payment.student.classModel?.name || 'N/A'}</div>
            <div class="row"><strong>Fee:</strong> ${payment.fee.title}</div>
            <div class="row"><strong>Amount Paid:</strong> ₦${payment.amount.toLocaleString()}</div>
            <div class="row"><strong>Payment Method:</strong> ${payment.paymentMethod || 'Cash'}</div>
            <div class="row"><strong>Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}</div>
          </div>
          <div class="footer">
            <p>Thank you for your payment!</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
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
    const name = `${student.user.firstName} ${student.user.lastName}`.toLowerCase();
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
                    <div className="font-bold text-gray-900">{student.user.firstName} {student.user.lastName}</div>
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
                    {selectedStudent.user.firstName} {selectedStudent.user.lastName}'s Fees
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
