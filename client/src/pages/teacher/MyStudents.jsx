import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import PhotoUpload from '../../components/PhotoUpload';

const MyStudents = () => {
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { settings: schoolSettings } = useSchoolSettings();

  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMyClass();
  }, []);

  const fetchMyClass = async () => {
    try {
      const response = await api.get('/api/classes/my-class');

      if (response.status === 404) {
        setError('You are not currently assigned as a Form Master for any class.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch class data');
      }

      const data = await response.json();
      
      // Sort students alphabetically
      if (data.students && Array.isArray(data.students)) {
        data.students.sort((a, b) => {
          const nameA = `${a.user?.firstName || ''} ${a.user?.lastName || ''} ${a.name || ''}`.trim().toLowerCase() || 'zzzz';
          const nameB = `${b.user?.firstName || ''} ${b.user?.lastName || ''} ${b.name || ''}`.trim().toLowerCase() || 'zzzz';
          return nameA.localeCompare(nameB);
        });
      }
      
      setClassData(data);
    } catch (err) {
      console.error('Error fetching my class:', err);
      setError('Failed to load class information.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (student) => {
    // Format date string for input type="date"
    let dob = '';
    if (student.dateOfBirth) {
      try {
        dob = new Date(student.dateOfBirth).toISOString().split('T')[0];
      } catch (e) {
        console.error("Invalid date string", student.dateOfBirth);
      }
    }

    setFormData({
      dateOfBirth: dob,
      genotype: student.genotype || '',
      clubs: student.clubs || '',
      parentGuardianName: student.parentGuardianName || '',
      parentGuardianPhone: student.parentGuardianPhone || '',
      parentEmail: student.parentEmail || ''
    });
    setEditingStudent(student);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Send PUT request to update student details
      const response = await api.put(`/api/students/${editingStudent.id}`, formData);

      if (response.ok) {
        alert('Student details updated successfully!');
        // Refresh the class list
        await fetchMyClass();
        setEditingStudent(null);
      } else {
        const result = await response.json();
        alert(`Failed to update student: ${result.error || result.message}`);
      }
    } catch (err) {
      console.error('Error updating student:', err);
      alert('An error occurred while updating the student.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = (newUrl) => {
    // Update local state so preview reflects the new photo without needing full refetch immediately
    setEditingStudent(prev => ({ ...prev, photoUrl: newUrl }));
    fetchMyClass(); // Silently refresh class list to update the table image
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && error.includes('not currently assigned')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-center space-y-6">
        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center text-primary">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-black text-gray-900">No Class Assigned</h2>
          <p className="text-gray-600 font-medium">
            You are currently not assigned as a <strong>Form Master</strong> for any class.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-8 py-3 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all active:scale-95"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-l-4 border-rose-400 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 text-rose-400">
            <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-rose-700 font-bold">{error}</p>
        </div>
      </div>
    );
  }

  const activeStudents = classData?.students?.filter(s => s.user?.isActive !== false) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          {schoolSettings?.logoUrl && (
            <img src={schoolSettings.logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Students</h1>
            <p className="text-sm text-gray-600">
              Form Master: <span className="font-bold text-primary">{classData.name} {classData.arm}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
             <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest leading-none mb-1">Total Students</p>
             <p className="text-xl font-black text-gray-900 leading-none">{classData.students?.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Student Details</h3>
          <p className="text-sm text-gray-500 mt-1">Manage secondary student details and upload passports for your assigned class.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Info</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(Array.isArray(classData?.students) ? classData.students : []).map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const photoUrl = student.user?.photoUrl || student.photoUrl;
                      return photoUrl ? (
                        <img
                          src={photoUrl.startsWith('data:') || photoUrl.startsWith('http') ? photoUrl : `${API_BASE_URL}${photoUrl}`}
                          alt="Student"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {(student.user?.firstName?.[0] || student.name?.[0] || '?').toUpperCase()}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.admissionNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className="font-bold text-gray-900">
                      {`${student.user?.firstName || ''} ${student.middleName || ''} ${student.user?.lastName || ''}`.trim() || student.name || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {student.parentGuardianName ? (
                       <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{student.parentGuardianName}</span>
                          <span className="text-xs text-gray-400">{student.parentGuardianPhone}</span>
                       </div>
                    ) : (
                       <span className="text-gray-300 italic">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(student)}
                      className="text-primary hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors font-bold border border-primary/20"
                    >
                      Edit Details
                    </button>
                  </td>
                </tr>
              ))}
              {classData?.students?.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                    No students found in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                   <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                   </svg>
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-gray-900 leading-none mb-1">Edit Student Details</h3>
                    <p className="text-sm font-medium text-gray-500">
                      Modifying records for <span className="text-primary font-bold">{editingStudent.admissionNumber}</span>
                    </p>
                 </div>
              </div>
              <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Note about name restrictions */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
                 <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 <p>As a Form Master, you can update demographic and parent details. <strong>Editing student names or adding new records must be done by an Administrator.</strong></p>
              </div>

              {/* Passport Upload */}
              <PhotoUpload 
                studentId={editingStudent.id} 
                currentPhotoUrl={editingStudent.user?.photoUrl || editingStudent.photoUrl} 
                onPhotoUpload={handlePhotoUpload} 
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Disabled Name fields for reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                  <input type="text" disabled value={`${editingStudent.user?.firstName || ''} ${editingStudent.user?.lastName || ''}`.trim() || editingStudent.name || ''} className="w-full bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input 
                    type="date" 
                    name="dateOfBirth" 
                    value={formData.dateOfBirth} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Club(s)</label>
                  <input 
                    type="text" 
                    name="clubs" 
                    placeholder="e.g. Jet Club, Press Club"
                    value={formData.clubs} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genotype</label>
                  <select 
                    name="genotype" 
                    value={formData.genotype} 
                    onChange={handleInputChange} 
                    className="w-full bg-white border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  >
                    <option value="">Select Genotype</option>
                    <option value="AA">AA</option>
                    <option value="AS">AS</option>
                    <option value="SS">SS</option>
                    <option value="AC">AC</option>
                    <option value="SC">SC</option>
                  </select>
                </div>
                
                <div className="md:col-span-2 pt-4 border-t border-gray-100 mt-2">
                   <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Parent / Guardian Details</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian Name</label>
                        <input 
                          type="text" 
                          name="parentGuardianName" 
                          placeholder="Full Name"
                          value={formData.parentGuardianName} 
                          onChange={handleInputChange} 
                          className="w-full bg-white border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian Phone</label>
                        <input 
                          type="text" 
                          name="parentGuardianPhone" 
                          placeholder="Phone Number"
                          value={formData.parentGuardianPhone} 
                          onChange={handleInputChange} 
                          className="w-full bg-white border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian Email</label>
                        <input 
                          type="email" 
                          name="parentEmail" 
                          placeholder="Email Address"
                          value={formData.parentEmail} 
                          onChange={handleInputChange} 
                          className="w-full bg-white border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" 
                        />
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
               <button
                 onClick={() => setEditingStudent(null)}
                 className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={handleSave}
                 disabled={saving}
                 className="px-8 py-2.5 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-70 flex items-center gap-2"
               >
                 {saving ? (
                   <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                      <span>Saving...</span>
                   </>
                 ) : 'Save Details'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyStudents;
