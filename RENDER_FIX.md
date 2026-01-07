# 🚀 Deployment Fix for Render.com

## Problem
The production database on Render needs to be seeded with the correct school and user accounts.

## Solution

### Option 1: Redeploy (Recommended)
If you push these changes to GitHub, Render will automatically redeploy and seed the database:

1. **Commit and push the changes:**
   ```bash
   git add .
   git commit -m "Fix: Update production seed with correct school slug"
   git push origin main
   ```

2. **Render will automatically:**
   - Rebuild the application
   - Run `npx prisma db push` to update the database schema
   - Run `node prisma/seed-production.js` to seed the database
   - Start the server

3. **Wait for deployment to complete** (check Render dashboard)

4. **Login credentials for production:**
   ```
   School Domain: default
   Username:      superadmin
   Password:      superadmin123
   ```

### Option 2: Manual Seed via Render Shell
If you can't wait for a deployment, you can manually seed the database:

1. Go to your Render dashboard: https://dashboard.render.com
2. Click on your **school-management-system** service
3. Click on the **Shell** tab
4. Run these commands:
   ```bash
   cd server
   node prisma/seed-production.js
   ```

5. Check the output for the credentials

### Option 3: Create Superadmin Script
Run the create-superadmin script on Render Shell:

1. In Render Shell:
   ```bash
   cd server
   cat > create-superadmin-temp.js << 'EOF'
   const { PrismaClient } = require('@prisma/client');
   const bcrypt = require('bcryptjs');
   const prisma = new PrismaClient();

   async function run() {
     const school = await prisma.school.findFirst({ where: { slug: 'default' } });
     if (!school) {
       console.log('Creating school...');
       school = await prisma.school.create({
         data: {
           slug: 'default',
           name: 'School Management System',
           isActivated: true,
           isSetupComplete: true
         }
       });
     }
     
     const hash = await bcrypt.hash('superadmin123', 12);
     await prisma.user.upsert({
       where: { schoolId_username: { schoolId: school.id, username: 'superadmin' } },
       update: { passwordHash: hash, isActive: true },
       create: {
         schoolId: school.id,
         username: 'superadmin',
         passwordHash: hash,
         email: 'superadmin@system.local',
         role: 'superadmin',
         firstName: 'Global',
         lastName: 'Superadmin',
         isActive: true
       }
     });
     console.log('✅ Superadmin created! Use: default / superadmin / superadmin123');
     await prisma.$disconnect();
   }
   run();
   EOF
   
   node create-superadmin-temp.js
   rm create-superadmin-temp.js
   ```

## Testing Locally

Test your local login with:
```bash
cd server
node test-login.js
```

## Credentials

### Local & Production (after fix):
```
School Domain: default
Username:      superadmin
Password:      superadmin123

OR

Username:      admin
Password:      admin123
```

## Verification

After deployment, verify the database was seeded:
1. Check Render logs for "Production database seeded successfully"
2. Try logging in at: https://school-management-system-i95b.onrender.com/

## Notes
- The school slug on production is now `default` (not `default-school`)
- If you still can't log in, check the Render logs for errors
- Make sure the DATABASE_URL environment variable is set correctly in Render
