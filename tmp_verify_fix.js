const prisma = require('./server/db');

async function verifyFix() {
  try {
    // Simulate req.schoolId being a string (as it might come from JWT)
    const rawSchoolId = "1"; // Darul Quran (ID 1)
    const schoolId = parseInt(rawSchoolId);
    
    console.log(`Verifying School ID: ${schoolId}`);
    
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, weekendDays: true }
    });
    
    if (!school) {
      console.error('School not found!');
      return;
    }
    
    console.log(`School found: ${school.name}`);
    console.log(`Configured weekendDays: "${school.weekendDays}"`);
    
    // Test logic from attendance route
    const weekendDaysRaw = school.weekendDays ?? "0,6";
    const weekendIndices = weekendDaysRaw.split(',')
      .map(n => n.trim())
      .filter(n => n !== "")
      .map(n => parseInt(n));
    
    console.log(`Parsed weekendIndices: [${weekendIndices.join(', ')}]`);
    
    // Simulate March 29, 2026 (Sunday - index 0)
    const testDate = new Date('2026-03-29');
    const dayOfWeek = testDate.getDay();
    console.log(`Testing Date: ${testDate.toDateString()} (Day index: ${dayOfWeek})`);
    
    const isWeekend = weekendIndices.includes(dayOfWeek);
    console.log(`Is Weekend? ${isWeekend}`);
    
    if (schoolId === 1 && school.weekendDays === "0,6") {
       if (isWeekend) {
         console.log('--- TEST PASSED: Sunday is a weekend for ID 1 (standard 0,6) ---');
       }
    }
    
    // Now let's try with a custom string
    const mockSchool = { weekendDays: "1,2,3" };
    const mockDaysRaw = mockSchool.weekendDays ?? "0,6";
    const mockIndices = mockDaysRaw.split(',').map(n => n.trim()).filter(n => n !== "").map(n => parseInt(n));
    console.log(`Mock indices (1,2,3): [${mockIndices.join(', ')}]`);
    console.log(`Is Sunday (0) a weekend for mock? ${mockIndices.includes(0)}`);
    console.log(`Is Monday (1) a weekend for mock? ${mockIndices.includes(1)}`);

  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

verifyFix();
