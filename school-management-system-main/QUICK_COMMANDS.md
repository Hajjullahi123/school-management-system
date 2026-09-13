# ⚡ QUICK REFERENCE - 3 COMMANDS TO RUN

**Open Command Prompt (NOT PowerShell)**

## Command 1: Database Migration
```cmd
cd "c:\Users\IT-LAB\School Mn\server"
npx prisma migrate dev --name add_social_media_fields
```

## Command 2: Install Email Package
```cmd
npm install nodemailer
```

## Command 3: Restart Server
```cmd
npm run dev
```

---

## Then Test:

1. **Social Media**: Admin Settings → School Branding → Add links → Save
2. **Email**: Record a payment → Check parent's email

---

## If npx Fails:

**Alternative** - Manual database update:
1. Run `view-database.bat`
2. Execute SQL tab
3. Paste:
```sql
ALTER TABLE "SchoolSettings" ADD COLUMN "facebookUrl" TEXT;
ALTER TABLE "SchoolSettings" ADD COLUMN "instagramUrl" TEXT;
ALTER TABLE "SchoolSettings" ADD COLUMN "whatsappUrl" TEXT;
```
4. Execute → Save

---

**Full Guide**: See `QUICK_FIX_IMPLEMENTATION.md`

**That's it!** 🚀
