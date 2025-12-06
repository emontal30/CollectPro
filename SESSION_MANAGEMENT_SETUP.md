# Session Management Setup Guide

## 🚀 Overview

This guide explains how to set up and configure the new session management system for the CollectPro application.

## 📋 Prerequisites

- Node.js and npm installed
- Supabase project created
- Basic understanding of environment variables

## 🔧 Configuration Steps

### Step 1: Supabase Setup

1. **Create a Supabase Project** ()
   - Goif not already done to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Configure Environment Variables**
   
   Edit the `.env` file in the project root:
   ```env
   # Supabase Configuration - REQUIRED
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   
   # Session Management Configuration - OPTIONAL
   VITE_SESSION_MANAGEMENT_ENABLED=false
   ```

### Step 2: Session Management Options

#### Option A: Persistent Login (Default - Recommended for Development)
```env
VITE_SESSION_MANAGEMENT_ENABLED=false
```
- ✅ User stays logged in indefinitely
- ✅ No automatic logout
- ✅ Best for development and internal use

#### Option B: Session Management (24-hour timeout)
```env
VITE_SESSION_MANAGEMENT_ENABLED=true
```
- ✅ 24-hour automatic logout on inactivity
- ✅ Activity tracking across all user interactions
- ✅ Enhanced security with session validation
- ✅ Smart page restoration after login

### Step 3: Restart Development Server

After configuring environment variables:
```bash
npm run dev
```

The server will automatically restart and load the new configuration.

## 🎯 Session Management Features

### When Enabled (VITE_SESSION_MANAGEMENT_ENABLED=true)

#### Core Functionality
- **24-Hour Timeout**: Automatic logout after 24 hours of inactivity
- **Activity Tracking**: Monitors mouse, keyboard, touch, and visibility events
- **Smart Restoration**: Remembers last visited page for seamless return
- **Session Validation**: Checks validity before accessing protected routes

#### Technical Implementation
- **Composable Pattern**: `useSessionManager()` for Vue 3 Composition API
- **Router Guards**: Automatic session checks in navigation
- **Memory Management**: Proper cleanup of event listeners and intervals
- **Error Handling**: Graceful fallbacks for network or configuration issues

### When Disabled (Default)

#### Backward Compatibility
- ✅ **No Impact**: Existing functionality preserved
- ✅ **Zero Overhead**: No performance cost
- ✅ **Persistent Login**: Users stay logged in indefinitely
- ✅ **Full Compatibility**: All existing features work unchanged

## 🛠️ Development Workflow

### Adding Session Management to Existing Components

```vue
<script setup>
import { useSessionManager } from '@/composables/useSessionManager'

const { 
  checkSessionValidity, 
  updateLastActivity, 
  saveCurrentPage 
} = useSessionManager()

// Check session manually if needed
const handleProtectedAction = async () => {
  const isValid = await checkSessionValidity()
  if (!isValid) {
    // Handle session expiry
    return
  }
  // Continue with action
}
</script>
```

### Router Integration

The session management automatically integrates with Vue Router:

```javascript
// router/index.js - Already configured
 (to, fromrouter.beforeEach(async, next) => {
  // Session validation happens automatically
  // No additional code needed
})

router.afterEach((to, from) => {
  // Page tracking happens automatically  
  // No additional code needed
})
```

## 🔍 Troubleshooting

### Common Issues

#### 1. "supabaseUrl is required" Error
**Cause**: Missing or incorrect Supabase environment variables
**Solution**: 
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key
```

#### 2. Users getting logged out unexpectedly
**Cause**: Session management enabled without proper configuration
**Solution**: 
```env
VITE_SESSION_MANAGEMENT_ENABLED=false
```

#### 3. Activity tracking not working
**Cause**: Session management disabled or event listeners not setup
**Solution**: 
```env
VITE_SESSION_MANAGEMENT_ENABLED=true
# Ensure App.vue calls sessionManager.initializeSession()
```

### Debug Mode

Enable detailed logging by checking browser console:
- 🕰️ Session management logs
- 👁️ Activity tracking logs  
- 🛡️ Router guard logs
- 📍 Page tracking logs

## 📚 File Structure

```
src/
├── composables/
│   └── useSessionManager.js    # Core session management logic
├── router/
│   └── index.js               # Router guards and page tracking
├── App.vue                    # Session initialization
├── services/
│   └── authService.js         # Supabase configuration
└── .env                       # Environment configuration
```

## 🔒 Security Considerations

### When Session Management is Enabled
- ✅ Automatic logout prevents unauthorized access after timeout
- ✅ Activity tracking detects user presence
- ✅ Session validation on protected routes
- ✅ Clean logout removes all session data

### When Disabled
- ✅ Existing security measures remain intact
- ✅ Supabase handles authentication securely
- ✅ No additional attack surface introduced

## 🚀 Production Deployment

### Environment Variables
Ensure all required variables are set in production:
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_SESSION_MANAGEMENT_ENABLED=true  # or false based on requirements
```

### Recommended Settings

#### High Security Applications
```env
VITE_SESSION_MANAGEMENT_ENABLED=true
```

#### Internal Tools/Development
```env
VITE_SESSION_MANAGEMENT_ENABLED=false
```

## 📞 Support

If you encounter issues:

1. Check browser console for error messages
2. Verify environment variables are correctly set
3. Ensure Supabase project is properly configured
4. Review the implementation in `src/composables/useSessionManager.js`

## 🎉 Success Indicators

When everything is working correctly, you should see:
- ✅ Application loads without Supabase errors
- ✅ Authentication flow works properly
- ✅ Session management logs in console (when enabled)
- ✅ Page tracking works across navigation
- ✅ No console errors related to session management