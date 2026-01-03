const bcrypt = require('bcryptjs');

async function test() {
  const password = 'password123';
  const hash = await bcrypt.hash(password, 12);
  console.log('Hash:', hash);
  const isValid = await bcrypt.compare(password, hash);
  console.log('Is valid:', isValid);

  const isValidWrong = await bcrypt.compare('wrong', hash);
  console.log('Is valid wrong:', isValidWrong);
}

test();
