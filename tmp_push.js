const { execSync } = require('child_process');

try {
  console.log('Adding...');
  execSync('git add .');
  console.log('Committing...');
  execSync('git commit -m "Implement flexible weekend configuration"');
  console.log('Pushing...');
  execSync('git push');
  console.log('Success!');
} catch (e) {
  console.error('Git failed:', e.message);
}
