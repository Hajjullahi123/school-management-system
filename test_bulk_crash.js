
const prisma = require('./server/db');

async function testBulkReport() {
    const classId = 1; // JSS 1 (School 3)
    const termId = 1;  // First Term (School 3, Session 1)
    const schoolId = 3; // Amana Academy Model School

    console.log(`[TEST] Starting bulk report simulation for School ${schoolId}, Class ${classId}, Term ${termId}...`);

    try {
        const classInfo = await prisma.class.findUnique({
            where: { id: parseInt(classId) },
            include: { 
                classTeacher: { 
                    select: { firstName: true, lastName: true, signatureUrl: true } 
                } 
            }
        });

        if (!classInfo) {
            console.error('[TEST] Class not found');
            return;
        }

        const schoolSettings = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                gradingSystem: true,
                passThreshold: true,
                assignment1Weight: true,
                assignment2Weight: true,
                test1Weight: true,
                test2Weight: true,
                examWeight: true,
                principalSignatureUrl: true,
                weekendDays: true,
                showAttendanceOnReport: true,
                showPositionOnReport: true,
                showFeesOnReport: true,
                showPassFailStats: true,
                reportLayout: true,
                reportColorScheme: true,
                reportFontFamily: true,
                name: true,
                logoUrl: true,
                address: true,
                phone: true,
                email: true,
                motto: true
            }
        });

        const term = await prisma.term.findFirst({
            where: { id: parseInt(termId), schoolId: schoolId },
            include: { academicSession: true }
        });

        if (!term) {
            console.error('[TEST] Term not found');
            return;
        }

        const allTermsInSession = await prisma.term.findMany({
            where: { academicSessionId: term.academicSessionId, schoolId: schoolId },
            orderBy: { startDate: 'asc' }
        });
        const termIndex = allTermsInSession.findIndex(t => t.id === parseInt(termId));
        const termNumber = termIndex + 1;

        const nextTerm = await prisma.term.findFirst({
            where: { schoolId: schoolId, startDate: { gt: term.startDate } },
            orderBy: { startDate: 'asc' }
        });

        let students = await prisma.student.findMany({
            where: { classId: parseInt(classId), schoolId: schoolId, status: 'active' },
            include: {
                user: { select: { firstName: true, lastName: true, photoUrl: true } },
                classModel: {
                    include: { classTeacher: { select: { firstName: true, lastName: true, signatureUrl: true } } }
                }
            },
            orderBy: { admissionNumber: 'asc' }
        });

        const studentIds = students.map(s => s.id);
        const classSubjects = await prisma.classSubject.findMany({
            where: { classId: parseInt(classId), schoolId: schoolId },
            include: { subject: true }
        });

        const allResults = await prisma.result.findMany({
            where: { 
                studentId: { in: studentIds }, 
                termId: parseInt(termId), 
                schoolId: schoolId 
            },
            include: { subject: true }
        });

        const resultsSummary = await prisma.result.groupBy({
            by: ['studentId'],
            where: {
                classId: parseInt(classId), termId: parseInt(termId), schoolId: schoolId,
                student: { status: 'active' }
            },
            _sum: { totalScore: true },
            _count: { subjectId: true }
        });

        const sortedAverages = resultsSummary
            .map(entry => {
                const studentSubjCount = Math.max(classSubjects.length, entry._count.subjectId, 1);
                return { studentId: entry.studentId, average: (entry._sum.totalScore || 0) / studentSubjCount };
            })
            .sort((a, b) => b.average - a.average);

        const positionMap = {};
        let prevAvg = -1;
        let rank = 0;
        let currentPosition = 1;
        for (let i = 0; i < sortedAverages.length; i++) {
            rank++;
            if (sortedAverages[i].average !== prevAvg) {
                currentPosition = rank;
            }
            positionMap[sortedAverages[i].studentId] = currentPosition;
            prevAvg = sortedAverages[i].average;
        }
        const totalStudents = sortedAverages.length;

        const classAttendanceDays = await prisma.attendanceRecord.groupBy({
            by: ['date'],
            where: { schoolId: schoolId, classId: parseInt(classId), termId: parseInt(termId) }
        });
        const recordedAttendanceDays = classAttendanceDays.length;
        let totalAttendanceDays = recordedAttendanceDays;

        const attendanceMap = {};
        const totalRecordedMap = {};
        const absentMap = {};

        const allAttendance = await prisma.attendanceRecord.findMany({
            where: { schoolId: schoolId, classId: parseInt(classId), termId: parseInt(termId) }
        });

        allAttendance.forEach(att => {
            if (!totalRecordedMap[att.studentId]) totalRecordedMap[att.studentId] = 0;
            totalRecordedMap[att.studentId]++;
            
            if (att.status === 'present' || att.status === 'late') {
                if (!attendanceMap[att.studentId]) attendanceMap[att.studentId] = 0;
                attendanceMap[att.studentId]++;
            } else if (att.status === 'absent') {
                if (!absentMap[att.studentId]) absentMap[att.studentId] = 0;
                absentMap[att.studentId]++;
            }
        });

        const psychomotorDomains = await prisma.psychomotorDomain.findMany({
            where: { schoolId: schoolId, isActive: true },
            orderBy: { name: 'asc' }
        });

        const extrasMap = {};
        const allExtras = await prisma.studentReportCard.findMany({
            where: { schoolId: schoolId, termId: parseInt(termId), studentId: { in: studentIds } }
        });
        allExtras.forEach(e => extrasMap[e.studentId] = e);

        const allFeeRecords = await prisma.feeRecord.findMany({
            where: { schoolId: schoolId, studentId: { in: studentIds } },
            include: { Term: { select: { id: true, startDate: true } } }
        });

        const allFeeStructures = await prisma.classFeeStructure.findMany({
            where: { schoolId: schoolId, classId: parseInt(classId), academicSessionId: term.academicSessionId }
        });

        const feeMap = {};
        students.forEach(student => {
            const records = allFeeRecords.filter(r => r.studentId === student.id);
            const currentRecord = records.find(r => r.termId === parseInt(termId));
            const prevRecords = records.filter(r => r.Term?.startDate < term.startDate);
            const prevExpected = prevRecords.reduce((sum, r) => sum + (parseFloat(r.expectedAmount) || 0), 0);
            const prevPaid = prevRecords.reduce((sum, r) => sum + (parseFloat(r.paidAmount) || 0), 0);
            const previousOutstanding = prevExpected - prevPaid;
            const structure = allFeeStructures.find(f => f.termId === parseInt(termId));
            const defaultExpected = student.isScholarship ? 0 : (parseFloat(structure?.amount) || 0);

            const openingBalance = parseFloat(currentRecord?.openingBalance) || previousOutstanding;
            const currentTermFee = parseFloat(currentRecord?.expectedAmount) || defaultExpected;
            const totalExpected = openingBalance + currentTermFee;
            const totalPaid = parseFloat(currentRecord?.paidAmount) || 0;
            const currentBalance = currentRecord ? parseFloat(currentRecord.balance) : (totalExpected - totalPaid);

            feeMap[student.id] = {
                currentRecord: currentRecord || { id: null, expectedAmount: currentTermFee, paidAmount: 0, balance: currentBalance, isClearedForExam: false },
                openingBalance,
                previousOutstanding,
                currentTermFee,
                totalExpected,
                totalPaid,
                currentBalance,
                grandTotal: currentBalance,
                payments: [],
                expectedAmount: currentTermFee,
                balance: currentBalance,
                paidAmount: totalPaid
            };
        });

        const getGrade = (score, gradingSystem) => {
            let scale = [];
            try { scale = JSON.parse(gradingSystem); } catch (e) { return 'F'; }
            const found = scale.find(s => score >= s.min && score <= s.max);
            return found ? found.grade : 'F';
        };

        const getRemark = (grade, gradingSystem) => {
            let scale = [];
            try { scale = JSON.parse(gradingSystem); } catch (e) { return 'Fail'; }
            const found = scale.find(s => s.grade === grade);
            return found ? found.remark : 'Fail';
        };

        console.log(`[TEST] Mapping reports for ${students.length} students...`);

        const reports = students.map((student) => {
            try {
                const studentResults = allResults.filter(r => r.studentId === student.id);
                const studentSubjCount = Math.max(classSubjects.length, studentResults.length, 1);
                const reportExtras = extrasMap[student.id];
                const rawAverage = (studentResults.reduce((sum, r) => sum + (r.totalScore || 0), 0)) / studentSubjCount;
                const termAverage = isNaN(rawAverage) ? 0 : rawAverage;
                const termPosition = positionMap[student.id] || '-';

                let ratings = [];
                try {
                    const parsed = reportExtras?.psychomotorRatings ? JSON.parse(reportExtras.psychomotorRatings) : [];
                    ratings = Array.isArray(parsed) ? parsed : [];
                } catch (e) { ratings = []; }

                const feeSummary = feeMap[student.id];

                const studentAttendance = {
                    present: attendanceMap[student.id] || 0,
                    absent: absentMap[student.id] || 0,
                    unmarked: Math.max(0, totalAttendanceDays - (totalRecordedMap[student.id] || 0)),
                    total: totalAttendanceDays,
                    percentage: totalAttendanceDays > 0 ? (((attendanceMap[student.id] || 0) / totalAttendanceDays) * 100).toFixed(1) : 0
                };

                return {
                    student: {
                        id: student.id,
                        name: `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.name || 'Unknown',
                        admissionNumber: student.admissionNumber
                    },
                    termAverage,
                    termPosition
                };
            } catch (err) {
                console.error(`[TEST] Error processing student ${student.id}:`, err);
                throw err;
            }
        });

        console.log(`[TEST] Successfully generated ${reports.length} reports!`);
        process.exit(0);
    } catch (error) {
        console.error('[TEST] CRASH DETECTED:', error);
        process.exit(1);
    }
}

testBulkReport();
