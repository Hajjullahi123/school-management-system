const testRow = {
  'Admission Number': 'DQ-2025-001',
  'Student Name': 'John Doe',
  '1st Assignment (5)': '4',
  '2nd Assignment (5)': '4',
  '1st Test (10)': '8',
  '2nd Test (10)': '9',
  'Examination (70)': '60'
};

const keywords = ['1st Assignment', 'Assignment 1', 'Assign 1', 'Ass 1', '1st CA'];

const getValue = (row, keywords) => {
  const rowKeys = Object.keys(row);
  const targetKey = rowKeys.find(key => {
    const normalizedKey = key.toLowerCase().trim();
    // THE BUG IS HERE: Normalized key "1st assignment (5)" does NOT include "1st assignment " (wait, yes it does).
    return keywords.some(kw => normalizedKey.includes(kw.toLowerCase()));
  });
  return targetKey ? row[targetKey] : '';
};

console.log("Assignment 1 Value:", getValue(testRow, keywords));
console.log("Assignment 2 Value:", getValue(testRow, ['2nd assignment', 'assignment 2']));
console.log("Test 1 Value:", getValue(testRow, ['1st test', 'test 1', 'ca 1']));
console.log("Test 2 Value:", getValue(testRow, ['2nd test', 'test 2', 'ca 2']));
