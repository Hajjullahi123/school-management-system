# Database Management Guide

This guide explains how to manage your school management system database.

## 📁 Database Location

Your database is stored at:
```
c:\Users\IT-LAB\School Mn\server\prisma\dev.db
```

This is a SQLite database file containing all your data.

---

## 🛠️ Database Management Tools

I've created 3 easy-to-use tools for you:

### 1. **backup-database.bat** - Create Database Backups
- **Double-click** to create a backup
- Backups are saved to: `server\prisma\backups\`
- Filename format: `backup_YYYY-MM-DD_HHMM.db`
- **Recommended**: Backup before major changes or weekly

### 2. **view-database.bat** - View & Edit Database
- **Double-click** to open Prisma Studio
- Opens in browser at `http://localhost:5555`
- Visual interface to view/edit all data
- Shows all tables: Students, Subjects, Exams, Results
- Press `Ctrl+C` in the command window to close

### 3. **restore-database.bat** - Restore from Backup
- **Double-click** to restore a previous backup
- Shows list of available backups
- Enter filename to restore
- **Warning**: This replaces your current database!

---

## 📊 Using Prisma Studio (Database Viewer)

### Starting Prisma Studio
1. Double-click **`view-database.bat`**
2. Wait for browser to open at `http://localhost:5555`
3. You'll see all your database tables

### What You Can Do
- **View Data**: Click any table to see all records
- **Add Records**: Click "Add record" button
- **Edit Records**: Click any field to edit
- **Delete Records**: Click the trash icon
- **Filter Data**: Use the filter options at the top
- **Search**: Use the search box to find specific records

### Tables Overview
- **Student**: All student information
- **Subject**: All subjects with codes
- **Exam**: All exams with dates
- **Result**: All student results (linked to students, subjects, exams)

---

## 💾 Backup Best Practices

### When to Backup
- ✅ Before uploading bulk CSV data
- ✅ Before making major changes
- ✅ Weekly (for active use)
- ✅ Before system updates
- ✅ At end of each term/semester

### Backup Storage
Backups are stored in:
```
c:\Users\IT-LAB\School Mn\server\prisma\backups\
```

**Tip**: Copy important backups to an external drive or cloud storage!

---

## 🔄 Restore Process

### To Restore a Backup:
1. **Stop the application** (close server and client windows)
2. Double-click **`restore-database.bat`**
3. View the list of available backups
4. Enter the backup filename (e.g., `backup_2025-11-29_1450.db`)
5. Type `yes` to confirm
6. Restart the application with `start.bat`

---

## 📈 Database Information

### Current Database Size
To check database size:
1. Navigate to `c:\Users\IT-LAB\School Mn\server\prisma\`
2. Right-click `dev.db`
3. Select "Properties"
4. View file size

### Database Capacity
- SQLite can handle **millions of records**
- Typical school (1000 students, 10 subjects, 5 exams): ~5-10 MB
- No size limits for normal school use

---

## 🔧 Advanced Database Commands

If you need to run manual commands, open PowerShell in the server folder:

```powershell
cd "c:\Users\IT-LAB\School Mn\server"

# Open Prisma Studio
npx prisma studio

# View database schema
npx prisma db pull

# Reset database (WARNING: Deletes all data!)
npx prisma migrate reset

# Generate Prisma client (if needed)
npx prisma generate
```

---

## ⚠️ Important Warnings

### DO NOT:
- ❌ Delete `dev.db` while the server is running
- ❌ Edit `dev.db` directly with text editors
- ❌ Restore backups while the server is running
- ❌ Share `dev.db` file while server is active

### DO:
- ✅ Stop the server before restoring backups
- ✅ Create backups regularly
- ✅ Use Prisma Studio for data editing
- ✅ Keep backups in multiple locations

---

## 🆘 Troubleshooting

### "Database is locked" error
- Stop the server (`Ctrl+C` in server window)
- Wait 5 seconds
- Try again

### "Database file not found"
- Run the application at least once to create the database
- Check if `server\prisma\dev.db` exists

### Corrupted database
- Stop the server
- Restore from a recent backup using `restore-database.bat`

### Lost all data
- Use `restore-database.bat` to recover from backup
- If no backups exist, you'll need to re-enter data

---

## 📝 Quick Reference

| Task | Tool | When to Use |
|------|------|-------------|
| Create backup | `backup-database.bat` | Before major changes, weekly |
| View/edit data | `view-database.bat` | Anytime (visual interface) |
| Restore backup | `restore-database.bat` | After data loss or mistakes |
| Start app | `start.bat` | Normal use |

---

## ✨ Summary

Your database is safe and easy to manage with these tools:
- **Backup regularly** with one click
- **View and edit** data visually with Prisma Studio
- **Restore easily** if something goes wrong

Always backup before important operations!
