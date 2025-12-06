# Quick Browser Console Test

## How to Test Your Production Site (sourcevia.xyz)

Since the test page isn't accessible, you can run this test directly in your browser console.

### Step 1: Open Your Production Site

Go to: `https://sourcevia.xyz` or `https://www.sourcevia.xyz`

### Step 2: Open Browser Console

Press **F12** or **Right-click → Inspect → Console tab**

### Step 3: Copy and Paste This Code

```javascript
// SOURCEVIA CONNECTION TEST
console.clear();
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 SOURCEVIA CONNECTION DIAGNOSTIC');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Detect backend URL
let backendUrl = window.location.origin; // Default to same origin

if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_BACKEND_URL) {
    backendUrl = process.env.REACT_APP_BACKEND_URL;
}
if (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) {
    backendUrl = window.APP_CONFIG.BACKEND_URL;
}

console.log('📍 Current Page:', window.location.href);
console.log('🎯 Detected Backend:', backendUrl);
console.log('🌐 Backend API:', backendUrl + '/api');
console.log('');

// Check if backend URL is wrong
if (backendUrl === window.location.origin) {
    console.error('❌ PROBLEM FOUND!');
    console.error('');
    console.error('Your frontend is trying to call:');
    console.error('   ' + window.location.origin + '/api');
    console.error('');
    console.error('But your backend is actually at:');
    console.error('   https://sourcevia-mgmt.emergent.host/api');
    console.error('');
    console.error('FIX: Set this environment variable in your deployment:');
    console.error('   REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host');
    console.error('');
    console.log('Testing the REAL backend...');
    console.log('');
}

// Test connection
console.log('🔍 Testing backend connection...');
fetch((backendUrl === window.location.origin ? 'https://sourcevia-mgmt.emergent.host' : backendUrl) + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
    credentials: 'include'
})
.then(response => {
    console.log('📊 Backend Response:', response.status, response.statusText);
    return response.text();
})
.then(text => {
    console.log('📄 Response Body:', text);
    console.log('');
    
    if (text.includes('Internal Server Error')) {
        console.error('❌ Backend is crashing (500 error)');
        console.error('   This is the MongoDB connection issue');
        console.error('   Backend needs MONGO_URL with database name');
    } else if (text.includes('Invalid') || text.includes('not found')) {
        console.log('✅ Backend is WORKING!');
        console.log('   The backend is healthy');
        if (backendUrl === window.location.origin) {
            console.error('');
            console.error('❌ But your frontend is misconfigured!');
            console.error('   Fix: Set REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host');
        }
    }
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
})
.catch(error => {
    console.error('❌ Connection FAILED:', error.message);
    console.error('');
    console.error('This means one of:');
    console.error('  1. Backend server is down');
    console.error('  2. CORS is blocking the request');
    console.error('  3. Network/DNS issue');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
```

### Step 4: Read the Results

The console will show you:
- ✅ What backend URL your frontend is trying to use
- ✅ If the backend responds
- ✅ What the exact error is
- ✅ **How to fix it**

### Common Results:

#### Result 1: Frontend Misconfigured
```
❌ PROBLEM FOUND!
Your frontend is trying to call:
   https://sourcevia.xyz/api

But your backend is actually at:
   https://sourcevia-mgmt.emergent.host/api

FIX: Set this environment variable in your deployment:
   REACT_APP_BACKEND_URL=https://sourcevia-mgmt.emergent.host
```

**Solution:** Set the environment variable and redeploy frontend.

#### Result 2: Backend Returns 500 Error
```
❌ Backend is crashing (500 error)
   This is the MongoDB connection issue
   Backend needs MONGO_URL with database name
```

**Solution:** Update backend MONGO_URL to include database name.

#### Result 3: Backend Works!
```
✅ Backend is WORKING!
   The backend is healthy
```

**Solution:** Just need to configure frontend correctly.

## Alternative: Test from this Workspace

You can also test the working version here:
`https://procure-hub-14.preview.emergentagent.com/test-connection.html`

This will show you how it SHOULD work.

## What to Share

After running the test, share with me:
1. Screenshot of the console output
2. Or copy/paste the console messages

This will tell us exactly what's wrong and how to fix it.
