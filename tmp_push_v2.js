const { execSync } = require('child_process');

try {
  console.log('Adding...");
  execSync('git add .');
  console.log('Committing...");
  execSync('git commit -m "✨ feat: clarify miscellaneous fee labels and show itemized titles on parent dashboard"');
  console.log('Pushing...");
  execSync('git push');
  console.log('Success!');
} catch (e) {
  // If no changes to commit, it might fail, so let's check
  try {
      console.log('Pushing any existing local commits...');
      execSync('git push');
      console.log('Success!');
  } catch (err) {
      console.error('Git failed:', err.message);
  }
}
