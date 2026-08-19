import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font, Svg, Path } from '@react-pdf/renderer';

/* ──────────────────────────────────────────────────────────
   FONT REGISTRATION
   - Noto Sans: Latin text, numbers, and common symbols
   - Noto Naskh Arabic: Arabic script (with Latin fallback)
   Fonts are loaded from public/fonts/ for offline reliability.
   ────────────────────────────────────────────────────────── */

const getFontUrl = (fontPath) => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return `${window.location.origin}${fontPath}`;
  }
  return fontPath;
};

// Safe image URL resolver
export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

  const base = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin
    : '';
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${cleanPath}`;
};

Font.register({
  family: 'Noto Naskh Arabic',
  src: getFontUrl('/fonts/NotoNaskhArabic-Regular.woff')
});

// Disable automatic hyphenation (prevents broken text fragments)
Font.registerHyphenationCallback(word => [word]);

/* ──────────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────────── */

// Detect Arabic characters in a string
const containsArabic = (text) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(text || ''));

// SVG Checkmark component — font-independent, always renders crisp
const CheckMark = () => (
  <Svg width={7} height={7} viewBox="0 0 24 24">
    <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#000000" />
  </Svg>
);

const formatDateVerbose = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).toUpperCase();
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  } catch (e) {
    return String(dateStr).toUpperCase();
  }
};

const getStudentDisplayName = (student) => {
  if (!student) return 'UNKNOWN STUDENT';
  const fName = (student.user?.firstName || student.firstName || '').trim();
  const mName = (student.middleName || '').trim();
  const lName = (student.user?.lastName || student.lastName || '').trim();
  const legacyName = (student.name || '').trim();

  if (fName || lName) {
    return `${fName} ${mName} ${lName}`.replace(/\s+/g, ' ').trim().toUpperCase();
  }
  return (legacyName || mName || `STUDENT (${student.admissionNumber || student.id})`).toUpperCase();
};

const getTraitScore = (trait) => {
  if (!trait) return 3;
  const raw = trait.score !== undefined && trait.score !== null ? trait.score : (trait.rating !== undefined && trait.rating !== null ? trait.rating : trait.value);
  const num = parseFloat(raw);
  return (!isNaN(num) && num > 0) ? Math.round(num) : 3;
};

const getGradingScales = (schoolSettings) => {
  try {
    const parsed = JSON.parse(schoolSettings?.gradingSystem || '[]');
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [
      { grade: 'A', min: 70, max: 100 },
      { grade: 'B', min: 60, max: 69 },
      { grade: 'C', min: 50, max: 59 },
      { grade: 'D', min: 45, max: 49 },
      { grade: 'E', min: 40, max: 44 },
      { grade: 'F', min: 0, max: 39 }
    ];
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

/* ──────────────────────────────────────────────────────────
   SmartText — renders with Noto Naskh Arabic if text has Arabic
   ────────────────────────────────────────────────────────── */
const SmartText = ({ style, children, ...props }) => {
  const text = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : '');
  const isArabic = containsArabic(text);
  return (
    <Text style={[style, isArabic ? { fontFamily: 'Noto Naskh Arabic' } : {}]} {...props}>
      {children}
    </Text>
  );
};

/* ──────────────────────────────────────────────────────────
   STYLESHEET
   Carefully proportioned to fill a full A4 sheet (297mm height)
   ────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  page: {
    padding: 12,
    fontSize: 8,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#000000',
    lineHeight: 1.15
  },
  outerBorder: {
    padding: 8,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  watermark: {
    position: 'absolute',
    top: 220,
    left: 130,
    width: 330,
    height: 330,
    opacity: 0.04,
    zIndex: -1
  },

  /* Header Section */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingBottom: 2
  },
  headerLogo: {
    width: 58,
    height: 58,
    objectFit: 'contain'
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: 2,
    textAlign: 'center'
  },
  schoolMotto: {
    fontSize: 8,
    fontStyle: 'italic',
    color: '#333333',
    marginBottom: 2,
    textTransform: 'uppercase',
    textAlign: 'center'
  },
  schoolContact: {
    fontSize: 6.8,
    color: '#444444',
    marginBottom: 3,
    textAlign: 'center'
  },
  reportTitleContainer: {
    borderBottomWidth: 2,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingBottom: 1
  },
  reportTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  photoBox: {
    width: 58,
    height: 66,
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
    fontSize: 7,
    color: '#999999',
    fontWeight: 700
  },

  /* Student Info Table: Classic Layout */
  infoTable: {
    borderWidth: 1.5,
    borderColor: '#000000',
    marginBottom: 5
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 13,
    alignItems: 'center'
  },
  infoRowLast: {
    flexDirection: 'row',
    minHeight: 13,
    alignItems: 'center'
  },
  infoCellLabel: {
    width: '13%',
    paddingVertical: 2,
    paddingHorizontal: 3,
    fontWeight: 700,
    fontSize: 6.8,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    color: '#000000'
  },
  infoCellValue: {
    width: '37%',
    paddingVertical: 2,
    paddingHorizontal: 4,
    fontSize: 7.8,
    fontWeight: 700,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    color: '#000000'
  },
  infoCellValueLast: {
    width: '37%',
    paddingVertical: 2,
    paddingHorizontal: 4,
    fontSize: 7.8,
    fontWeight: 700,
    color: '#000000'
  },

  /* Student Info: Modern Cards Layout */
  modernGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 5
  },
  modernCard: {
    width: '32.4%',
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    padding: 4
  },
  modernLabel: {
    fontSize: 6,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 1
  },
  modernValue: {
    fontSize: 7.5,
    fontWeight: 700,
    color: '#0f172a',
    textTransform: 'uppercase'
  },

  /* Main Body: Academic (68%) + Behavioral (31%) */
  mainBody: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 4
  },
  academicColumn: {
    width: '68.5%'
  },
  behavioralColumn: {
    width: '31.5%'
  },
  sectionBanner: {
    backgroundColor: '#000000',
    color: '#ffffff',
    fontSize: 7.8,
    fontWeight: 700,
    textAlign: 'center',
    paddingVertical: 2.5,
    textTransform: 'uppercase',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderBottomWidth: 0
  },
  table: {
    borderWidth: 1.5,
    borderColor: '#000000'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    minHeight: 16,
    alignItems: 'center'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderBottomColor: '#000000',
    minHeight: 12.5,
    alignItems: 'center'
  },

  /* Academic Columns */
  thSubject: { width: '30%', paddingHorizontal: 2, fontWeight: 700, fontSize: 6.8, textTransform: 'uppercase' },
  thScore: { width: '7%', textAlign: 'center', fontWeight: 700, fontSize: 5.5, borderLeftWidth: 0.8, borderLeftColor: '#000000' },
  thTotal: { width: '8.5%', textAlign: 'center', fontWeight: 700, fontSize: 6.8, borderLeftWidth: 0.8, borderLeftColor: '#000000' },
  thGrade: { width: '7%', textAlign: 'center', fontWeight: 700, fontSize: 6.8, borderLeftWidth: 0.8, borderLeftColor: '#000000' },
  thPos: { width: '6.5%', textAlign: 'center', fontWeight: 700, fontSize: 6, borderLeftWidth: 0.8, borderLeftColor: '#000000' },
  thRemark: { width: '13%', paddingHorizontal: 1, fontWeight: 700, fontSize: 6, borderLeftWidth: 0.8, borderLeftColor: '#000000' },

  tdSubject: { width: '30%', paddingHorizontal: 2, fontWeight: 700, fontSize: 7.2, textTransform: 'uppercase' },
  tdScore: { width: '7%', textAlign: 'center', fontSize: 7, borderLeftWidth: 0.8, borderLeftColor: '#000000' },
  tdTotal: { width: '8.5%', textAlign: 'center', fontWeight: 700, fontSize: 7.2, borderLeftWidth: 0.8, borderLeftColor: '#000000', backgroundColor: '#f9fafb' },
  tdGrade: { width: '7%', textAlign: 'center', fontWeight: 700, fontSize: 7.2, borderLeftWidth: 0.8, borderLeftColor: '#000000' },
  tdPos: { width: '6.5%', textAlign: 'center', fontSize: 6.5, borderLeftWidth: 0.8, borderLeftColor: '#000000' },
  tdRemark: { width: '13%', paddingHorizontal: 1.5, fontSize: 5.8, fontStyle: 'italic', borderLeftWidth: 0.8, borderLeftColor: '#000000' },

  /* Behavioral Domain Columns */
  thDomain: { width: '55%', paddingHorizontal: 2, fontWeight: 700, fontSize: 6.5, textTransform: 'uppercase' },
  thDomainTick: { width: '9%', textAlign: 'center', fontWeight: 700, fontSize: 6.5, borderLeftWidth: 0.8, borderLeftColor: '#000000' },
  tdDomain: { width: '55%', paddingHorizontal: 2, fontSize: 6.8, fontWeight: 700, textTransform: 'uppercase' },
  tdDomainTick: { width: '9%', textAlign: 'center', fontSize: 6.5, borderLeftWidth: 0.8, borderLeftColor: '#000000', alignItems: 'center', justifyContent: 'center' },

  /* Summary Section */
  summarySection: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4
  },
  legendBox: {
    width: '40%',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 4,
    padding: 4,
    backgroundColor: '#fafafa'
  },
  legendTitle: {
    fontSize: 7.2,
    fontWeight: 700,
    textTransform: 'uppercase',
    borderBottomWidth: 0.8,
    borderBottomColor: '#000000',
    paddingBottom: 1.5,
    marginBottom: 2
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2
  },
  legendItem: {
    width: '48%',
    fontSize: 6.8,
    fontWeight: 700
  },
  legendSubtext: {
    fontSize: 6,
    color: '#444444',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 1.5,
    marginTop: 2
  },

  statusBox: {
    width: '36%',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'column'
  },
  statusHeader: {
    color: '#ffffff',
    fontSize: 7.2,
    fontWeight: 700,
    textAlign: 'center',
    paddingVertical: 1.5,
    textTransform: 'uppercase'
  },
  statusRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderBottomColor: '#000000',
    flex: 1
  },
  statusCell: {
    flex: 1,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.8,
    borderRightColor: '#000000'
  },
  statusCellLast: {
    flex: 1,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusLabel: {
    fontSize: 6,
    fontWeight: 700,
    color: '#444444',
    textTransform: 'uppercase'
  },
  statusVal: {
    fontSize: 8.5,
    fontWeight: 700,
    marginTop: 0.5
  },
  passFailRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderBottomColor: '#000000',
    backgroundColor: '#ffffff'
  },
  passFailCell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRightWidth: 0.8,
    borderRightColor: '#000000',
    alignItems: 'center'
  },
  passFailCellLast: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    alignItems: 'center'
  },
  passFailLabel: {
    fontSize: 5.5,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#000000'
  },
  passFailVal: {
    fontSize: 6.5,
    fontWeight: 700
  },
  overallGradeBox: {
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2
  },

  certBox: {
    width: '24%',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4
  },
  certText: {
    fontSize: 6.8,
    fontWeight: 700,
    textAlign: 'center',
    textTransform: 'uppercase',
    color: '#1e293b'
  },

  /* Financial Standing */
  feesBox: {
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 4,
    marginBottom: 4,
    backgroundColor: '#fdfdfd',
    overflow: 'hidden'
  },
  feesHeader: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: 700,
    textAlign: 'center',
    paddingVertical: 1.5,
    textTransform: 'uppercase'
  },
  feesRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4
  },
  feeCol: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 0.8,
    borderRightColor: '#e2e8f0'
  },
  feeColLast: {
    flex: 1,
    alignItems: 'center'
  },
  feeLabel: {
    fontSize: 6,
    fontWeight: 700,
    color: '#444444',
    textTransform: 'uppercase'
  },
  feeValue: {
    fontSize: 8.5,
    fontWeight: 700,
    marginTop: 1
  },

  /* Remarks */
  remarksBox: {
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 4,
    marginBottom: 3,
    overflow: 'hidden'
  },
  remarksRow: {
    flexDirection: 'row'
  },
  remarkCol: {
    flex: 1,
    padding: 4,
    borderRightWidth: 1.5,
    borderRightColor: '#000000'
  },
  remarkColLast: {
    flex: 1,
    padding: 4
  },
  remarkTitle: {
    fontSize: 7.2,
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: 2
  },
  remarkText: {
    fontSize: 7.2,
    fontStyle: 'italic',
    minHeight: 16,
    color: '#000000',
    lineHeight: 1.2
  },
  remarkFooter: {
    borderTopWidth: 0.8,
    borderTopColor: '#e2e8f0',
    paddingTop: 2,
    marginTop: 2,
    fontSize: 6.5,
    fontWeight: 700,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  /* Signatures */
  signaturesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 1
  },
  sigBox: {
    width: '45%',
    alignItems: 'center'
  },
  sigImage: {
    height: 22,
    objectFit: 'contain',
    marginBottom: 1
  },
  sigText: {
    fontSize: 9,
    fontStyle: 'italic',
    marginBottom: 1
  },
  sigLine: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    width: '85%',
    marginBottom: 2
  },
  sigLabel: {
    fontSize: 6.8,
    fontWeight: 700,
    textTransform: 'uppercase'
  },

  /* Footer verification banner */
  footerBanner: {
    marginTop: 3,
    borderTopWidth: 0.8,
    borderTopColor: '#e2e8f0',
    paddingTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerLeft: {
    fontSize: 6,
    fontWeight: 700,
    color: '#059669',
    textTransform: 'uppercase'
  },
  footerRight: {
    fontSize: 6,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase'
  }
});

/* ──────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────── */
export const ReportCardPDFDocument = ({ reports = [], schoolSettings = {} }) => {
  const scales = getGradingScales(schoolSettings);

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
        const showPosition = data.reportSettings?.showPositionOnReport !== false && (data.schoolSettings || schoolSettings)?.showPositionOnReport !== false;
        const showAttendance = ((data.schoolSettings || schoolSettings)?.showAttendanceOnReport !== false) && (data.reportSettings?.showAttendanceOnReport !== false);
        
        // Layout: Strictly default to 'classic' to mirror web behavior
        const layout = data.reportSettings?.reportLayout || (data.schoolSettings || schoolSettings)?.reportLayout || 'classic';
        const reportColor = data.reportSettings?.reportColorScheme || (data.schoolSettings || schoolSettings)?.reportColorScheme || (data.schoolSettings || schoolSettings)?.primaryColor || '#1e40af';

        const logoUrl = resolveImageUrl(schoolSettings.logoUrl);
        const photoUrl = resolveImageUrl(student.user?.photoUrl || student.photoUrl);
        const teacherSig = resolveImageUrl(student.formMasterSignatureUrl);
        const principalSig = resolveImageUrl(term.principalSignatureUrl || schoolSettings.principalSignatureUrl);

        const studentName = getStudentDisplayName(student);
        const className = (student.class || data.className || 'N/A').toUpperCase();

        // Frame border styling based on template
        const frameBorderWidth = layout === 'minimal' ? 1.5 : layout === 'modern' ? 4 : 8;
        const frameBorderRadius = layout === 'modern' ? 14 : 0;
        const frameBorderColor = layout === 'minimal' ? '#9ca3af' : reportColor;

        return (
          <Page key={student.id || index} size="A4" style={styles.page}>
            {logoUrl && (
              <Image src={logoUrl} style={styles.watermark} />
            )}

            <View style={[styles.outerBorder, { borderWidth: frameBorderWidth, borderRadius: frameBorderRadius, borderColor: frameBorderColor }]}>
              {/* Header Section */}
              <View style={styles.header}>
                <View style={{ width: 58, height: 58 }}>
                  {logoUrl ? (
                    <Image src={logoUrl} style={styles.headerLogo} />
                  ) : (
                    <View style={styles.photoPlaceholder}><Text>LOGO</Text></View>
                  )}
                </View>
                <View style={styles.headerCenter}>
                  <SmartText style={styles.schoolName}>{schoolSettings.schoolName || 'SCHOOL NAME'}</SmartText>
                  <SmartText style={styles.schoolMotto}>{schoolSettings.schoolMotto || 'Excellence and Dedication'}</SmartText>
                  <Text style={styles.schoolContact}>
                    {schoolSettings.address || 'Address'} | TEL: {schoolSettings.phone || '000'} | {schoolSettings.email || ''}
                  </Text>
                  <View style={[styles.reportTitleContainer, { borderBottomColor: layout !== 'minimal' ? reportColor : '#000000' }]}>
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

              {/* Student Info: Modern Layout vs Classic/Minimal 5-Row Table */}
              {layout === 'modern' ? (
                <View style={styles.modernGrid}>
                  <View style={styles.modernCard}>
                    <Text style={styles.modernLabel}>FULL NAME</Text>
                    <SmartText style={styles.modernValue}>{studentName}</SmartText>
                  </View>
                  <View style={styles.modernCard}>
                    <Text style={styles.modernLabel}>ADMISSION NO</Text>
                    <Text style={styles.modernValue}>{(student.admissionNumber || 'N/A').toUpperCase()}</Text>
                  </View>
                  <View style={styles.modernCard}>
                    <Text style={styles.modernLabel}>DATE OF BIRTH</Text>
                    <Text style={styles.modernValue}>{formatDateVerbose(student.dateOfBirth)}</Text>
                  </View>
                  <View style={styles.modernCard}>
                    <Text style={styles.modernLabel}>CLASS LEVEL</Text>
                    <SmartText style={styles.modernValue}>{className}</SmartText>
                  </View>
                  <View style={styles.modernCard}>
                    <Text style={styles.modernLabel}>AGE / GENDER</Text>
                    <Text style={styles.modernValue}>{student.age || '-'} / {(student.gender || '-').toUpperCase()}</Text>
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
                      <Text style={styles.modernValue}>{(term.session || '2025/2026').toUpperCase()} - {(term.name || 'TERM').toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              ) : (
                /* Classic & Minimal 5-Row Info Table (100% match with Web Table) */
                <View style={styles.infoTable}>
                  {/* Row 1: Name & Gender */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoCellLabel}>NAME:</Text>
                    <SmartText style={styles.infoCellValue}>{studentName}</SmartText>
                    <Text style={styles.infoCellLabel}>GENDER:</Text>
                    <Text style={styles.infoCellValueLast}>{(student.gender || 'N/A').toUpperCase()}</Text>
                  </View>
                  {/* Row 2: Class & Session */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoCellLabel}>CLASS:</Text>
                    <SmartText style={styles.infoCellValue}>{className}</SmartText>
                    <Text style={styles.infoCellLabel}>SESSION:</Text>
                    <Text style={styles.infoCellValueLast}>{(term.session || data.sessionName || 'N/A').toUpperCase()}</Text>
                  </View>
                  {/* Row 3: Adm No & DOB */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoCellLabel}>ADM NO:</Text>
                    <Text style={styles.infoCellValue}>{(student.admissionNumber || 'N/A').toUpperCase()}</Text>
                    <Text style={styles.infoCellLabel}>D.O.B:</Text>
                    <Text style={styles.infoCellValueLast}>{formatDateVerbose(student.dateOfBirth)}</Text>
                  </View>
                  {/* Row 4: Age & Club */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoCellLabel}>AGE:</Text>
                    <Text style={styles.infoCellValue}>{(student.age || '-').toUpperCase()}</Text>
                    <Text style={styles.infoCellLabel}>CLUB:</Text>
                    <Text style={styles.infoCellValueLast}>{(student.clubs && student.clubs !== 'None Assigned' ? student.clubs : 'N/A').toUpperCase()}</Text>
                  </View>
                  {/* Row 5: Attendance & Term */}
                  {showAttendance ? (
                    <View style={styles.infoRowLast}>
                      <Text style={styles.infoCellLabel}>ATTENDANCE:</Text>
                      <Text style={styles.infoCellValue}>
                        {data.attendance ? `${data.attendance.present || 0} / ${data.attendance.total || 0} DAYS (${data.attendance.percentage || 0}%)` : 'N/A'}
                      </Text>
                      <Text style={styles.infoCellLabel}>TERM:</Text>
                      <Text style={styles.infoCellValueLast}>{(term.name || 'N/A').toUpperCase()}</Text>
                    </View>
                  ) : (
                    <View style={styles.infoRowLast}>
                      <Text style={styles.infoCellLabel}>TERM:</Text>
                      <Text style={[styles.infoCellValueLast, { width: '87%' }]}>{(term.name || 'N/A').toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Main Body: Academic (Cognitive) + Behavioral (Psychomotor) */}
              <View style={styles.mainBody}>
                {/* Academic Table */}
                <View style={styles.academicColumn}>
                  <Text style={[styles.sectionBanner, { backgroundColor: layout === 'modern' ? reportColor : '#000000' }]}>
                    COGNITIVE DOMAIN PERFORMANCE
                  </Text>
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
                        <SmartText style={styles.tdSubject}>{sub.name || ''}</SmartText>
                        <Text style={styles.tdScore}>{sub.assignment1 ?? ''}</Text>
                        <Text style={styles.tdScore}>{sub.assignment2 ?? ''}</Text>
                        <Text style={styles.tdScore}>{sub.test1 ?? ''}</Text>
                        <Text style={styles.tdScore}>{sub.test2 ?? ''}</Text>
                        <Text style={styles.tdScore}>{sub.exam ?? ''}</Text>
                        <Text style={styles.tdTotal}>{sub.total != null ? Number(sub.total).toFixed(0) : ''}</Text>
                        <Text style={styles.tdGrade}>{sub.grade || ''}</Text>
                        {showPosition && <Text style={styles.tdPos}>{sub.position || ''}</Text>}
                        <Text style={styles.tdRemark}>{(sub.remark || '').toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Behavioral / Psychomotor Domains */}
                <View style={styles.behavioralColumn}>
                  <Text style={[styles.sectionBanner, { backgroundColor: layout === 'modern' ? reportColor : '#000000' }]}>
                    BEHAVIORAL DOMAINS
                  </Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={styles.thDomain}></Text>
                      <Text style={styles.thDomainTick}>5</Text>
                      <Text style={styles.thDomainTick}>4</Text>
                      <Text style={styles.thDomainTick}>3</Text>
                      <Text style={styles.thDomainTick}>2</Text>
                      <Text style={styles.thDomainTick}>1</Text>
                    </View>
                    {psychomotor.slice(0, 10).map((trait, tIdx) => {
                      const score = getTraitScore(trait);
                      return (
                        <View key={tIdx} style={styles.tableRow}>
                          <SmartText style={styles.tdDomain}>{trait.name}</SmartText>
                          <View style={styles.tdDomainTick}>{score === 5 ? <CheckMark /> : <Text> </Text>}</View>
                          <View style={styles.tdDomainTick}>{score === 4 ? <CheckMark /> : <Text> </Text>}</View>
                          <View style={styles.tdDomainTick}>{score === 3 ? <CheckMark /> : <Text> </Text>}</View>
                          <View style={styles.tdDomainTick}>{score === 2 ? <CheckMark /> : <Text> </Text>}</View>
                          <View style={styles.tdDomainTick}>{score === 1 ? <CheckMark /> : <Text> </Text>}</View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Summary Section: Grading Legend, Status Summary, Certification */}
              <View style={styles.summarySection}>
                <View style={styles.legendBox}>
                  <Text style={styles.legendTitle}>Grading Legend</Text>
                  <View style={styles.legendGrid}>
                    {scales
                      .sort((a, b) => (b.min || 0) - (a.min || 0))
                      .map(s => (
                        <Text key={s.grade} style={styles.legendItem}>
                          {s.grade}: {s.min}-{s.max || 100}
                        </Text>
                      ))}
                  </View>
                  <Text style={styles.legendSubtext}>
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
                  {data.passFailSummary?.show && (
                    <View style={styles.passFailRow}>
                      <View style={styles.passFailCell}>
                        <Text style={styles.passFailLabel}>Passed</Text>
                        <Text style={[styles.passFailVal, { color: '#047857' }]}>{data.passFailSummary.totalPassed ?? 0}</Text>
                      </View>
                      <View style={styles.passFailCellLast}>
                        <Text style={styles.passFailLabel}>Failed</Text>
                        <Text style={[styles.passFailVal, { color: '#dc2626' }]}>{data.passFailSummary.totalFailed ?? 0}</Text>
                      </View>
                    </View>
                  )}
                  <View style={[styles.overallGradeBox, { backgroundColor: `${reportColor}15` }]}>
                    <Text style={[styles.statusLabel, { fontSize: 7, color: '#000000' }]}>Overall Grade:</Text>
                    <Text style={[styles.statusVal, { fontSize: 13, color: reportColor }]}>{data.overallGrade || '-'}</Text>
                  </View>
                </View>

                <View style={styles.certBox}>
                  <Text style={styles.certText}>Official Result</Text>
                  <Text style={[styles.certText, { fontWeight: 400, fontSize: 5.5, marginTop: 1 }]}>Certification</Text>
                </View>
              </View>

              {/* Financial Standing (if enabled) */}
              {showFees && (
                <View style={styles.feesBox}>
                  <Text style={[styles.feesHeader, { backgroundColor: reportColor }]}>Financial Standing & Fee Status</Text>
                  <View style={styles.feesRow}>
                    <View style={styles.feeCol}>
                      <Text style={styles.feeLabel}>Arrears (Opening)</Text>
                      <Text style={[styles.feeValue, { color: feeSummary.openingBalance > 0 ? '#dc2626' : '#000000' }]}>
                        {'\u20A6'}{Number(feeSummary.openingBalance || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.feeCol}>
                      <Text style={styles.feeLabel}>Current Term Fee</Text>
                      <Text style={styles.feeValue}>{'\u20A6'}{Number(feeSummary.currentTermFee || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.feeCol}>
                      <Text style={styles.feeLabel}>Total Paid</Text>
                      <Text style={[styles.feeValue, { color: '#047857' }]}>{'\u20A6'}{Number(feeSummary.totalPaid || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.feeColLast}>
                      <Text style={styles.feeLabel}>Outstanding Balance</Text>
                      <Text style={[styles.feeValue, { color: feeSummary.grandTotal > 0 ? '#dc2626' : '#047857' }]}>
                        {'\u20A6'}{Number(feeSummary.grandTotal || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Remarks Section */}
              <View style={styles.remarksBox}>
                <View style={styles.remarksRow}>
                  <View style={styles.remarkCol}>
                    <Text style={styles.remarkTitle}>Form Master's Remark</Text>
                    <SmartText style={styles.remarkText}>"{data.formMasterRemark || 'No specific remark recorded.'}"</SmartText>
                    <View style={styles.remarkFooter}>
                      <Text>Name: {(student.formMaster || '......................').toUpperCase()}</Text>
                      <Text style={{ color: '#047857' }}>[VERIFIED]</Text>
                    </View>
                  </View>
                  <View style={styles.remarkColLast}>
                    <Text style={styles.remarkTitle}>Principal's Remark</Text>
                    <SmartText style={styles.remarkText}>"{data.principalRemark || 'Satisfactory performance. Keep striving for excellence.'}"</SmartText>
                    <View style={styles.remarkFooter}>
                      <Text>Term Ends: {data.term?.endDate ? formatDateVerbose(data.term.endDate) : '....................'}</Text>
                      <Text>Next Term Begins: {data.term?.nextTermBegins ? formatDateVerbose(data.term.nextTermBegins) : '....................'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Signatures Section */}
              <View style={styles.signaturesSection}>
                <View style={styles.sigBox}>
                  {teacherSig ? (
                    <Image src={teacherSig} style={styles.sigImage} />
                  ) : student.formMaster ? (
                    <Text style={styles.sigText}>{student.formMaster}</Text>
                  ) : (
                    <View style={{ height: 20 }} />
                  )}
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Class Teacher's Signature</Text>
                </View>
                <View style={styles.sigBox}>
                  {principalSig ? (
                    <Image src={principalSig} style={styles.sigImage} />
                  ) : (
                    <View style={{ height: 20 }} />
                  )}
                  <View style={styles.sigLine} />
                  <Text style={styles.sigLabel}>Principal's Signature</Text>
                </View>
              </View>

              {/* Document Verification Footer */}
              <View style={styles.footerBanner}>
                <Text style={styles.footerLeft}>[DIGITALLY VERIFIED REPORT] AUTHENTIC EDUCATIONAL CREDENTIAL</Text>
                <Text style={styles.footerRight}>TERM: {(term.name || '').toUpperCase()} {'\u2022'} GEN: {formatDateVerbose(new Date())}</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default ReportCardPDFDocument;
