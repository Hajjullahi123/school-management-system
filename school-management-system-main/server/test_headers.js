// Simulating frontend `getValue`
const getValue = (row, keywords) => {
  const rowKeys = Object.keys(row);
  const targetKey = rowKeys.find(key => {
    const normalizedKey = key.toLowerCase().trim();
    return keywords.some(kw => normalizedKey.includes(kw.toLowerCase()));
  });
  return targetKey ? row[targetKey] : '';
};

const getScoreValue = (row, keywords) => {
  const val = getValue(row, keywords);
  if (val === undefined || val === null || val === '') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
};

const row = {
  'S/N': 1,
  'Admission No': 'STU01',
  'Student Name': 'Abubakar Juli',
  'Assign 1 (5)': 4,
  'Assign 2 (5)': 4,
  'Test 1 (10)': 5,
  'Test 2 (10)': 5,
  'Exam (70)': 22
};

const scores = {
  assignment1: getScoreValue(row, ['1st Assignment', 'Assignment 1', 'Assign 1', 'Ass 1', '1st CA']),
  assignment2: getScoreValue(row, ['2nd Assignment', 'Assignment 2', 'Assign 2', 'Ass 2', '2nd CA']),
  test1: getScoreValue(row, ['1st Test', 'Test 1', 'CA 1']),
  test2: getScoreValue(row, ['2nd Test', 'Test 2', 'CA 2']),
  exam: getScoreValue(row, ['Exam', 'Examination'])
};

console.log(scores);
