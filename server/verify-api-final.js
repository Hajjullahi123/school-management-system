// Using native fetch in Node 22
async function test() {
  console.log('Testing /api/public/global-settings...');
  try {
    const res = await fetch('http://localhost:5000/api/public/global-settings');
    const data = await res.json();
    console.log('✅ Success! Global settings:', data);
  } catch (e) {
    console.error('❌ Failed fetching global settings:', e.message);
  }

  console.log('Testing /api/settings?schoolSlug=amana-academy...');
  try {
    const res = await fetch('http://localhost:5000/api/settings?schoolSlug=amana-academy');
    const data = await res.json();
    console.log('✅ Success! School settings for amana-academy:', data.name || data.schoolName);
  } catch (e) {
    console.error('❌ Failed fetching school settings:', e.message);
  }
}

test();
