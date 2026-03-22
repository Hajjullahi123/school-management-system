const { execSync } = require('child_process');

try {
  console.log('Adding...");
  execSync('git add .');
  console.log('Committing...');
  execSync('git commit -m "✨ feat: implement multi-stage login/logout flow and clarify misc fee labels"');
  console.log('Pushing...');
  execSync('git push');
  console.log('Success!');
} catch (e) {
  try {
      console.log('Pushing existing commits...');
      execSync('git push');
  } catch (err) {
      console.error('Final push failed:', err.message);
  }
}
