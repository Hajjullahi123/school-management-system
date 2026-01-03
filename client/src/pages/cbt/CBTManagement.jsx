import React, { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../../api';
import { toast } from '../../utils/toast';
import useSchoolSettings from '../../hooks/useSchoolSettings';
import { useAuth } from '../../context/AuthContext';

const CBTManagement = () => {
  const [view, setView] = useState('list'); // 'list', 'create', 'questions'
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { settings: schoolSettings } = useSchoolSettings();
  const { user } = useAuth();

  // Create/Edit Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    durationMinutes: 60,
    totalMarks: 100,
    startDate: '',
    endDate: '',
    examType: 'examination'
  });

  // Question Management State
  const [selectedExam, setSelectedExam] = useState(null);
  const [questions, setQuestions] = useState([]); // Questions for selected exam
  const [examResults, setExamResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    questionType: 'multiple_choice',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' }
    ],
    correctOption: 'a',
    points: 1
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const requests = [
        api.get('/api/cbt/teacher'),
        api.get('/api/classes'),
        api.get('/api/subjects')
      ];

      if (user?.role === 'teacher') {
        requests.push(api.get(`/api/teacher-assignments/teacher/${user.id}`));
      }

      const results = await Promise.all(requests);

      setExams(await results[0].json());
      setClasses(await results[1].json());
      setSubjects(await results[2].json());

      if (user?.role === 'teacher' && results[3]) {
        setTeacherAssignments(await results[3].json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/cbt', formData);
      const data = await response.json();

      if (response.ok) {
        toast.success('Exam created successfully');
        setExams([data, ...exams]);
        setView('list');
        // Reset form
        setFormData({
          title: '',
          description: '',
          classId: '',
          subjectId: '',
          durationMinutes: 60,
          totalMarks: 100,
          startDate: '',
          endDate: '',
          examType: 'examination'
        });
      } else {
        toast.error(data.error || 'Failed to create exam');
      }
    } catch (error) {
      toast.error('Error creating exam');
    }
  };

  const handleManageQuestions = async (exam) => {
    setSelectedExam(exam);
    // Fetch questions for this exam
    try {
      const response = await api.get(`/api/cbt/${exam.id}`);
      const data = await response.json();
      if (response.ok) {
        // Parse options if they are strings (JSON)
        const parsedQuestions = data.questions.map(q => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));
        setQuestions(parsedQuestions);
        setView('questions');
      }
    } catch (error) {
      toast.error('Failed to load questions');
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.questionText) {
      toast.error('Question text is required');
      return;
    }
    // Check if options are filled
    if (newQuestion.options.some(o => !o.text.trim())) {
      toast.error('All options must be filled');
      return;
    }

    try {
      // Send as array
      const payload = { questions: [newQuestion] };
      const response = await api.post(`/api/cbt/${selectedExam.id}/questions`, payload);
      const data = await response.json();

      if (response.ok) {
        toast.success('Question added');
        // Add to local list (data is array of created questions)
        const createdQ = data[0];
        createdQ.options = JSON.parse(createdQ.options);
        setQuestions([...questions, createdQ]);

        // Reset new question form partly
        setNewQuestion({
          ...newQuestion,
          questionText: '',
          options: [
            { id: 'a', text: '' },
            { id: 'b', text: '' },
            { id: 'c', text: '' },
            { id: 'd', text: '' }
          ],
          correctOption: 'a'
        });
      } else {
        toast.error(data.error || 'Failed to add question');
      }
    } catch (error) {
      toast.error('Error adding question');
    }
  };

  const handlePublishToggle = async (exam) => {
    try {
      const response = await api.put(`/api/cbt/${exam.id}/publish`, { isPublished: !exam.isPublished });
      if (response.ok) {
        toast.success(exam.isPublished ? 'Exam unpublished' : 'Exam published');
        // Update local state
        setExams(exams.map(e => e.id === exam.id ? { ...e, isPublished: !e.isPublished } : e));
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!confirm('Are you sure? This will delete the exam and all results.')) return;

    try {
      const response = await api.delete(`/api/cbt/${examId}`);
      if (response.ok) {
        toast.success('Exam deleted');
        setExams(exams.filter(e => e.id !== examId));
      }
    } catch (error) {
      toast.error('Failed to delete exam');
    }
  };

  const handleViewResults = async (exam) => {
    setSelectedExam(exam);
    setResultsLoading(true);
    setView('results');
    try {
      const response = await api.get(`/api/cbt/${exam.id}/results`);
      const data = await response.json();
      if (response.ok) {
        setExamResults(data.results);
      } else {
        toast.error('Failed to fetch results');
      }
    } catch (error) {
      toast.error('Error loading results');
    } finally {
      setResultsLoading(false);
    }
  };

  const handleDownloadResults = () => {
    if (!selectedExam) return;
    const url = `${API_BASE_URL}/api/cbt/${selectedExam.id}/results/download`;
    const token = localStorage.getItem('token');

    // Use a hidden anchor tag to trigger download with auth token
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CBT_Results_${selectedExam.title.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      })
      .catch(error => {
        console.error('Download error:', error);
        toast.error('Failed to download results');
      });
  };

  const handleImportResults = async () => {
    if (!selectedExam) return;
    if (!confirm(`This will automatically import scores from this ${selectedExam.examType || 'examination'} into the students' academic records for ${selectedExam.class?.name}. Existing scores for this specific component will be overwritten. Continue?`)) return;

    setImporting(true);
    try {
      const response = await api.post(`/api/cbt/${selectedExam.id}/results/import`, {});
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Scores imported successfully');
      } else {
        toast.error(data.error || 'Failed to import scores');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Error importing scores');
    } finally {
      setImporting(false);
    }
  };

  const updateOptionText = (index, text) => {
    const newOptions = [...newQuestion.options];
    newOptions[index].text = text;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {schoolSettings?.logoUrl && (
            <img src={schoolSettings.logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">CBT Management</h1>
            <p className="text-sm text-gray-500">{schoolSettings?.schoolName || 'School Management System'}</p>
          </div>
        </div>
        <div className="space-x-2">
          {view !== 'list' && (
            <button
              onClick={() => setView('list')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-primary"
            >
              Back to List
            </button>
          )}
          {view === 'list' && (
            <button
              onClick={() => setView('create')}
              className="px-4 py-2 bg-primary text-white rounded hover:brightness-90"
            >
              + Create New Exam
            </button>
          )}
        </div>
      </div>

      {/* VIEW: List */}
      {view === 'list' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class & Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{exam.title}</div>
                    <div className="text-xs text-gray-500">{new Date(exam.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                      {exam.examType?.replace('_', ' ') || 'Examination'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{exam.class?.name}</div>
                    <div className="text-sm text-gray-500">{exam.subject?.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{exam.durationMinutes} mins</div>
                    <div>{exam.totalMarks} Marks</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exam._count?.questions || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handlePublishToggle(exam)}
                      className={`px-2 py-1 text-xs rounded-full font-semibold ${exam.isPublished
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }`}
                    >
                      {exam.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button
                      onClick={() => handleViewResults(exam)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Results
                    </button>
                    <button
                      onClick={() => handleManageQuestions(exam)}
                      className="text-primary hover:text-primary-dark"
                    >
                      Manage Questions
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {exams.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                    No exams found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: Create Form */}
      {view === 'create' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Create New Exam</h2>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Exam Title</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Class</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                >
                  <option value="">Select Class</option>
                  {classes
                    .filter(c => user?.role === 'admin' || teacherAssignments.some(ta => ta.classId === c.id))
                    .map(c => <option key={c.id} value={c.id}>{c.name} {c.arm}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                >
                  <option value="">Select Subject</option>
                  {subjects
                    .filter(s => {
                      if (user?.role === 'admin') return true;
                      if (!formData.classId) return false;
                      return teacherAssignments.some(ta => ta.classId === parseInt(formData.classId) && ta.subjectId === s.id);
                    })
                    .map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Exam Type</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.examType}
                  onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                >
                  <option value="examination">Examination</option>
                  <option value="first_test">First Test</option>
                  <option value="second_test">Second Test</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {/* Empty space or additional fields if needed in the same row as Exam Type */}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration (Minutes)</label>
                <input
                  type="number"
                  min="10"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Marks</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date (Optional)</label>
                <input
                  type="datetime-local"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
                <input
                  type="datetime-local"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              ></textarea>
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:brightness-90"
              >
                Create Exam
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: Manage Questions */}
      {view === 'questions' && selectedExam && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Add Question Form */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-6 h-fit sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Question</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <textarea
                  className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary"
                  rows="3"
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                <div className="space-y-2">
                  {newQuestion.options.map((option, index) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={newQuestion.correctOption === option.id}
                        onChange={() => setNewQuestion({ ...newQuestion, correctOption: option.id })}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                      <span className="text-gray-500 w-6 font-mono font-bold uppercase">{option.id}.</span>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOptionText(index, e.target.value)}
                        placeholder={`Option ${option.id.toUpperCase()}`}
                        className="flex-1 rounded-md border-gray-300 text-sm focus:ring-primary focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Select the radio button next to the correct answer.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary"
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({ ...newQuestion, points: parseFloat(e.target.value) })}
                />
              </div>

              <button
                onClick={handleAddQuestion}
                className="w-full py-2 bg-primary text-white rounded-md hover:brightness-90 font-medium"
              >
                Add Question
              </button>
            </div>
          </div>

          {/* Right Col: Question List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-blue-900">{selectedExam.title}</h2>
                <p className="text-sm text-blue-700">Total Questions: {questions.length} | Est. Marks: {questions.reduce((sum, q) => sum + q.points, 0)}</p>
              </div>
            </div>

            {questions.map((q, qIndex) => (
              <div key={q.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-800 text-lg">Q{qIndex + 1}. {q.questionText}</h4>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{q.points} Marks</span>
                </div>
                <div className="space-y-1 ml-2">
                  {q.options.map(opt => (
                    <div key={opt.id} className={`flex items-center space-x-2 ${q.correctOption === opt.id ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs border ${q.correctOption === opt.id ? 'border-green-600 bg-green-100' : 'border-gray-300'}`}>
                        {opt.id.toUpperCase()}
                      </span>
                      <span>{opt.text}</span>
                      {q.correctOption === opt.id && <span>(Correct)</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
                No questions added yet. Use the form on the left to add questions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: Results */}
      {view === 'results' && selectedExam && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
            <div>
              <h2 className="text-xl font-bold text-blue-900">{selectedExam.title} - Results</h2>
              <p className="text-sm text-blue-700">Total Attempts: {examResults.length}</p>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <p className="text-sm text-gray-600">Total Marks: {selectedExam.totalMarks}</p>
              <button
                onClick={handleDownloadResults}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Excel (CSV)
              </button>
              <button
                onClick={handleImportResults}
                disabled={importing || examResults.length === 0}
                className={`px-4 py-2 text-white rounded flex items-center gap-2 text-sm font-medium transition-colors shadow-sm ${importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:brightness-90'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {importing ? 'Importing...' : 'Import to Records'}
              </button>
            </div>
          </div>

          {resultsLoading ? (
            <div className="text-center py-10">Loading results...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct Answers</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {examResults.map((result) => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {result.student.user.firstName} {result.student.user.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{result.student.admissionNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(result.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {result.score}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${(result.score / selectedExam.totalMarks) >= 0.5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {selectedExam.totalMarks > 0 ? Math.round((result.score / selectedExam.totalMarks) * 100) : 0}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.correctAnswers} / {result.totalQuestions}
                      </td>
                    </tr>
                  ))}
                  {examResults.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                        No submissions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CBTManagement;
