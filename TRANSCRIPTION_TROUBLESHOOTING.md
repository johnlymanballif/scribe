# Transcription Troubleshooting Guide

## Changes Made

I've enhanced the transcription API with better logging and error handling to help diagnose issues in Vercel production:

1. **Enhanced Logging**: Added detailed logs at every step of the transcription process
2. **Environment Variable Detection**: Better logging to detect if `DEEPGRAM_API_KEY` is set correctly
3. **File Size Validation**: Added checks for file size limits
4. **Vercel Configuration**: Updated `vercel.json` to ensure proper function timeout settings

## How to Debug

### Step 1: Check Vercel Function Logs

1. Go to your Vercel Dashboard
2. Navigate to: **Deployments** → **Latest Deployment** → **Functions** tab
3. Look for `/api/transcribe` function logs
4. Try uploading an audio file and watch for these log messages:

**Expected logs when working:**
- `🎤 Transcription API called` - Function was invoked
- `🔑 Checking DEEPGRAM_API_KEY:` - Shows if API key is detected
- `📥 Parsing form data...` - File upload received
- `📁 File received:` - File details
- `📤 Sending request to Deepgram:` - API call initiated
- `✅ Deepgram response received:` - Success

**Error logs to watch for:**
- `❌ DEEPGRAM_API_KEY is not configured` - API key missing
- `❌ Deepgram API error:` - API call failed
- `❌ Transcription error:` - Unexpected error

### Step 2: Verify Environment Variable

1. Go to: **Vercel Dashboard** → **Settings** → **Environment Variables**
2. Check that `DEEPGRAM_API_KEY` exists and is set for **Production** environment
3. Make sure it's not set to `your_api_key_here` or empty
4. The value should start with something like `abc123...` (your actual Deepgram API key)

### Step 3: Common Issues

#### Issue: "Deepgram API key not configured"
**Solution:**
- Verify `DEEPGRAM_API_KEY` is set in Vercel environment variables
- Make sure it's enabled for **Production** environment
- Redeploy after adding the variable

#### Issue: "Invalid Deepgram API key" (401/403)
**Solution:**
- Get a fresh API key from https://deepgram.com/dashboard
- Update the environment variable in Vercel
- Redeploy

#### Issue: No logs appearing at all
**Possible causes:**
- Function timeout (check if file is too large)
- Network/CORS issue
- Function not being invoked

**Solution:**
- Check browser console for client-side errors
- Verify the API endpoint is being called (`/api/transcribe`)
- Check Vercel function logs for any timeout errors

#### Issue: Function timeout
**Solution:**
- The function is configured for 300 seconds (5 minutes)
- For very long audio files, consider splitting them
- Check Vercel plan limits (Pro plan required for >10s timeouts)

### Step 4: Test Locally First

Before deploying to production:

1. Add `DEEPGRAM_API_KEY` to `.env.local`:
   ```
   DEEPGRAM_API_KEY=your_actual_key_here
   ```

2. Run locally:
   ```bash
   npm run dev
   ```

3. Test transcription locally to verify it works

4. If it works locally but not in production, the issue is likely:
   - Environment variable not set in Vercel
   - Different Vercel environment configuration
   - Network/firewall issues

## Critical Issue Found: GET Request Returning 413

Looking at your logs, I see:
- A **GET request** to `/api/transcribe` returning **413 (Payload Too Large)**
- **No POST requests** appearing in the logs

This suggests:
1. The POST request might be blocked by Vercel before reaching the function
2. Vercel has a **4.5MB body size limit** for serverless functions (Hobby plan)
3. Large audio files might be rejected before our code runs

### Solutions:

**Option 1: Check File Size**
- Vercel Hobby plan limits request bodies to 4.5MB
- If your audio file is larger, it will be rejected before reaching the function
- Try with a smaller audio file (< 4MB) to test

**Option 2: Upgrade Vercel Plan**
- Pro plan allows larger request bodies
- Or use a different upload strategy

**Option 3: Use Direct Upload**
- Upload directly to Deepgram from the client (bypasses Vercel size limits)
- Requires exposing Deepgram API key to client (not recommended)

## Next Steps

After deploying these changes:

1. **Deploy to Vercel:**
   ```bash
   git add .
   git commit -m "Enhanced transcription logging and error handling"
   git push
   ```

2. **Monitor the logs** when testing transcription in production

3. **Check the logs** for the detailed error messages that will help identify the exact issue

## File Size Limits

- **Vercel Serverless Functions**: 4.5MB request body limit (Hobby plan)
- **Deepgram API**: Accepts files up to 2GB
- **Current limit**: 500MB (configurable in code)

For files larger than 4.5MB, you may need to:
- Upgrade to Vercel Pro plan
- Use a different upload method (e.g., direct to Deepgram from client)
- Split large files into smaller chunks
