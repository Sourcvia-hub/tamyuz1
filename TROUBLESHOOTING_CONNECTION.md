# Troubleshooting "Cannot connect to server" Error

## Quick Diagnosis

The backend is **working correctly**. The issue is likely one of these:

### 1. Browser Console Errors

**Action:** Open browser console (F12) and check for errors

Look for:
- `Network Error`
- `CORS error`
- `Failed to fetch`
- Red error messages

**What to do:**
- Screenshot the console errors
- Share them so we can see the exact issue

### 2. Check What URL is Being Used

**Action:** In browser console, type:
```javascript
console.log(window.location.origin);
```

**Expected:** `https://procurement-app-1.preview.emergentagent.com`

If it's different, that's the problem!

### 3. Clear Browser Cache

**Action:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Clear for "All time"
4. Click "Clear data"
5. Refresh the page (`Ctrl+R` or `Cmd+R`)

### 4. Check Network Tab

**Action:**
1. Open DevTools (F12)
2. Go to "Network" tab
3. Try to login
4. Look for the `/api/auth/login` request
5. Click on it to see details

**What to look for:**
- Status code (should be 200 for success, 401 for wrong password)
- Response body
- Request headers
- Response headers

### 5. Test in Incognito/Private Mode

**Action:**
1. Open incognito window
2. Go to: https://procurement-app-1.preview.emergentagent.com/login
3. Try to login with: `admin@sourcevia.com` / `admin123`

If it works in incognito, the issue is:
- Browser cache
- Browser extensions
- Cookies

### 6. Manual API Test

**Action:** Run this in browser console:

```javascript
fetch('https://procurement-app-1.preview.emergentagent.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'admin@sourcevia.com',
    password: 'admin123'
  })
})
.then(r => r.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

If this works, the issue is in the React component.
If this fails, share the error message.

## Common Issues & Solutions

### Issue 1: "Mixed Content" Error

**Symptom:** Error about HTTP/HTTPS
**Solution:** Make sure you're accessing via HTTPS (not HTTP)
**URL:** https://procurement-app-1.preview.emergentagent.com (not http://)

### Issue 2: AdBlocker Blocking Requests

**Symptom:** Network requests blocked
**Solution:** Disable AdBlock/uBlock for this site

**How to check:**
- Look for shield icon in address bar
- Click it and disable protection
- Refresh page

### Issue 3: CORS Policy Error

**Symptom:** "blocked by CORS policy" in console
**Solution:** Backend CORS is configured correctly. This usually means:
- Wrong origin
- Missing credentials
- Browser cache issue

**Fix:** Clear cache and try again

### Issue 4: Timeout Error

**Symptom:** Request takes forever, then fails
**Solution:** Check your internet connection

**Test:** Open another website to verify internet works

## Debug Mode

I've added extensive logging to the Login page. Check browser console for:

```
🔐 Attempting login to: https://...
📧 Email: admin@sourcevia.com
✅ Login successful: {...}
```

OR

```
❌ Login error details: {...}
```

This will tell us exactly what's happening.

## Backend Status (Verified Working)

✅ Backend is running on port 8001
✅ API responds correctly: https://procurement-app-1.preview.emergentagent.com/api
✅ Login endpoint works: `POST /api/auth/login`
✅ Registration endpoint works: `POST /api/auth/register`
✅ CORS configured correctly
✅ All test users exist in database

## Test Credentials

Try these in order:

1. **Admin User:**
   - Email: `admin@sourcevia.com`
   - Password: `admin123`

2. **Regular User:**
   - Email: `user@test.com`
   - Password: `user123`

3. **Procurement Officer:**
   - Email: `po@sourcevia.com`
   - Password: `po123456`

## What to Share for Support

If the issue persists, please share:

1. **Screenshot of browser console** (F12 → Console tab)
   - Should show the 🔐 and ❌ messages with details

2. **Screenshot of Network tab** (F12 → Network tab)
   - Filter for "/login"
   - Show the request details

3. **Browser and version**
   - Chrome 120? Firefox 121? Safari 17?

4. **Operating System**
   - Windows? Mac? Linux?

5. **Any error message** you see on screen

## Quick Test Script

Run this in your terminal to verify backend is working:

```bash
curl -X POST "https://procurement-app-1.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sourcevia.com","password":"admin123"}' \
  | python3 -m json.tool
```

**Expected output:**
```json
{
  "user": {
    "id": "...",
    "email": "admin@sourcevia.com",
    "name": "Admin User",
    "role": "admin",
    "created_at": "..."
  }
}
```

If you see this, the backend is 100% working. The issue is in the frontend/browser.

## Next Steps

1. Open browser console (F12)
2. Go to login page
3. Try to login
4. Check console for 🔐 and ❌ messages
5. Share screenshot if still having issues

The detailed logging will tell us exactly what's wrong!
