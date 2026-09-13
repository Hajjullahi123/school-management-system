const prisma = require('./db');

async function check() {
  try {
    const settings = await prisma.globalSettings.findFirst();
    if (!settings) {
      console.log('No GlobalSettings found.');
    } else {
      console.log('GlobalSettings found:');
      console.log('ID:', settings.id);
      console.log('Paystack Key:', settings.platformPaystackKey ? 'PRESENT' : 'MISSING');
      console.log('Flutterwave Key:', settings.platformFlutterwaveKey ? 'PRESENT' : 'MISSING');
      console.log('Secret Key:', settings.platformSecretKey ? 'PRESENT' : 'MISSING');
      console.log('Prices:', settings.basicPrice, settings.standardPrice, settings.premiumPrice);
    }
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    process.exit(0);
  }
}

check();
