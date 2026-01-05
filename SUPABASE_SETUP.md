# Step-by-Step Supabase Postgres Setup

## Step 1: Sign Up / Sign In to Supabase

1. Go to **https://supabase.com**
2. Click **"Start your project"** (or **"Sign In"** if you have an account)
3. Sign up with GitHub, Google, or email
4. Verify your email if needed

## Step 2: Create a New Project

1. Once logged in, you'll see your dashboard
2. Click the **"New Project"** button (usually green, top right)
3. Fill in the project details:
   - **Name**: `scribe` (or any name you prefer)
   - **Database Password**: Create a strong password (SAVE THIS - you'll need it!)
   - **Region**: Choose the closest region to you (e.g., `US East (North Virginia)`)
   - **Pricing Plan**: Select **"Free"** (perfect for development)
4. Click **"Create new project"**
5. Wait 2-3 minutes for Supabase to provision your database

## Step 3: Get Your Connection String

1. Once your project is ready, you'll see the project dashboard
2. Click on the **⚙️ Settings** icon (gear icon) in the left sidebar
3. Click **"Database"** in the settings menu
4. Scroll down to find **"Connection string"** section
5. You'll see several connection string options - look for the one labeled:
   - **"Connection pooling"** → **"Session mode"** or **"Transaction mode"**
   - It should start with: `postgresql://postgres:[YOUR-PASSWORD]@...`
6. Click the **"Copy"** button next to the connection string
7. **IMPORTANT**: Replace `[YOUR-PASSWORD]` in the copied string with the password you created in Step 2

## Step 4: Add Connection String to Your Project

1. Open your project in your code editor
2. Open the `.env.local` file (in the root of your project)
3. Add this line (replace with your actual connection string):
   ```
   POSTGRES_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xxxxx.supabase.co:5432/postgres
   ```
4. Save the file

**Example of what it should look like:**
```
OPENROUTER_API_KEY=your_key_here
POSTGRES_URL=postgresql://postgres:MySecurePassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## Step 5: Run Database Migrations

Open your terminal in the project directory and run:

```bash
npx tsx lib/contacts/migrations.ts
```

You should see:
```
✅ Database migrations completed successfully
```

## Step 6: Test the Connection

Run the diagnostic script:

```bash
npx tsx lib/contacts/diagnose-postgres.ts
```

You should see:
- ✅ POSTGRES_URL is set
- ✅ @vercel/postgres package is installed
- ✅ Connection successful!
- ✅ Tables exist (companies, people, dictionary)

## Step 7: Restart Your Dev Server

1. Stop your current dev server (Ctrl+C if it's running)
2. Start it again:
   ```bash
   npm run dev
   ```

## Step 8: Test in Your App

1. Open http://localhost:3000/contacts
2. Try adding a company (e.g., "Test Company")
3. Try adding a person
4. Refresh the page - your data should persist!

## Troubleshooting

### If migrations fail:
- Double-check your connection string format
- Make sure you replaced `[YOUR-PASSWORD]` with your actual password
- Verify the connection string doesn't have extra spaces

### If connection fails:
- Check that your Supabase project is fully provisioned (green status)
- Verify your password is correct
- Make sure you're using the "Connection pooling" → "Session mode" string

### If tables don't exist:
- Run migrations again: `npx tsx lib/contacts/migrations.ts`
- Check Supabase dashboard → Table Editor to see if tables were created

## Next Steps

Once everything is working:
1. Your data will persist across deployments
2. You can view/edit data in Supabase dashboard → Table Editor
3. For production, add `POSTGRES_URL` to Vercel environment variables:
   ```bash
   vercel env add POSTGRES_URL
   ```
   (Then paste your connection string when prompted)

