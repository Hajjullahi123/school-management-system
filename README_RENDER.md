# Deployment Guide: Render.com

This guide explains how to deploy your **School Management System** to Render.com for free using the files we just created.

## Prerequisites
1. A GitHub account.
2. A Render.com account (sign up with GitHub).

## Step 1: Push to GitHub
If you haven't already pushed your code to GitHub, do so now:
1. Create a new repository on GitHub.
2. Run these commands in your project folder:
   ```bash
   git add .
   git commit -m "Ready for Render deployment"
   git push origin main
   ```

## Step 2: Deploy on Render
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` file.
5. Click **Apply**.

## What Happens Next?
- Render will create a **PostgreSQL Database** (Free Tier).
- Render will create a **Web Service**.
- It will run `./render-build.sh` to:
  - Build your React frontend.
  - Install backend dependencies.
  - Switch your database from SQLite to PostgreSQL automatically.
- It will start your server.

## Important Notes
- **Database Data**: Your local data (students, results) is in SQLite and **will not** be transferred to the cloud automatically. You will start with a fresh blank database.
- **First Login**: You will need to create a new Super Admin account on the live site or run a seed script.
  - You can access the **Render Shell** (in the dashboard) and run:
    ```bash
    cd server
    node create_superadmin.js
    ```
- **Free Tier Limits**: The free server will "sleep" after 15 minutes of inactivity. The first request after sleep will take 30-60 seconds to load.

## Troubleshooting
- If the build fails, check the "Logs" tab in Render.
- If the site loads but APIs fail, check if `DATABASE_URL` is correctly set in the Environment settings.

## Accessing Your Site
Render will give you a URL like `https://school-management-system-xxxx.onrender.com`.
Use this URL to access your portal from anywhere!
