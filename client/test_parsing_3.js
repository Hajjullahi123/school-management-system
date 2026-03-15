const testRow2 = {
  'S/N': 1,
  'Admission No': 'DQ-2025-001',
  'Student Name': 'Abubakar Juli',
  'Assign 1 (5)': 4,
  'Assign 2 (5)': 4,
  'Test 1 (10)': 8,
  'Test 2 (10)': 9,
  'Exam (70)': 60,
  'Total (100)': { formula: 'SUM(D8:H8)' }
};

const getValue2 = (row, keywords) => {
  const rowKeys = Object.keys(row);
  const targetKey = rowKeys.find(key => {
    const normalizedKey = key.toLowerCase().trim();
    return keywords.some(kw => normalizedKey.includes(kw.toLowerCase()));
  });
  return targetKey ? row[targetKey] : '';
};

console.log("Raw Val A1:", getValue2(testRow2, ['1st Assignment', 'Assignment 1', 'Assign 1', 'Ass 1', '1st CA']));
