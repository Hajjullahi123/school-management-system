const { generateLicenseKey } = require('./utils/license');
require('dotenv').config();

// Usage: node generate_key.js "School Name" "Package (basic/standard/premium)" [Max Students] [Expiry Date YYYY-MM-DD]
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node generate_key.js "School Name" "basic|standard|premium" [maxStudents] [expiryDate]');
  console.log('Example: node generate_key.js "Darul Quran Academy" "standard" 1500 2026-12-31');
  process.exit(1);
}

const schoolName = args[0];
const packageType = args[1];
const maxStudents = args[2] ? parseInt(args[2]) : (packageType === 'basic' ? 500 : packageType === 'standard' ? 1500 : -1);
const expiryDate = args[3] || null;

const key = generateLicenseKey({
  schoolName,
  packageType,
  maxStudents,
  expiresAt: expiryDate
});

console.log('\n================================================');
console.log('      LICENSE KEY GENERATED SUCCESSFULLY        ');
console.log('================================================');
console.log('School:    ', schoolName);
console.log('Package:   ', packageType);
console.log('Max Students:', maxStudents === -1 ? 'Unlimited' : maxStudents);
console.log('Expires:   ', expiryDate || 'Never (Lifetime)');
console.log('------------------------------------------------');
console.log('LICENSE KEY:');
console.log(key);
console.log('================================================\n');
console.log('Copy the "LICENSE KEY" above and give it to the school.');
