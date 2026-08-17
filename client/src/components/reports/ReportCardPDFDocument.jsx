import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 14,
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#000000',
    lineHeight: 1.15
  },
  outerBorder: {
    borderWidth: 3,
    borderColor: '#7c3aed',
    borderRadius: 8,
    padding: 8,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4
  },
  headerLogo: {
    width: 52,
    height: 52,
    objectFit: 'contain'
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8
  },
  schoolName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 1.5
  },
  schoolMotto: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Oblique',
    color: '#333333',
    marginBottom: 1.5,
    textTransform: 'uppercase'
  },
  schoolContact: {
    fontSize: 6.5,
    color: '#555555',
    marginBottom: 3
  },
  reportTitleContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#7c3aed',
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingBottom: 1
  },
  reportTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  photoBox: {
    width: 52,
    height: 58,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  photoPlaceholder: {
    fontSize: 6,
    color: '#999999',
    fontFamily: 'Helvetica-Bold'
  },

  /* Student Info Modern Cards */
  modernGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6
  },
  modernCard: {
    width: '32.4%',
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    padding: 3.5
  },
  modernLabel: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 1
  },
  modernValue: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase'
  },

  /* Classic Info Table */
  infoTable: {
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 6
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000'
  },
  infoRowLast: {
    flexDirection: 'row'
  },
  infoCellLabel: {
    width: '14%',
    padding: 2.5,
    backgroundColor: '#f1f5f9',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    borderRightWidth: 0.5,
    borderRightColor: '#000000'
  },
  infoCellValue: {
    width: '36%',
    padding: 2.5,
    fontSize: 7,
    fontFamily: 'Helvetica',
    borderRightWidth: 0.5,
    borderRightColor: '#000000'
  },
  infoCellValueLast: {
    width: '36%',
    padding: 2.5,
    fontSize: 7,
    fontFamily: 'Helvetica'
  },

  /* Academic & Psychomotor Layout */
  mainBody: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 5
  },
  academicColumn: {
    width: '69%'
  },
  psychomotorColumn: {
    width: '31%'
  },
  sectionBanner: {
    backgroundColor: '#000000',
    color: '#ffffff',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingVertical: 2,
    textTransform: 'uppercase'
  },
  table: {
    borderWidth: 1,
    borderColor: '#000000'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 14,
    alignItems: 'center'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    minHeight: 11.5,
    alignItems: 'center'
  },
  thSubject: { width: '38%', padding: 1.5, fontFamily: 'Helvetica-Bold', fontSize: 6 },
  thScore: { width: '7%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 5.5, borderLeftWidth: 0.5, borderLeftColor: '#000000' },
  thTotal: { width: '9%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 6, borderLeftWidth: 0.5, borderLeftColor: '#000000' },
  thGrade: { width: '8%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 6, borderLeftWidth: 0.5, borderLeftColor: '#000000' },
  thPos: { width: '7%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 5.5, borderLeftWidth: 0.5, borderLeftColor: '#000000' },
  thRemark: { width: '17%', padding: 1, fontFamily: 'Helvetica-Bold', fontSize: 5.5, borderLeftWidth: 0.5, borderLeftColor: '#000000' },

  tdSubject: { width: '38%', paddingHorizontal: 2, fontFamily: 'Helvetica-Bold', fontSize: 6.5, textTransform: 'uppercase' },
  tdScore: { width: '7%', textAlign: 'center', fontSize: 6.5, borderLeftWidth: 0.5, borderLeftColor: '#000000' },
  tdTotal: { width: '9%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 6.5, borderLeftWidth: 0.5, borderLeftColor: '#000000', backgroundColor: '#f8fafc' },
  tdGrade: { width: '8%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 6.5, borderLeftWidth: 0.5, borderLeftColor: '#000000' },
  tdPos: { width: '7%', textAlign: 'center', fontSize: 6, borderLeftWidth: 0.5, borderLeftColor: '#000000' },
  tdRemark: { width: '17%', paddingHorizontal: 1.5, fontSize: 5.5, fontFamily: 'Helvetica-Oblique', borderLeftWidth: 0.5, borderLeftColor: '#000000' },

  /* Psychomotor Table */
  thDomain: { width: '65%', padding: 1.5, fontFamily: 'Helvetica-Bold', fontSize: 6 },
  thDomainTick: { width: '7%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 5.5, borderLeftWidth: 0.5, borderLeftColor: '#000000' },
  tdDomain: { width: '65%', paddingHorizontal: 2, fontSize: 6, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  tdDomainTick: { width: '7%', textAlign: 'center', fontSize: 6, fontFamily: 'Helvetica-Bold', borderLeftWidth: 0.5, borderLeftColor: '#000000' },

  /* Summary Section: 3 Columns */
  summarySection: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4
  },
  legendBox: {
    width: '40%',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    padding: 3,
    backgroundColor: '#fafafa'
  },
  legendTitle: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    paddingBottom: 1,
    marginBottom: 2
  },
  legendText: {
    fontSize: 6,
    color: '#222222',
    lineHeight: 1.2
  },
  statusBox: {
    width: '35%',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'column'
  },
  statusHeader: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingVertical: 1.5,
    textTransform: 'uppercase'
  },
  statusRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    flex: 1
  },
  statusCell: {
    flex: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#000000'
  },
  statusCellLast: {
    flex: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusLabel: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#444444',
    textTransform: 'uppercase'
  },
  statusVal: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    marginTop: 0.5
  },
  overallGradeBox: {
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1.5
  },
  certBox: {
    width: '25%',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4
  },
  certText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    color: '#334155'
  },

  /* Financial Standing */
  feesBox: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    marginBottom: 4,
    backgroundColor: '#fdfdfd'
  },
  feesHeader: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingVertical: 1,
    textTransform: 'uppercase'
  },
  feesRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 4
  },
  feeCol: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#cccccc'
  },
  feeColLast: {
    flex: 1,
    alignItems: 'center'
  },
  feeLabel: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase'
  },
  feeValue: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    marginTop: 0.5
  },

  /* Remarks */
  remarksBox: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
    marginBottom: 4
  },
  remarksRow: {
    flexDirection: 'row'
  },
  remarkCol: {
    flex: 1,
    padding: 3,
    borderRightWidth: 0.5,
    borderRightColor: '#000000'
  },
  remarkColLast: {
    flex: 1,
    padding: 3
  },
  remarkTitle: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 1
  },
  remarkText: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Oblique',
    minHeight: 12,
    color: '#111111'
  },
  remarkFooter: {
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    paddingTop: 1.5,
    marginTop: 1.5,
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  /* Signatures */
  signaturesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 2
  },
  sigBox: {
    width: '45%',
    alignItems: 'center'
  },
  sigImage: {
    height: 18,
    objectFit: 'contain',
    marginBottom: 1
  },
  sigText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    marginBottom: 1
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    width: '80%',
    marginBottom: 1.5
  },
  sigLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase'
  },

  /* Footer verification banner */
  footerBanner: {
    marginTop: 3,
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    paddingTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerLeft: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    textTransform: 'uppercase'
  },
  footerRight: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase'
  }
});

const formatDateVerbose = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

const getStudentDisplayName = (student) => {
  if (!student) return 'Unknown Student';
  const fName = (student.user?.firstName || student.firstName || '').trim();
  const mName = (student.middleName || '').trim();
  const lName = (student.user?.lastName || student.lastName || '').trim();
  const legacyName = (student.name || '').trim();

  if (fName || lName) {
    return `${fName} ${mName} ${lName}`.replace(/\s+/g, ' ').trim().toUpperCase();
  }
  return (legacyName || mName || `Student (${student.admissionNumber || student.id})`).toUpperCase();
};

const getGradingScales = (schoolSettings) => {
  try {
    return JSON.parse(schoolSettings?.gradingSystem || '[]');
  } catch (e) {
    return [
      { grade: 'A', min: 70, max: 100 },
      { grade: 'B', min: 60, max: 69 },
      { grade: 'C', min: 50, max: 59 },
      { grade: 'D', min: 45, max: 49 },
      { grade: 'E', min: 40, max: 44 },
      { grade: 'F', min: 0, max: 39 }
    ];
  }
};

export const ReportCardPDFDocument = ({ reports = [], schoolSettings = {} }) => {
  const scales = getGradingScales(schoolSettings);
  const legendStr = scales
    .sort((a, b) => (b.min || 0) - (a.min || 0))
    .map(s => `${s.grade}: ${s.min}-${s.max || 100}`)
    .join('  |  ');

  return (
    <Document>
      {reports.map((data, index) => {
        if (!data || !data.student) return null;

        const student = data.student;
        const term = data.term || {};
        const subjects = data.subjects || [];
        const psychomotor = data.psychomotorRatings || [];
        const feeSummary = data.feeSummary;
        const showFees = data.reportSettings?.showFeesOnReport !== false && feeSummary;
        const showPosition = data.reportSettings?.showPositionOnReport !== false;
        const showAttendance = ((data.schoolSettings || schoolSettings)?.showAttendanceOnReport !== false) && (data.reportSettings?.showAttendanceOnReport !== false);
        const layout = data.reportSettings?.reportLayout || (data.schoolSettings || schoolSettings)?.reportLayout || 'modern';
        const reportColor = data.reportSettings?.reportColorScheme || (data.schoolSettings || schoolSettings)?.reportColorScheme || (data.schoolSettings || schoolSettings)?.primaryColor || '#7c3aed';

        const logoUrl = schoolSettings.logoUrl;
        const photoUrl = student.user?.photoUrl || student.photoUrl;
        const teacherSig = student.formMasterSignatureUrl;
        const principalSig = term.principalSignatureUrl || schoolSettings.principalSignatureUrl;

        return (
          <Page key={student.id || index} size="A4" style={styles.page}>
            <View style={[styles.outerBorder, { borderColor: layout !== 'minimal' ? reportColor : '#000000' }]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={{ width: 52, height: 52 }}>
                  {logoUrl ? (
                    <Image src={logoUrl} style={styles.headerLogo} />
                  ) : (
                    <View style={styles.photoPlaceholder}><Text>LOGO</Text></View>
                  )}
                </View>
                <View style={styles.headerCenter}>
                  <Text style={styles.schoolName}>{schoolSettings.schoolName || 'SCHOOL NAME'}</Text>
                  <Text style={styles.schoolMotto}>{schoolSettings.schoolMotto || 'Excellence and Dedication'}</Text>
                  <Text style={styles.schoolContact}>
                    {schoolSettings.address || 'Address'} | TEL: {schoolSettings.phone || '000'} | {schoolSettings.email || ''}
                  </Text>
                  <View style={[styles.reportTitleContainer, { borderBottomColor: reportColor }]}>
                    <Text style={styles.reportTitle}>
                      {term.name ? `${term.name.toUpperCase()} PERFORMANCE REPORT` : 'TERMINAL PERFORMANCE REPORT'}
                    </Text>
                  </View>
                </View>
                <View style={styles.photoBox}>
                  {photoUrl ? (
                    <Image src={photoUrl} style={styles.photo} />
                  ) : (
                    <Text style={styles.photoPlaceholder}>PHOTO</Text>
                  )}
                </View>
              </View>

              {/* Student Info: Modern Layout Cards */}
              {layout === 'modern' ? (
                <View style={styles.modernGrid}>
                  <View style={styles.modernCard}>
                    <Text style={styles.modernLabel}>FULL NAME</Text>
                    <Text style={styles.modernValue}>{getStudentDisplayName(student)}</Text>
                  </View>
                  <View style={styles.modernCard}>
                    <Text style={styles.modernLabel}>ADMISSION NO</Text>
                    <Text style={styles.modernValue}>{student.admissionNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.modernCard}>
                    <Text style={styles.modernLabel}>DATE OF BIRTH</Text>
                    <Text style={styles.modernValue}>{formatDateVerbose(student.dateOfBirth)}</Text>
                  </View>
                  <View style={styles.modernCard}>
                    <Text style={styles.modernLabel}>CLASS LEVEL</Text>
                    <Text style={styles.modernValue}>{student.class || data.className || 'N/A'}</Text>
                  </View>
                  <View style={styles.modernCard}>
                    <Text style={styles.modernLabel}>AGE / GENDER</Text>
                    <Text style={styles.modernValue}>{student.age || '-'} / {student.gender || '-'}</Text>
                  </View>
                  {showAttendance ? (
                    <View style={styles.modernCard}>
                      <Text style={styles.modernLabel}>ATTENDANCE</Text>
                      <Text style={styles.modernValue}>
                        {data.attendance ? `${data.attendance.present || 0}/${data.attendance.total || 0}` : 'N/A'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.modernCard}>
                      <Text style={styles.modernLabel}>SESSION / TERM</Text>
                      <Text style={styles.modernValue}>{term.session || '2025/2026'} - {term.name || 'TERM'}</Text>
                    </View>
                  )}
                </View>
              ) : (
                /* Classic Info Table */
                <View style={styles.infoTable}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoCellLabel}>NAME:</Text>
                    <Text style={[styles.infoCellValue, { fontFamily: 'Helvetica-Bold' }]}>{getStudentDisplayName(student)}</Text>
                    <Text style={styles.infoCellLabel}>GENDER:</Text>
                    <Text style={styles.infoCellValueLast}>{student.gender || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoCellLabel}>CLASS:</Text>
                    <Text style={styles.infoCellValue}>{student.class || data.className || 'N/A'}</Text>
                    <Text style={styles.infoCellLabel}>SESSION:</Text>
                    <Text style={styles.infoCellValueLast}>{term.session || data.sessionName || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoCellLabel}>ADM NO:</Text>
                    <Text style={styles.infoCellValue}>{student.admissionNumber || 'N/A'}</Text>
                    <Text style={styles.infoCellLabel}>D.O.B:</Text>
                    <Text style={styles.infoCellValueLast}>{formatDateVerbose(student.dateOfBirth)}</Text>
                  </View>
                  <View style={styles.infoRowLast}>
                    <Text style={styles.infoCellLabel}>ATTENDANCE:</Text>
                    <Text style={styles.infoCellValue}>
                      {data.attendance ? `${data.attendance.present || 0} / ${data.attendance.total || 0} DAYS (${data.attendance.percentage || 0}%)` : 'N/A'}
                    </Text>
                    <Text style={styles.infoCellLabel}>TERM:</Text>
                    <Text style={styles.infoCellValueLast}>{term.name || 'N/A'}</Text>
                  </View>
                </View>
              )}

              {/* Main Body: Academic (Left) + Psychomotor (Right) */}
              <View style={styles.mainBody}>
                {/* Academic Table */}
                <View style={styles.academicColumn}>
                  <Text style={styles.sectionBanner}>COGNITIVE DOMAIN PERFORMANCE</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={styles.thSubject}>SUBJECTS</Text>
                      <Text style={styles.thScore}>1ST CA{'\n'}{term.weights?.assignment1 || 5}</Text>
                      <Text style={styles.thScore}>2ND CA{'\n'}{term.weights?.assignment2 || 5}</Text>
                      <Text style={styles.thScore}>1ST TST{'\n'}{term.weights?.test1 || 10}</Text>
                      <Text style={styles.thScore}>2ND TST{'\n'}{term.weights?.test2 || 10}</Text>
                      <Text style={styles.thScore}>EXM{'\n'}{term.weights?.exam || 70}</Text>
                      <Text style={styles.thTotal}>TOT{'\n'}100</Text>
                      <Text style={styles.thGrade}>GRD</Text>
                      {showPosition && <Text style={styles.thPos}>POS</Text>}
                      <Text style={styles.thRemark}>REMARKS</Text>
                    </View>
                    {subjects.map((sub, sIdx) => (
                      <View key={sIdx} style={styles.tableRow}>
                        <Text style={styles.tdSubject}>{sub.name || ''}</Text>
                        <Text style={styles.tdScore}>{sub.assignment1 ?? ''}</Text>
                        <Text style={styles.tdScore}>{sub.assignment2 ?? ''}</Text>
                        <Text style={styles.tdScore}>{sub.test1 ?? ''}</Text>
                        <Text style={styles.tdScore}>{sub.test2 ?? ''}</Text>
                        <Text style={styles.tdScore}>{sub.exam ?? ''}</Text>
                        <Text style={styles.tdTotal}>{sub.total != null ? Number(sub.total).toFixed(0) : ''}</Text>
                        <Text style={styles.tdGrade}>{sub.grade || ''}</Text>
                        {showPosition && <Text style={styles.tdPos}>{sub.position || ''}</Text>}
                        <Text style={styles.tdRemark}>{sub.remark || ''}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Behavioral / Psychomotor Domains */}
                <View style={styles.psychomotorColumn}>
                  <Text style={styles.sectionBanner}>BEHAVIORAL DOMAINS</Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={styles.thDomain}>TRAIT</Text>
                      <Text style={styles.thDomainTick}>5</Text>
                      <Text style={styles.thDomainTick}>4</Text>
                      <Text style={styles.thDomainTick}>3</Text>
                      <Text style={styles.thDomainTick}>2</Text>
                      <Text style={styles.thDomainTick}>1</Text>
                    </View>
                    {psychomotor.slice(0, 10).map((trait, tIdx) => {
                      const score = Math.round(Number(trait.score) || 3);
                      return (
                        <View key={tIdx} style={styles.tableRow}>
                          <Text style={styles.tdDomain}>{trait.name}</Text>
                          <Text style={styles.tdDomainTick}>{score === 5 ? '✓' : ''}</Text>
                          <Text style={styles.tdDomainTick}>{score === 4 ? '✓' : ''}</Text>
                          <Text style={styles.tdDomainTick}>{score === 3 ? '✓' : ''}</Text>
                          <Text style={styles.tdDomainTick}>{score === 2 ? '✓' : ''}</Text>
                          <Text style={styles.tdDomainTick}>{score === 1 ? '✓' : ''}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Summary Section: 3 Boxes (Legend, Status Summary, Certification) */}
              <View style={styles.summarySection}>
                <View style={styles.legendBox}>
                  <Text style={styles.legendTitle}>Grading Legend</Text>
                  <Text style={styles.legendText}>{legendStr}</Text>
                  <Text style={[styles.legendText, { marginTop: 2, color: '#555555' }]}>
                    5: Exceptional | 4: Commendable | 3: Satisfactory | 2: Fair | 1: Poor
                  </Text>
                </View>

                <View style={styles.statusBox}>
                  <Text style={[styles.statusHeader, { backgroundColor: reportColor }]}>Status Summary</Text>
                  <View style={styles.statusRow}>
                    {showPosition && (
                      <View style={styles.statusCell}>
                        <Text style={styles.statusLabel}>Position</Text>
                        <Text style={styles.statusVal}>{data.termPosition || '-'} / {data.totalStudents || '-'}</Text>
                      </View>
                    )}
                    <View style={styles.statusCellLast}>
                      <Text style={styles.statusLabel}>Average</Text>
                      <Text style={styles.statusVal}>{data.termAverage != null ? `${Number(data.termAverage).toFixed(1)}%` : '-'}</Text>
                    </View>
                  </View>
                  <View style={styles.overallGradeBox}>
                    <Text style={[styles.statusLabel, { fontSize: 6.5 }]}>Overall Grade:</Text>
                    <Text style={[styles.statusVal, { fontSize: 9.5, color: reportColor }]}>{data.overallGrade || '-'}</Text>
                  </View>
                </View>

                <View style={styles.certBox}>
                  <Text style={styles.certText}>Official Result</Text>
                  <Text style={[styles.certText, { fontFamily: 'Helvetica', fontSize: 5, marginTop: 1 }]}>Certification</Text>
                </View>
              </View>

              {/* Financial Standing (if enabled) */}
              {showFees && (
                <View style={styles.feesBox}>
                  <Text style={[styles.feesHeader, { backgroundColor: reportColor }]}>Financial Standing & Fee Status</Text>
                  <View style={styles.feesRow}>
                    <View style={styles.feeCol}>
                      <Text style={styles.feeLabel}>Arrears</Text>
                      <Text style={styles.feeValue}>₦{Number(feeSummary.openingBalance || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.feeCol}>
                      <Text style={styles.feeLabel}>Term Fee</Text>
                      <Text style={styles.feeValue}>₦{Number(feeSummary.currentTermFee || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.feeCol}>
                      <Text style={styles.feeLabel}>Total Paid</Text>
                      <Text style={[styles.feeValue, { color: '#047857' }]}>₦{Number(feeSummary.totalPaid || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.feeColLast}>
                      <Text style={styles.feeLabel}>Balance Due</Text>
                      <Text style={[styles.feeValue, { color: feeSummary.grandTotal > 0 ? '#b91c1c' : '#047857' }]}>
                        ₦{Number(feeSummary.grandTotal || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Remarks */}
              <View style={styles.remarksBox}>
                <View style={styles.remarksRow}>
                  <View style={styles.remarkCol}>
                    <Text style={styles.remarkTitle}>Form Master's Remark</Text>
                    <Text style={styles.remarkText}>"{data.formMasterRemark || 'No specific remark recorded.'}"</Text>
                    <View style={styles.remarkFooter}>
                      <Text>Teacher: {student.formMaster || '......................'}</Text>
                      <Text style={{ color: '#047857' }}>[VERIFIED]</Text>
                    </View>
                  </View>
                  <View style={styles.remarkColLast}>
                    <Text style={styles.remarkTitle}>Principal's Remark</Text>
                    <Text style={styles.remarkText}>"{data.principalRemark || 'Satisfactory performance. Keep striving for excellence.'}"</Text>
                    <View style={styles.remarkFooter}>
                      <Text>Term Ends: {formatDateVerbose(term.endDate)}</Text>
                      <Text>Next Term: {formatDateVerbose(term.nextTermBegins)}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Signatures */}
              <View style={styles.signaturesSection}>
                <View style={styles.sigBox}>
                  {teacherSig ? (
                    <Image src={teacherSig} style={styles.sigImage} />
                  ) : student.formMaster ? (
                    <Text style={styles.sigText}>{student.formMaster}</Text>
                  ) : (
                    <View style={{ height: 18 }} />
                  )}
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Class Teacher's Signature</Text>
                </View>
                <View style={styles.sigBox}>
                  {principalSig ? (
                    <Image src={principalSig} style={styles.sigImage} />
                  ) : (
                    <View style={{ height: 18 }} />
                  )}
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Principal's Signature</Text>
                </View>
              </View>

              {/* Document Verification Footer */}
              <View style={styles.footerBanner}>
                <Text style={styles.footerLeft}>[DIGITALLY VERIFIED REPORT] AUTHENTIC EDUCATIONAL CREDENTIAL</Text>
                <Text style={styles.footerRight}>TERM: {term.name?.toUpperCase() || ''} • GEN: {formatDateVerbose(new Date())}</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default ReportCardPDFDocument;
