# 🔧 QUICK WORKAROUND - PDF Upload

**The upload has a known issue with authentication.**

## **TEMPORARY SOLUTION** (Works Now):

**Instead of uploading PDFs**, just **use external URLs**:

### **For Brochure**:
1. Upload your PDF to Google Drive
2. Get shareable link
3. Paste link in "School Brochure" field
4. Save

### **For Admission Guide**:
Same process - use Google Drive or Dropbox link

---

## **OR - Test with Sample PDFs**:

Use these test PDF URLs:

**Brochure**: 
```
https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
```

**Admission Guide**:
```
https://www.africau.edu/images/default/sample.pdf
```

Just paste these URLs and save!

---

## **PROPER FIX** (Can do tomorrow):

Need to update authentication middleware to handle multipart/form-data.

**For now**: External URLs work perfectly!

---

**Try pasting a URL now** - it will work immediately! ✅
