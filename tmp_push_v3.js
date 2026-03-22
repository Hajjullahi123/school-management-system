const { execSync } = require('child_process');

try {
  console.log('Adding...");
  execSync('git add .');
  console.log('Committing...');
  execSync('git commit -m "✨ feat: clarify miscellaneous fee labels and show itemized titles on parent dashboard"');
  console.log('Pushing...');
  execSync('git push');
  console.log('Success!');
} catch (e) {
  // Try pushing anyway if commit failed (e.g. no changes)
  try {
      console.log('Pushing existing commits...');
      execSync('git push');
      console.log('Success!');
  } catch (err) {
      console.error('Final push failed:', err.message);
  }
}
