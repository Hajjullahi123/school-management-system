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
        const attendance = data.attendance || { present: 0, total: 0, percentage: 0 };
        
        // Layout: Strictly default to 'classic' to mirror web behavior
        const layoutRawDB = data.student?.classModel?.reportLayout || data.reportSettings?.reportLayout || (data.schoolSettings || schoolSettings)?.reportLayout || 'classic';
        const isEarlyYears = layoutRawDB.startsWith('early_years') || /early|nursery|kg|kindergarten|reception|playgroup|toddler|creche|pre-k|ركن|الركن|روضة|الروضة|تمهيدي|حضانة/i.test(student.class || data.className || '');
        // Strip page-format suffix so layoutRaw never encodes the page count
        const layoutRaw = isEarlyYears ? 'early_years' : layoutRawDB;
        const layout = layoutRaw;
        
        const reportColor = data.reportSettings?.reportColorScheme || (data.schoolSettings || schoolSettings)?.reportColorScheme || (data.schoolSettings || schoolSettings)?.primaryColor || '#1e40af';

        const logoUrl = resolveImageUrl(schoolSettings.logoUrl);
        const photoUrl = resolveImageUrl(student.user?.photoUrl || student.photoUrl);
        const teacherSig = resolveImageUrl(student.formMasterSignatureUrl);
        const principalSig = resolveImageUrl(term.principalSignatureUrl || schoolSettings.principalSignatureUrl);

        const studentName = getStudentDisplayName(student);
        const className = (student.class || data.className || 'N/A').toUpperCase();

        // --- DEDICATED EARLY YEARS TEMPLATES ---
        if (layout === 'early_years') {
          const domains = data.earlyYearsDomains || [];
          const progressAtAGlance = data.progressAtAGlance || [
            { area: 'Literacy', goingWell: 'Sound recognition, rhymes and reading direction.', nextFocus: 'Continue vocabulary and sentence development.' },
            { area: 'Numeracy', goingWell: 'Counting, number recognition and basic concepts.', nextFocus: 'Reinforce number concepts through daily practice.' },
            { area: 'Physical', goingWell: 'Fine-motor control, organised play and safety.', nextFocus: 'Maintain regular pencil, crayon and scissors activities.' },
            { area: 'Social / Emotional', goingWell: 'Self-control, confidence and participation.', nextFocus: 'Continue positive reinforcement and independence.' }
          ];
          const devPlan = data.developmentPlan || {};
          // Class-specific template suffix (e.g., early_years_1-page) wins over school-wide setting.
          const classLayoutSuffix = (layoutRawDB && layoutRawDB.startsWith('early_years_')) ? layoutRawDB.replace('early_years_', '') : null;
          let earlyYearsPageFormat = classLayoutSuffix || data.reportSettings?.earlyYearsPageFormat || (data.schoolSettings || schoolSettings)?.earlyYearsPageFormat || '3-page';

          // Filter domains into Page 1 (01, 02) and Page 2 (03, 04, 05, 06+)
          const page1Domains = domains.filter(d => (d.name || '').startsWith('01') || (d.name || '').startsWith('02'));
          const page2Domains = domains.filter(d => !(d.name || '').startsWith('01') && !(d.name || '').startsWith('02'));

          // If 3-page format is set but student only has 1 or 2 domains (no 03+ domains), auto adapt to 2-page format to prevent domain duplication and extra pages!
          if (earlyYearsPageFormat === '3-page' && page2Domains.length === 0) {
            earlyYearsPageFormat = '2-page';
          }
          const finalPage2Domains = page2Domains;

          if (earlyYearsPageFormat === '1-page') {
            const halfLength = Math.ceil((domains || []).length / 2);
            const leftDomains = (domains || []).slice(0, halfLength);
            const rightDomains = (domains || []).slice(halfLength);
            const verificationUrl = `https://educatechportal.com/verify/term/${student.id}/${term.id}`;
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`;

            return (
              <React.Fragment key={student.id || index}>
                <Page size="A4" style={[styles.page, { padding: 16, flexDirection: 'col', justifyContent: 'space-between' }]}>
                  <View style={{ flex: 1, justifyContent: 'space-between' }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingBottom: 6, borderBottomWidth: 2, borderColor: reportColor }}>
                      <View style={{ width: 55, height: 55, justifyContent: 'center', alignItems: 'center' }}>
                        {logoUrl ? (
                          <Image src={logoUrl} style={{ width: 50, height: 50, objectFit: 'contain' }} />
                        ) : (
                          <Text style={{ fontSize: 7, color: '#9ca3af', textAlign: 'center' }}>NO LOGO</Text>
                        )}
                      </View>
                      <View style={{ flex: 1, textAlign: 'center', paddingHorizontal: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', color: reportColor }}>
                          {schoolSettings.name || schoolSettings.schoolName || 'AL-BAYYINAH BASIC / TAHFEEDH SCHOOL'}
                        </Text>
                        {schoolSettings.motto && (
                          <Text style={{ fontSize: 7.5, fontStyle: 'italic', marginTop: 1.5, textTransform: 'uppercase', color: '#374151' }}>
                            "{schoolSettings.motto}"
                          </Text>
                        )}
                        <Text style={{ fontSize: 7, color: '#4b5563', marginTop: 1 }}>
                          {schoolSettings.address || 'Kano, Nigeria'}
                        </Text>
                      </View>
                      <View style={{ width: 44, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4 }}>
                        {photoUrl ? (
                          <Image src={photoUrl} style={{ width: 42, height: 48, objectFit: 'cover' }} />
                        ) : (
                          <Text style={{ fontSize: 7, color: '#9ca3af' }}>PHOTO</Text>
                        )}
                      </View>
                    </View>

                    {/* Title Banner */}
                    <View style={{ backgroundColor: reportColor, paddingVertical: 3.5, marginBottom: 6, textAlign: 'center', borderRadius: 4 }}>
                      <Text style={{ color: '#ffffff', fontSize: 9.5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        ✨ EARLY YEARS PROGRESS REPORT ✨
                      </Text>
                    </View>

                    {/* Student Info Table */}
                    <View style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, padding: 5, marginBottom: 6, fontSize: 9 }}>
                      <View style={{ flexDirection: 'row', marginBottom: 3.5 }}>
                        <Text style={{ width: '33%', fontWeight: 'bold' }}>NAME: <Text style={{ color: '#000' }}>{studentName}</Text></Text>
                        <Text style={{ width: '33%', fontWeight: 'bold' }}>GENDER: <Text style={{ color: '#000' }}>{student.gender || '-'}</Text></Text>
                        <Text style={{ width: '34%', fontWeight: 'bold' }}>ADM NO: <Text style={{ color: '#000' }}>{student.admissionNumber || '-'}</Text></Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 3.5 }}>
                        <Text style={{ width: '33%', fontWeight: 'bold' }}>CLASS: <Text style={{ color: '#000' }}>{className}</Text></Text>
                        <Text style={{ width: '33%', fontWeight: 'bold' }}>FORM MASTER: <Text style={{ color: '#000' }}>{student.formMaster || student.classTeacher || 'Assigned Teacher'}</Text></Text>
                        <Text style={{ width: '34%', fontWeight: 'bold' }}>ATTENDANCE: <Text style={{ color: '#000' }}>{attendance.present} / {attendance.total} DAYS ({attendance.percentage}%)</Text></Text>
                      </View>
                      <View style={{ flexDirection: 'row' }}>
                        <Text style={{ width: '33%', fontWeight: 'bold' }}>TERM: <Text style={{ color: '#000' }}>{term.session} - {term.name}</Text></Text>
                        <Text style={{ width: '33%', fontWeight: 'bold' }}>TERM ENDED: <Text style={{ color: '#000' }}>{term.endDate || term.termEnded ? formatDateVerbose(term.endDate || term.termEnded) : (term.closingDate ? formatDateVerbose(term.closingDate) : '18 July 2026')}</Text></Text>
                        <Text style={{ width: '34%', fontWeight: 'bold' }}>NEXT TERM: <Text style={{ color: '#000' }}>{term.nextTermBegins ? formatDateVerbose(term.nextTermBegins) : '4 May 2026'}</Text></Text>
                      </View>
                    </View>

                    {/* Key Banner */}
                    <View style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', borderRadius: 4, padding: 3.5, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-around', fontSize: 7.5, fontWeight: 'bold' }}>
                      <Text style={{ color: '#065f46' }}>5 / EX: EXCEEDING</Text>
                      <Text style={{ color: '#1e40af' }}>4 / MT: MEETING</Text>
                      <Text style={{ color: '#92400e' }}>3 / DV: DEVELOPING</Text>
                      <Text style={{ color: '#9a3412' }}>2 / EM: EMERGING</Text>
                      <Text style={{ color: '#9f1239' }}>1 / NT: NOT TAUGHT</Text>
                    </View>

                    {/* 2 Columns Domains Evaluation */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                      {[leftDomains, rightDomains].map((colDomains, colIdx) => (
                        <View key={colIdx} style={{ flex: 1, gap: 5 }}>
                          {colDomains.map((domain, dIdx) => (
                            <View key={dIdx} style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                              <View style={{ backgroundColor: reportColor, paddingHorizontal: 5, paddingVertical: 2.5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 8.5, fontWeight: 'bold', textTransform: 'uppercase', color: '#ffffff' }}>{domain.name}</Text>
                                <Text style={{ fontSize: 7, color: '#ffffff', opacity: 0.85 }}>5  4  3  2  1</Text>
                              </View>
                              {(domain.skills || []).map((skill, sIdx) => {
                                const score = Math.round(skill.score || 0);
                                return (
                                  <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: sIdx === domain.skills.length - 1 ? 0 : 0.5, borderColor: '#f1f5f9', paddingVertical: 2, paddingHorizontal: 5 }}>
                                    <Text style={{ flex: 1, fontSize: 7.5, color: '#1e293b', fontWeight: 'bold' }}>{skill.name}</Text>
                                    <View style={{ flexDirection: 'row', gap: 3 }}>
                                      {[5, 4, 3, 2, 1].map(val => (
                                        <Text key={val} style={{ fontSize: 7.5, fontWeight: score === val ? 'bold' : 'normal', color: score === val ? reportColor : '#CBD5E1' }}>
                                          {score === val ? `(${val})` : '·'}
                                        </Text>
                                      ))}
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>

                    {/* Teacher & Head Teacher Comments */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                      <View style={{ flex: 1, borderWidth: 1, borderColor: '#a7f3d0', backgroundColor: '#ecfdf5', borderRadius: 4, padding: 4.5, minHeight: 28 }}>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', color: reportColor, marginBottom: 1.5 }}>TEACHER'S COMMENT</Text>
                        <Text style={{ fontSize: 7.5, fontStyle: 'italic', color: '#1e293b' }}>
                          "{devPlan.teacherComment || 'The student is an energetic and engaged learner who has made good progress this term.'}"
                        </Text>
                      </View>
                      <View style={{ flex: 1, borderWidth: 1, borderColor: '#99f6e4', backgroundColor: '#f0fdfa', borderRadius: 4, padding: 4.5, minHeight: 28 }}>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', color: reportColor, marginBottom: 1.5 }}>HEAD TEACHER'S COMMENT</Text>
                        <Text style={{ fontSize: 7.5, fontStyle: 'italic', color: '#1e293b' }}>
                          "{devPlan.headTeacherComment || 'Has shown encouraging progress this term. Should continue to practise consistently.'}"
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Signatures & Bottom QR Code Verification */}
                  <View style={{ borderTopWidth: 1.5, borderColor: '#e2e8f0', paddingTop: 6, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      {/* QR Code at Bottom Left */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', padding: 3, borderRadius: 4, borderWidth: 0.5, borderColor: '#cbd5e1' }}>
                        <Image src={qrApiUrl} style={{ width: 38, height: 38 }} />
                        <View>
                          <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' }}>Scan to Verify</Text>
                          <Text style={{ fontSize: 6, color: '#64748b', textTransform: 'uppercase' }}>Authentic Record</Text>
                        </View>
                      </View>

                      {/* Class Teacher Signature */}
                      <View style={{ width: '32%', alignItems: 'center' }}>
                        <Text style={{ fontSize: 7.5, fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', marginBottom: 12 }}>CLASS TEACHER SIGNATURE</Text>
                        <View style={{ width: '100%', borderBottomWidth: 1, borderColor: '#94a3b8', marginBottom: 2 }} />
                        <Text style={{ fontSize: 6.5, color: '#64748b' }}>Date: ______________</Text>
                      </View>

                      {/* Head Teacher Signature */}
                      <View style={{ width: '32%', alignItems: 'center' }}>
                        <Text style={{ fontSize: 7.5, fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', marginBottom: 12 }}>HEAD TEACHER SIGNATURE</Text>
                        <View style={{ width: '100%', borderBottomWidth: 1, borderColor: '#94a3b8', marginBottom: 2 }} />
                        <Text style={{ fontSize: 6.5, color: '#64748b' }}>Date: ______________</Text>
                      </View>
                    </View>

                    {/* Document Footer Info */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, color: '#94a3b8', borderTopWidth: 0.5, borderColor: '#f1f5f9', paddingTop: 3 }}>
                      <Text>Early Years Progress Report</Text>
                      <Text>Official Authenticated Record</Text>
                      <Text>Page 1 of 1</Text>
                    </View>
                  </View>
                </Page>
              </React.Fragment>
            );
          }

          if (earlyYearsPageFormat === '2-page') {
            return (
              <React.Fragment key={student.id || index}>
                {/* PAGE 1: HEADER, STUDENT INFO, ATTENDANCE, KEY, ALL DOMAINS */}
                <Page size="A4" style={[styles.page, { padding: 20 }]}>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderColor: '#000000' }}>
                    {/* Logo */}
                    <View style={{ width: 60, height: 60, justifyContent: 'center', alignItems: 'center' }}>
                      {logoUrl ? (
                        <Image src={logoUrl} style={{ width: 55, height: 55, objectFit: 'contain' }} />
                      ) : (
                        <Text style={{ fontSize: 7, color: '#9ca3af', textAlign: 'center' }}>NO LOGO</Text>
                      )}
                    </View>

                    {/* Center Info */}
                    <View style={{ flex: 1, textAlign: 'center', paddingHorizontal: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', color: reportColor }}>
                        {schoolSettings.name || schoolSettings.schoolName || 'AL-BAYYINAH BASIC / TAHFEEDH SCHOOL'}
                      </Text>
                      {schoolSettings.motto && (
                        <Text style={{ fontSize: 7, fontStyle: 'italic', marginTop: 1, textTransform: 'uppercase', color: '#374151' }}>
                          "{schoolSettings.motto}"
                        </Text>
                      )}
                      <Text style={{ fontSize: 7, color: '#4b5563', marginTop: 1 }}>
                        {schoolSettings.address || 'Kano, Nigeria'}
                      </Text>
                      {(schoolSettings.phone || schoolSettings.email) && (
                        <Text style={{ fontSize: 7, color: '#4b5563', marginTop: 1 }}>
                          {schoolSettings.phone ? `TEL: ${schoolSettings.phone}` : ''} {schoolSettings.phone && schoolSettings.email ? ' • ' : ''} {schoolSettings.email ? `EMAIL: ${schoolSettings.email}` : ''}
                        </Text>
                      )}
                      <Text style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4, backgroundColor: reportColor, color: '#FFFFFF', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 2, alignSelf: 'center' }}>
                        EARLY YEARS PROGRESS REPORT
                      </Text>
                    </View>

                    {/* Photo */}
                    <View style={{ width: 55, height: 65, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#000000' }}>
                      {photoUrl ? (
                        <Image src={photoUrl} style={{ width: 53, height: 63, objectFit: 'cover' }} />
                      ) : (
                        <Text style={{ fontSize: 7, color: '#9ca3af', textAlign: 'center' }}>PHOTO</Text>
                      )}
                    </View>
                  </View>

                  {/* Student Info Table */}
                  <View style={{ borderWidth: 1, borderColor: '#000000', marginBottom: 4, fontSize: 8 }}>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#000000', height: 18, alignItems: 'center' }}>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>STUDENT</Text>
                      <SmartText style={{ width: '45%', fontWeight: 'bold', borderRightWidth: 1, borderColor: '#000000', paddingLeft: 4 }}>{studentName}</SmartText>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>CLASS</Text>
                      <SmartText style={{ width: '25%', paddingLeft: 4 }}>{className}</SmartText>
                    </View>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#000000', height: 18, alignItems: 'center' }}>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>DATE OF BIRTH</Text>
                      <Text style={{ width: '45%', borderRightWidth: 1, borderColor: '#000000', paddingLeft: 4 }}>{formatDateVerbose(student.dateOfBirth)}</Text>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>SESSION</Text>
                      <Text style={{ width: '25%', paddingLeft: 4 }}>{(term.session || '2025/2026').toUpperCase()}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', height: 18, alignItems: 'center' }}>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>TERM</Text>
                      <Text style={{ width: '45%', borderRightWidth: 1, borderColor: '#000000', paddingLeft: 4 }}>{(term.name || 'Second Term').toUpperCase()}</Text>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>REPORT STATUS</Text>
                      <Text style={{ width: '25%', paddingLeft: 4, fontWeight: 'bold' }}>Published</Text>
                    </View>
                  </View>

                  {/* Attendance Summary */}
                  {data.attendance ? (
                    <View style={{ borderWidth: 1, borderColor: '#000000', marginBottom: 4, flexDirection: 'row' }}>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4, borderRightWidth: 1, borderColor: '#000000' }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{data.attendance.present ?? 0}</Text>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 1 }}>DAYS PRESENT</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4, borderRightWidth: 1, borderColor: '#000000' }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{data.attendance.absent ?? 0}</Text>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 1 }}>DAYS ABSENT</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4, borderRightWidth: 1, borderColor: '#000000' }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{data.attendance.percentage}%</Text>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 1 }}>ATTENDANCE</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>—</Text>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 1 }}>NEXT TERM</Text>
                      </View>
                    </View>
                  ) : null}
                  <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 4 }}>
                    Next term begins: {term.nextTermBegins ? formatDateVerbose(term.nextTermBegins) : '4 May 2026'}
                  </Text>

                  {/* Assessment Key Banner */}
                  <View style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>ASSESSMENT KEY</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000', flexDirection: 'row' }}>
                      <View style={{ flex: 1, alignItems: 'center', padding: 3, borderRightWidth: 1, borderColor: '#000000', backgroundColor: '#d1fae5' }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#065f46' }}>A</Text>
                        <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#065f46' }}>Achieved Target</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 3, borderRightWidth: 1, borderColor: '#000000', backgroundColor: '#e0f2fe' }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#0369a1' }}>P</Text>
                        <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#0369a1' }}>Progressing Well</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 3, borderRightWidth: 1, borderColor: '#000000', backgroundColor: '#fef3c7' }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#92400e' }}>W</Text>
                        <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#92400e' }}>Working Towards</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 3, backgroundColor: '#f1f5f9' }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#334155' }}>NA</Text>
                        <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#334155' }}>Not Applicable</Text>
                      </View>
                    </View>
                  </View>

                  {/* All Domains */}
                  {domains.map((domain, dIdx) => {
                    const domainColors = ['#059669', '#4f46e5', '#7c3aed', '#d97706', '#0d9488', '#e11d48'];
                    const headerBg = domainColors[dIdx % domainColors.length];
                    return (
                      <View key={dIdx} style={{ marginBottom: 4 }}>
                        <Text style={{ fontSize: 8, fontWeight: 'bold', backgroundColor: headerBg, color: '#FFFFFF', padding: 3, borderWidth: 1, borderColor: '#000000', textTransform: 'uppercase' }}>
                          {domain.name}
                        </Text>
                        <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: '#000000' }}>
                          <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderColor: '#000000', fontWeight: 'bold', fontSize: 7, height: 14, alignItems: 'center' }}>
                            <Text style={{ flex: 1, paddingLeft: 4 }}>Learning outcome / skill</Text>
                            <Text style={{ width: 50, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>Current</Text>
                            <Text style={{ width: 50, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>Previous</Text>
                            <Text style={{ width: 75, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>Progress</Text>
                          </View>
                          {(domain.skills || []).map((skill, sIdx) => {
                            const curRating = (skill.current || 'A').toUpperCase();
                            const prevRating = (skill.previous || 'A').toUpperCase();
                            const progVal = (skill.progress || 'Maintained').trim();

                            const getBadgeStyle = (val) => {
                              if (val === 'A') return { bg: '#059669', color: '#FFFFFF' };
                              if (val === 'P') return { bg: '#0284c7', color: '#FFFFFF' };
                              if (val === 'W') return { bg: '#d97706', color: '#FFFFFF' };
                              return { bg: '#64748b', color: '#FFFFFF' };
                            };

                            const getProgStyle = (val) => {
                              if (val.toLowerCase().includes('improv')) return { bg: '#d1fae5', color: '#065f46', label: '↑ Improved' };
                              if (val.toLowerCase().includes('maintain')) return { bg: '#e0f2fe', color: '#0369a1', label: '→ Maintained' };
                              return { bg: '#fef3c7', color: '#92400e', label: '⚡ Needs Support' };
                            };

                            const curStyle = getBadgeStyle(curRating);
                            const prevStyle = getBadgeStyle(prevRating);
                            const progStyle = getProgStyle(progVal);

                            return (
                              <View key={sIdx} style={{ flexDirection: 'row', borderBottomWidth: sIdx === domain.skills.length - 1 ? 0 : 1, borderColor: '#E5E7EB', minHeight: 14, alignItems: 'center', fontSize: 7 }}>
                                <Text style={{ flex: 1, paddingLeft: 4, fontWeight: 'bold' }}>{skill.name}</Text>
                                <View style={{ width: 50, borderLeftWidth: 1, borderColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
                                  <View style={{ backgroundColor: curStyle.bg, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 }}>
                                    <Text style={{ color: curStyle.color, fontWeight: 'bold', fontSize: 6.5 }}>{curRating}</Text>
                                  </View>
                                </View>
                                <View style={{ width: 50, borderLeftWidth: 1, borderColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
                                  <View style={{ backgroundColor: prevStyle.bg, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 }}>
                                    <Text style={{ color: prevStyle.color, fontWeight: 'bold', fontSize: 6.5 }}>{prevRating}</Text>
                                  </View>
                                </View>
                                <View style={{ width: 75, borderLeftWidth: 1, borderColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
                                  <View style={{ backgroundColor: progStyle.bg, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                                    <Text style={{ color: progStyle.color, fontWeight: 'bold', fontSize: 6 }}>{progStyle.label}</Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}

                  <View style={{ position: 'absolute', bottom: 15, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#6B7280' }}>
                    <Text>Early Years Assessment & Progress Report</Text>
                    <Text>Confidential School Record</Text>
                    <Text>Page 1 of 2</Text>
                  </View>
                </Page>

                {/* PAGE 2: PROGRESS AT A GLANCE, COMMENTS & DEVELOPMENT PLAN */}
                <Page size="A4" style={[styles.page, { padding: 20 }]}>
                  <View style={{ textAlign: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>EARLY YEARS PROGRESS REPORT</Text>
                  </View>

                  {/* PROGRESS AT A GLANCE TABLE */}
                  <View style={{ marginTop: 2, marginBottom: 8 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>PROGRESS AT A GLANCE</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000' }}>
                      <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderColor: '#000000', fontWeight: 'bold', fontSize: 7, height: 14, alignItems: 'center' }}>
                        <Text style={{ width: '22%', paddingLeft: 4, borderRightWidth: 1, borderColor: '#000000' }}>AREA</Text>
                        <Text style={{ width: '39%', paddingLeft: 4, borderRightWidth: 1, borderColor: '#000000' }}>WHAT IS GOING WELL</Text>
                        <Text style={{ width: '39%', paddingLeft: 4 }}>NEXT FOCUS</Text>
                      </View>
                      {progressAtAGlance.map((row, rIdx) => (
                        <View key={rIdx} style={{ flexDirection: 'row', borderBottomWidth: rIdx === progressAtAGlance.length - 1 ? 0 : 1, borderColor: '#000000', minHeight: 15, alignItems: 'center', fontSize: 7 }}>
                          <Text style={{ width: '22%', fontWeight: 'bold', paddingLeft: 4, borderRightWidth: 1, borderColor: '#000000' }}>{row.area}</Text>
                          <Text style={{ width: '39%', paddingLeft: 4, borderRightWidth: 1, borderColor: '#000000' }}>{row.goingWell}</Text>
                          <Text style={{ width: '39%', paddingLeft: 4 }}>{row.nextFocus}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* TEACHER'S OVERALL COMMENT */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>TEACHER'S OVERALL COMMENT</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000', padding: 6, minHeight: 30 }}>
                      <Text style={{ fontSize: 8, fontStyle: 'italic', lineHeight: 1.3 }}>
                        "{devPlan.teacherComment || 'The student is an energetic and engaged learner who has made clear progress during the term. She demonstrates strong performance in areas of interest and is developing confidence across literacy, numeracy and classroom activities.'}"
                      </Text>
                    </View>
                  </View>

                  {/* SUBJECT / DEVELOPMENT COMMENTS */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>SUBJECT / DEVELOPMENT COMMENTS</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000' }}>
                      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#000000', minHeight: 22, alignItems: 'center' }}>
                        <Text style={{ width: '25%', fontWeight: 'bold', paddingLeft: 6, fontSize: 7.5, borderRightWidth: 1, borderColor: '#000000' }}>LITERACY</Text>
                        <Text style={{ width: '75%', padding: 4, fontSize: 7.5, fontStyle: 'italic' }}>
                          {devPlan.literacyComment || 'Recognises letter sounds confidently and is developing ability to use complete sentences and appropriate vocabulary.'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', minHeight: 22, alignItems: 'center' }}>
                        <Text style={{ width: '25%', fontWeight: 'bold', paddingLeft: 6, fontSize: 7.5, borderRightWidth: 1, borderColor: '#000000' }}>NUMERACY</Text>
                        <Text style={{ width: '75%', padding: 4, fontSize: 7.5, fontStyle: 'italic' }}>
                          {devPlan.numeracyComment || 'Demonstrates strong understanding of basic numeracy concepts and applies counting and number skills confidently.'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* RECOMMENDED NEXT STEPS */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>RECOMMENDED NEXT STEPS</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000' }}>
                      <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderColor: '#000000', fontWeight: 'bold', fontSize: 7.5, height: 16, alignItems: 'center' }}>
                        <Text style={{ width: '50%', paddingLeft: 6, borderRightWidth: 1, borderColor: '#000000' }}>At School</Text>
                        <Text style={{ width: '50%', paddingLeft: 6 }}>At Home</Text>
                      </View>
                      <View style={{ flexDirection: 'row', minHeight: 25, alignItems: 'center', fontSize: 7.5 }}>
                        <Text style={{ width: '50%', padding: 6, borderRightWidth: 1, borderColor: '#000000' }}>
                          {devPlan.atSchoolNextStep || 'Continue guided literacy and numeracy practice; reinforce independent classroom routines.'}
                        </Text>
                        <Text style={{ width: '50%', padding: 6 }}>
                          {devPlan.atHomeNextStep || 'Read together, practise sounds and counting, and use everyday objects for sorting and number games.'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* HEAD TEACHER'S COMMENT */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>HEAD TEACHER'S COMMENT</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000', padding: 6, minHeight: 25 }}>
                      <Text style={{ fontSize: 8, fontStyle: 'italic', lineHeight: 1.3 }}>
                        "{devPlan.headTeacherComment || 'Has shown encouraging progress this term. Should continue to practise consistently and maintain a positive attitude toward learning.'}"
                      </Text>
                    </View>
                  </View>

                  {/* Signatures */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '70%', alignSelf: 'center', marginTop: 10, marginBottom: 10 }}>
                    <View style={{ width: '40%', alignItems: 'center' }}>
                      <Text style={{ fontSize: 7.5, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15 }}>CLASS TEACHER</Text>
                      <View style={{ width: '100%', borderBottomWidth: 1, borderColor: '#000000', marginBottom: 4 }} />
                      <Text style={{ fontSize: 7 }}>Date: ______________</Text>
                    </View>
                    <View style={{ width: '40%', alignItems: 'center' }}>
                      <Text style={{ fontSize: 7.5, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15 }}>HEAD TEACHER</Text>
                      <View style={{ width: '100%', borderBottomWidth: 1, borderColor: '#000000', marginBottom: 4 }} />
                      <Text style={{ fontSize: 7 }}>Date: ______________</Text>
                    </View>
                  </View>

                  {/* Footer Note */}
                  <Text style={{ fontSize: 6.5, color: '#6B7280', marginTop: 5, textAlign: 'center' }}>
                    Report integrity: Published reports should be locked against unauthorised changes. Assessment templates and rating schemes should be configurable by school administrators.
                  </Text>

                  {/* Document Verification Footer */}
                  <View style={[styles.footerBanner, { marginTop: 4 }]}>
                    <Text style={styles.footerLeft}>[DIGITALLY VERIFIED REPORT] AUTHENTIC EDUCATIONAL CREDENTIAL</Text>
                    <Text style={styles.footerRight}>EARLY YEARS EVALUATION {'\u2022'} GEN: {formatDateVerbose(new Date())}</Text>
                  </View>

                  <View style={{ position: 'absolute', bottom: 15, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#6B7280' }}>
                    <Text>Early Years Assessment & Progress Report</Text>
                    <Text>Confidential School Record</Text>
                    <Text>Page 2 of 2</Text>
                  </View>
                </Page>
              </React.Fragment>
            );
          } else {
            return (
              <React.Fragment key={student.id || index}>
                {/* PAGE 1: HEADER, STUDENT INFO, ATTENDANCE, KEY, DOMAINS 01 & 02 */}
                <Page size="A4" style={[styles.page, { padding: 25 }]}>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderColor: '#000000' }}>
                    {/* Logo */}
                    <View style={{ width: 60, height: 60, justifyContent: 'center', alignItems: 'center' }}>
                      {logoUrl ? (
                        <Image src={logoUrl} style={{ width: 55, height: 55, objectFit: 'contain' }} />
                      ) : (
                        <Text style={{ fontSize: 7, color: '#9ca3af', textAlign: 'center' }}>NO LOGO</Text>
                      )}
                    </View>

                    {/* Center Info */}
                    <View style={{ flex: 1, textAlign: 'center', paddingHorizontal: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', color: reportColor }}>
                        {schoolSettings.name || schoolSettings.schoolName || 'AL-BAYYINAH BASIC / TAHFEEDH SCHOOL'}
                      </Text>
                      {schoolSettings.motto && (
                        <Text style={{ fontSize: 7, fontStyle: 'italic', marginTop: 1, textTransform: 'uppercase', color: '#374151' }}>
                          "{schoolSettings.motto}"
                        </Text>
                      )}
                      <Text style={{ fontSize: 7, color: '#4b5563', marginTop: 1 }}>
                        {schoolSettings.address || 'Kano, Nigeria'}
                      </Text>
                      {(schoolSettings.phone || schoolSettings.email) && (
                        <Text style={{ fontSize: 7, color: '#4b5563', marginTop: 1 }}>
                          {schoolSettings.phone ? `TEL: ${schoolSettings.phone}` : ''} {schoolSettings.phone && schoolSettings.email ? ' • ' : ''} {schoolSettings.email ? `EMAIL: ${schoolSettings.email}` : ''}
                        </Text>
                      )}
                      <Text style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4, backgroundColor: reportColor, color: '#FFFFFF', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 2, alignSelf: 'center' }}>
                        EARLY YEARS PROGRESS REPORT
                      </Text>
                    </View>

                    {/* Photo */}
                    <View style={{ width: 60, height: 70, justifyContent: 'center', alignItems: 'center' }}>
                      {photoUrl ? (
                        <Image src={photoUrl} style={{ width: 55, height: 65, objectFit: 'cover', borderRadius: 2 }} />
                      ) : (
                        <Text style={{ fontSize: 7, color: '#9ca3af', textAlign: 'center' }}>PHOTO</Text>
                      )}
                    </View>
                  </View>

                  {/* Student Info Table */}
                  <View style={{ borderWidth: 1, borderColor: '#000000', marginBottom: 8, fontSize: 8 }}>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#000000', height: 18, alignItems: 'center' }}>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>STUDENT</Text>
                      <SmartText style={{ width: '45%', fontWeight: 'bold', borderRightWidth: 1, borderColor: '#000000', paddingLeft: 4 }}>{studentName}</SmartText>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>CLASS</Text>
                      <SmartText style={{ width: '25%', paddingLeft: 4 }}>{className}</SmartText>
                    </View>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#000000', height: 18, alignItems: 'center' }}>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>DATE OF BIRTH</Text>
                      <Text style={{ width: '45%', borderRightWidth: 1, borderColor: '#000000', paddingLeft: 4 }}>{formatDateVerbose(student.dateOfBirth)}</Text>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>SESSION</Text>
                      <Text style={{ width: '25%', paddingLeft: 4 }}>{(term.session || '2025/2026').toUpperCase()}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', height: 18, alignItems: 'center' }}>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>TERM</Text>
                      <Text style={{ width: '45%', borderRightWidth: 1, borderColor: '#000000', paddingLeft: 4 }}>{(term.name || 'Second Term').toUpperCase()}</Text>
                      <Text style={{ width: '15%', fontWeight: 'bold', paddingLeft: 4 }}>REPORT STATUS</Text>
                      <Text style={{ width: '25%', paddingLeft: 4, fontWeight: 'bold' }}>Published</Text>
                    </View>
                  </View>

                  {/* Attendance Summary */}
                  {data.attendance ? (
                    <View style={{ borderWidth: 1, borderColor: '#000000', marginBottom: 4, flexDirection: 'row' }}>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4, borderRightWidth: 1, borderColor: '#000000' }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{data.attendance.present ?? 0}</Text>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 1 }}>DAYS PRESENT</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4, borderRightWidth: 1, borderColor: '#000000' }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{data.attendance.absent ?? 0}</Text>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 1 }}>DAYS ABSENT</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4, borderRightWidth: 1, borderColor: '#000000' }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{data.attendance.percentage}%</Text>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 1 }}>ATTENDANCE</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold' }}>—</Text>
                        <Text style={{ fontSize: 7, fontWeight: 'bold', marginTop: 1 }}>NEXT TERM</Text>
                      </View>
                    </View>
                  ) : null}
                  <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 8 }}>
                    Next term begins: {term.nextTermBegins ? formatDateVerbose(term.nextTermBegins) : '4 May 2026'}
                  </Text>

                  {/* Assessment Key Banner */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>ASSESSMENT KEY</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000', flexDirection: 'row', backgroundColor: '#F9FAFB' }}>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4, borderRightWidth: 1, borderColor: '#000000' }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>A</Text>
                        <Text style={{ fontSize: 7.5 }}>Excellent</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4, borderRightWidth: 1, borderColor: '#000000' }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>P</Text>
                        <Text style={{ fontSize: 7.5 }}>Perfected</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4, borderRightWidth: 1, borderColor: '#000000' }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>W</Text>
                        <Text style={{ fontSize: 7.5 }}>Working on It</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', padding: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>NA</Text>
                        <Text style={{ fontSize: 7.5 }}>Not Applicable</Text>
                      </View>
                    </View>
                  </View>

                  {/* Page 1 Domains (01 & 02) */}
                  {page1Domains.map((domain, dIdx) => (
                    <View key={dIdx} style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 9, fontWeight: 'bold', backgroundColor: '#F3F4F6', padding: 3, borderWidth: 1, borderColor: '#000000', textTransform: 'uppercase' }}>
                        {domain.name}
                      </Text>
                      <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: '#000000' }}>
                        <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderColor: '#000000', fontWeight: 'bold', fontSize: 8, height: 16, alignItems: 'center' }}>
                          <Text style={{ flex: 1, paddingLeft: 4 }}>Learning outcome / skill</Text>
                          <Text style={{ width: 50, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>Current</Text>
                          <Text style={{ width: 50, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>Previous</Text>
                          <Text style={{ width: 75, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>Progress</Text>
                        </View>
                        {(domain.skills || []).map((skill, sIdx) => (
                          <View key={sIdx} style={{ flexDirection: 'row', borderBottomWidth: sIdx === domain.skills.length - 1 ? 0 : 1, borderColor: '#E5E7EB', minHeight: 15, alignItems: 'center', fontSize: 8 }}>
                            <Text style={{ flex: 1, paddingLeft: 4 }}>{skill.name}</Text>
                            <Text style={{ width: 50, textAlign: 'center', fontWeight: 'bold', borderLeftWidth: 1, borderColor: '#000000' }}>{skill.current || 'A'}</Text>
                            <Text style={{ width: 50, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>{skill.previous || 'A'}</Text>
                            <Text style={{ width: 75, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>{skill.progress || 'Maintained'}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}

                  <View style={{ position: 'absolute', bottom: 15, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#6B7280' }}>
                    <Text>Early Years Assessment & Progress Report</Text>
                    <Text>Confidential School Record</Text>
                    <Text>Page 1 of 3</Text>
                  </View>
                </Page>

                {/* PAGE 2: DOMAINS 03, 04, 05+ AND PROGRESS AT A GLANCE */}
                <Page size="A4" style={[styles.page, { padding: 25 }]}>
                  <View style={{ textAlign: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>EARLY YEARS PROGRESS REPORT</Text>
                  </View>

                  {/* Page 2 Domains */}
                  {finalPage2Domains.map((domain, dIdx) => (
                    <View key={dIdx} style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 9, fontWeight: 'bold', backgroundColor: '#F3F4F6', padding: 3, borderWidth: 1, borderColor: '#000000', textTransform: 'uppercase' }}>
                        {domain.name}
                      </Text>
                      <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: '#000000' }}>
                        <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderColor: '#000000', fontWeight: 'bold', fontSize: 8, height: 16, alignItems: 'center' }}>
                          <Text style={{ flex: 1, paddingLeft: 4 }}>Learning outcome / skill</Text>
                          <Text style={{ width: 50, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>Current</Text>
                          <Text style={{ width: 50, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>Previous</Text>
                          <Text style={{ width: 75, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>Progress</Text>
                        </View>
                        {(domain.skills || []).map((skill, sIdx) => (
                          <View key={sIdx} style={{ flexDirection: 'row', borderBottomWidth: sIdx === domain.skills.length - 1 ? 0 : 1, borderColor: '#E5E7EB', minHeight: 14, alignItems: 'center', fontSize: 7.5 }}>
                            <Text style={{ flex: 1, paddingLeft: 4 }}>{skill.name}</Text>
                            <Text style={{ width: 50, textAlign: 'center', fontWeight: 'bold', borderLeftWidth: 1, borderColor: '#000000' }}>{skill.current || 'A'}</Text>
                            <Text style={{ width: 50, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>{skill.previous || 'A'}</Text>
                            <Text style={{ width: 75, textAlign: 'center', borderLeftWidth: 1, borderColor: '#000000' }}>{skill.progress || 'Maintained'}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}

                  {/* PROGRESS AT A GLANCE TABLE */}
                  <View style={{ marginTop: 6, marginBottom: 8 }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>PROGRESS AT A GLANCE</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000' }}>
                      <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderColor: '#000000', fontWeight: 'bold', fontSize: 8, height: 16, alignItems: 'center' }}>
                        <Text style={{ width: '22%', paddingLeft: 4, borderRightWidth: 1, borderColor: '#000000' }}>AREA</Text>
                        <Text style={{ width: '39%', paddingLeft: 4, borderRightWidth: 1, borderColor: '#000000' }}>WHAT IS GOING WELL</Text>
                        <Text style={{ width: '39%', paddingLeft: 4 }}>NEXT FOCUS</Text>
                      </View>
                      {progressAtAGlance.map((row, rIdx) => (
                        <View key={rIdx} style={{ flexDirection: 'row', borderBottomWidth: rIdx === progressAtAGlance.length - 1 ? 0 : 1, borderColor: '#000000', minHeight: 18, alignItems: 'center', fontSize: 7.5 }}>
                          <Text style={{ width: '22%', fontWeight: 'bold', paddingLeft: 4, borderRightWidth: 1, borderColor: '#000000' }}>{row.area}</Text>
                          <Text style={{ width: '39%', paddingLeft: 4, borderRightWidth: 1, borderColor: '#000000' }}>{row.goingWell}</Text>
                          <Text style={{ width: '39%', paddingLeft: 4 }}>{row.nextFocus}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={{ position: 'absolute', bottom: 15, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#6B7280' }}>
                    <Text>Early Years Assessment & Progress Report</Text>
                    <Text>Confidential School Record</Text>
                    <Text>Page 2 of 3</Text>
                  </View>
                </Page>

                {/* PAGE 3: COMMENTS & DEVELOPMENT PLAN */}
                <Page size="A4" style={[styles.page, { padding: 25 }]}>
                  <View style={{ textAlign: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' }}>COMMENTS & DEVELOPMENT PLAN</Text>
                  </View>

                  {/* TEACHER'S OVERALL COMMENT */}
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>TEACHER'S OVERALL COMMENT</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000', padding: 6, minHeight: 45 }}>
                      <Text style={{ fontSize: 8.5, fontStyle: 'italic', lineHeight: 1.3 }}>
                        "{devPlan.teacherComment || 'The student is an energetic and engaged learner who has made clear progress during the term. She demonstrates strong performance in areas of interest and is developing confidence across literacy, numeracy and classroom activities.'}"
                      </Text>
                    </View>
                  </View>

                  {/* SUBJECT / DEVELOPMENT COMMENTS */}
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>SUBJECT / DEVELOPMENT COMMENTS</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000' }}>
                      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#000000', minHeight: 25, alignItems: 'center' }}>
                        <Text style={{ width: '25%', fontWeight: 'bold', paddingLeft: 6, fontSize: 8, borderRightWidth: 1, borderColor: '#000000' }}>LITERACY</Text>
                        <Text style={{ width: '75%', padding: 4, fontSize: 8, fontStyle: 'italic' }}>
                          {devPlan.literacyComment || 'Recognises letter sounds confidently and is developing ability to use complete sentences and appropriate vocabulary.'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', minHeight: 25, alignItems: 'center' }}>
                        <Text style={{ width: '25%', fontWeight: 'bold', paddingLeft: 6, fontSize: 8, borderRightWidth: 1, borderColor: '#000000' }}>NUMERACY</Text>
                        <Text style={{ width: '75%', padding: 4, fontSize: 8, fontStyle: 'italic' }}>
                          {devPlan.numeracyComment || 'Demonstrates strong understanding of basic numeracy concepts and applies counting and number skills confidently.'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* RECOMMENDED NEXT STEPS */}
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>RECOMMENDED NEXT STEPS</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000' }}>
                      <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderColor: '#000000', fontWeight: 'bold', fontSize: 8, height: 16, alignItems: 'center' }}>
                        <Text style={{ width: '50%', paddingLeft: 6, borderRightWidth: 1, borderColor: '#000000' }}>At School</Text>
                        <Text style={{ width: '50%', paddingLeft: 6 }}>At Home</Text>
                      </View>
                      <View style={{ flexDirection: 'row', minHeight: 30, alignItems: 'center', fontSize: 8 }}>
                        <Text style={{ width: '50%', padding: 6, borderRightWidth: 1, borderColor: '#000000' }}>
                          {devPlan.atSchoolNextStep || 'Continue guided literacy and numeracy practice; reinforce independent classroom routines.'}
                        </Text>
                        <Text style={{ width: '50%', padding: 6 }}>
                          {devPlan.atHomeNextStep || 'Read together, practise sounds and counting, and use everyday objects for sorting and number games.'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* HEAD TEACHER'S COMMENT */}
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 2 }}>HEAD TEACHER'S COMMENT</Text>
                    <View style={{ borderWidth: 1, borderColor: '#000000', padding: 6, minHeight: 35 }}>
                      <Text style={{ fontSize: 8.5, fontStyle: 'italic', lineHeight: 1.3 }}>
                        "{devPlan.headTeacherComment || 'Has shown encouraging progress this term. Should continue to practise consistently and maintain a positive attitude toward learning.'}"
                      </Text>
                    </View>
                  </View>

                  {/* Signatures */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '70%', alignSelf: 'center', marginTop: 15, marginBottom: 15 }}>
                    <View style={{ width: '40%', alignItems: 'center' }}>
                      <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 20 }}>CLASS TEACHER</Text>
                      <View style={{ width: '100%', borderBottomWidth: 1, borderColor: '#000000', marginBottom: 4 }} />
                      <Text style={{ fontSize: 7.5 }}>Date: ______________</Text>
                    </View>
                    <View style={{ width: '40%', alignItems: 'center' }}>
                      <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 20 }}>HEAD TEACHER</Text>
                      <View style={{ width: '100%', borderBottomWidth: 1, borderColor: '#000000', marginBottom: 4 }} />
                      <Text style={{ fontSize: 7.5 }}>Date: ______________</Text>
                    </View>
                  </View>

                  {/* Footer Note */}
                  <Text style={{ fontSize: 7, color: '#6B7280', marginTop: 10, textAlign: 'center' }}>
                    Report integrity: Published reports should be locked against unauthorised changes. Assessment templates and rating schemes should be configurable by school administrators.
                  </Text>

                  {/* Document Verification Footer */}
                  <View style={[styles.footerBanner, { marginTop: 6 }]}>
                    <Text style={styles.footerLeft}>[DIGITALLY VERIFIED REPORT] AUTHENTIC EDUCATIONAL CREDENTIAL</Text>
                    <Text style={styles.footerRight}>EARLY YEARS EVALUATION {'\u2022'} GEN: {formatDateVerbose(new Date())}</Text>
                  </View>

                  <View style={{ position: 'absolute', bottom: 15, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#6B7280' }}>
                    <Text>Early Years Assessment & Progress Report</Text>
                    <Text>Confidential School Record</Text>
                    <Text>Page 3 of 3</Text>
                  </View>
                </Page>
              </React.Fragment>
            );
          }
        }

        // Standard Report Templates (Classic, Modern, Minimal)
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
                  {(() => {
                    const wA1 = term.weights?.assignment1 !== undefined && term.weights?.assignment1 !== null ? Number(term.weights.assignment1) : 5;
                    const wA2 = term.weights?.assignment2 !== undefined && term.weights?.assignment2 !== null ? Number(term.weights.assignment2) : 5;
                    const wT1 = term.weights?.test1 !== undefined && term.weights?.test1 !== null ? Number(term.weights.test1) : 10;
                    const wT2 = term.weights?.test2 !== undefined && term.weights?.test2 !== null ? Number(term.weights.test2) : 10;
                    const wEx = term.weights?.exam !== undefined && term.weights?.exam !== null ? Number(term.weights.exam) : 70;

                    return (
                      <View style={styles.table}>
                        <View style={styles.tableHeaderRow}>
                          <Text style={[styles.thSubject, { flex: 1 }]}>SUBJECTS</Text>
                          {wA1 > 0 && <Text style={styles.thScore}>1ST CA{'\n'}{wA1}</Text>}
                          {wA2 > 0 && <Text style={styles.thScore}>2ND CA{'\n'}{wA2}</Text>}
                          {wT1 > 0 && <Text style={styles.thScore}>1ST TST{'\n'}{wT1}</Text>}
                          {wT2 > 0 && <Text style={styles.thScore}>2ND TST{'\n'}{wT2}</Text>}
                          {wEx > 0 && <Text style={styles.thScore}>EXM{'\n'}{wEx}</Text>}
                          <Text style={styles.thTotal}>TOT{'\n'}100</Text>
                          <Text style={styles.thGrade}>GRD</Text>
                          {showPosition && <Text style={styles.thPos}>POS</Text>}
                          <Text style={styles.thRemark}>REMARKS</Text>
                        </View>
                        {subjects.map((sub, sIdx) => (
                          <View key={sIdx} style={styles.tableRow}>
                            <SmartText style={[styles.tdSubject, { flex: 1 }]}>{sub.name || ''}</SmartText>
                            {wA1 > 0 && <Text style={styles.tdScore}>{sub.assignment1 ?? ''}</Text>}
                            {wA2 > 0 && <Text style={styles.tdScore}>{sub.assignment2 ?? ''}</Text>}
                            {wT1 > 0 && <Text style={styles.tdScore}>{sub.test1 ?? ''}</Text>}
                            {wT2 > 0 && <Text style={styles.tdScore}>{sub.test2 ?? ''}</Text>}
                            {wEx > 0 && <Text style={styles.tdScore}>{sub.exam ?? ''}</Text>}
                            <Text style={styles.tdTotal}>{sub.total != null ? Number(sub.total).toFixed(0) : ''}</Text>
                            <Text style={styles.tdGrade}>{sub.grade || ''}</Text>
                            {showPosition && <Text style={styles.tdPos}>{sub.position || ''}</Text>}
                            <Text style={styles.tdRemark}>{(sub.remark || '').toUpperCase()}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })()}
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
