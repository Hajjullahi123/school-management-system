const testRow = {
  'S/N': 1,
  'Admission No': 'DQ-2025-001',
  'Student Name': 'Abubakar Juli',
  'Assign 1 (5)': '0',
  'Assign 2 (5)': '0',
  'Test 1 (10)': '5',
  'Test 2 (10)': '5',
  'Exam (70)': '22',
  'Total (100)': '32.0'
};

const getValue = (row, keywords) => {
  const rowKeys = Object.keys(row);
  const targetKey = rowKeys.find(key => {
    const normalizedKey = key.toLowerCase().trim();
    return keywords.some(kw => normalizedKey.includes(kw.toLowerCase()));
  });
  return targetKey ? row[targetKey] : '';
};

const scores = {
  assignment1: parseFloat(getValue(testRow, ['1st Assignment', 'Assignment 1', 'Assign 1', 'Ass 1', '1st CA'])) || 0,
  assignment2: parseFloat(getValue(testRow, ['2nd Assignment', 'Assignment 2', 'Assign 2', 'Ass 2', '2nd CA'])) || 0,
  test1: parseFloat(getValue(testRow, ['1st Test', 'Test 1', 'CA 1'])) || 0,
  test2: parseFloat(getValue(testRow, ['2nd Test', 'Test 2', 'CA 2'])) || 0,
  exam: parseFloat(getValue(testRow, ['Exam', 'Examination'])) || 0
};

console.log("Raw Values Extracted:", {
  rawA1: getValue(testRow, ['1st Assignment', 'Assignment 1', 'Assign 1', 'Ass 1', '1st CA']),
  rawA2: getValue(testRow, ['2nd Assignment', 'Assignment 2', 'Assign 2', 'Ass 2', '2nd CA']),
  rawT1: getValue(testRow, ['1st Test', 'Test 1', 'CA 1']),
});
console.log("Parsed Scores Object:", scores);
