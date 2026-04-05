# 🧹 Cleanup Guide - Remove Unused Files

## Files to DELETE

### Old Component Files ❌
```bash
# Remove old versions (use Fixed versions instead)
rm src/ChatAgent.jsx                    # Old version
rm src/ChatAgent-Professional.jsx       # Old version
rm src/ChatAgent-Sarvam.jsx            # Old version (will be replaced)
```

### Old Service Files ❌
```bash
# Remove old versions
rm src/services/sarvamTtsService.js     # Old version
```

### Old Backend Files ❌
```bash
# Remove old n8n agent (using improved version)
rm backend/n8n-agent.js                # Old version
```

### Documentation Files to DELETE ❌
```bash
# Remove outdated/reference docs
rm SPEECH_SERVICES_ANALYSIS.md          # Old analysis
rm SARVAM_SETUP_GUIDE.md               # Old setup
rm SARVAM_QUICK_REFERENCE.md           # Old reference
rm SARVAM_INTEGRATION_SUMMARY.md       # Old summary
rm SARVAM_VISUAL_GUIDE.md              # Old visual guide
rm SARVAM_DEBUG.md                     # Old debugging
rm VITE_ENV_FIX.md                     # Old fix
rm SARVAM_CORRECT_IMPLEMENTATION.md    # Old implementation
rm CODE_REVIEW.md                      # Old code review
rm UI_IMPROVEMENT_REPORT.md            # Old UI report
rm IMPLEMENTATION_GUIDE.md             # Old guide
rm DELIVERABLES_SUMMARY.md             # Old summary
```

---

## Files to KEEP ✅

### Core Component Files
```bash
✅ src/ChatAgent-Sarvam-Fixed.jsx      # KEEP - Main component
   → Rename to: ChatAgent-Sarvam.jsx or ChatAgent.jsx
```

### Core Service Files
```bash
✅ src/services/sarvamTtsService-Fixed.js  # KEEP - TTS service
   → Rename to: sarvamTtsService.js
```

### Styling
```bash
✅ src/ChatAgent.css                   # KEEP - All styles
```

### Backend Files
```bash
✅ backend/server.js                   # KEEP - Main server
✅ backend/n8n-agent-improved.js       # KEEP - N8N integration
```

### Configuration
```bash
✅ .env                                # KEEP - API keys
✅ .env.local                          # KEEP - Local config
✅ package.json                        # KEEP - Dependencies
✅ vite.config.js                      # KEEP - Build config
```

### Documentation (KEEP only this one)
```bash
✅ SARVAM_VOICE_REFERENCE.md          # KEEP - Voice list reference
✅ QUICK_FIX.md                       # KEEP - Quick reference
✅ README.md (if exists)              # KEEP - Project readme
```

---

## Cleanup Commands

### Option 1: Manual Cleanup
```bash
# Remove old components
rm src/ChatAgent.jsx
rm src/ChatAgent-Professional.jsx
rm src/ChatAgent-Sarvam.jsx

# Remove old service
rm src/services/sarvamTtsService.js

# Remove old backend
rm backend/n8n-agent.js

# Remove all old MD files
rm SPEECH_SERVICES_ANALYSIS.md
rm SARVAM_SETUP_GUIDE.md
rm SARVAM_QUICK_REFERENCE.md
rm SARVAM_INTEGRATION_SUMMARY.md
rm SARVAM_VISUAL_GUIDE.md
rm SARVAM_DEBUG.md
rm VITE_ENV_FIX.md
rm SARVAM_CORRECT_IMPLEMENTATION.md
rm CODE_REVIEW.md
rm UI_IMPROVEMENT_REPORT.md
rm IMPLEMENTATION_GUIDE.md
rm DELIVERABLES_SUMMARY.md
rm CLEANUP_GUIDE.md  # Remove this file after cleanup
```

### Option 2: One-liner
```bash
# Remove ALL old documentation
rm SPEECH_SERVICES_ANALYSIS.md SARVAM_SETUP_GUIDE.md SARVAM_QUICK_REFERENCE.md \
   SARVAM_INTEGRATION_SUMMARY.md SARVAM_VISUAL_GUIDE.md SARVAM_DEBUG.md \
   VITE_ENV_FIX.md SARVAM_CORRECT_IMPLEMENTATION.md CODE_REVIEW.md \
   UI_IMPROVEMENT_REPORT.md IMPLEMENTATION_GUIDE.md DELIVERABLES_SUMMARY.md

# Remove old components and services
rm src/ChatAgent.jsx src/ChatAgent-Professional.jsx src/ChatAgent-Sarvam.jsx \
   src/services/sarvamTtsService.js backend/n8n-agent.js
```

---

## Rename Fixed Files

### Rename Component
```bash
# Option A: Use as ChatAgent-Sarvam.jsx
mv src/ChatAgent-Sarvam-Fixed.jsx src/ChatAgent-Sarvam.jsx

# Option B: Use as main ChatAgent.jsx
mv src/ChatAgent-Sarvam-Fixed.jsx src/ChatAgent.jsx
```

### Rename Service
```bash
mv src/services/sarvamTtsService-Fixed.js src/services/sarvamTtsService.js
```

---

## Final Directory Structure

```
your-project/
│
├── src/
│   ├── ChatAgent-Sarvam.jsx           ✅ Main component (renamed from -Fixed)
│   ├── ChatAgent.css                  ✅ Styles
│   ├── services/
│   │   └── sarvamTtsService.js        ✅ TTS service (renamed from -Fixed)
│   ├── App.jsx
│   └── main.jsx
│
├── backend/
│   ├── server.js                      ✅ Main server
│   ├── n8n-agent-improved.js         ✅ N8N integration
│   └── package.json
│
├── .env                                ✅ API keys
├── package.json                        ✅ Dependencies
├── vite.config.js                      ✅ Build config
│
├── SARVAM_VOICE_REFERENCE.md           ✅ Voice guide
├── QUICK_FIX.md                        ✅ Quick reference
├── README.md                           ✅ Project docs
│
└── (All other MD files deleted)        ❌ Removed
```

---

## Verification Checklist

After cleanup:

- [ ] Old files deleted
- [ ] Fixed files renamed to correct names
- [ ] Component imports updated
- [ ] App.jsx imports ChatAgent-Sarvam.jsx correctly
- [ ] npm start works without errors
- [ ] App loads successfully
- [ ] Voice selector appears
- [ ] Can send messages
- [ ] Audio plays with voice
- [ ] No console errors

---

## Git Commands (if using git)

```bash
# Add all deletions and changes
git add -A

# See what will be deleted
git status

# Commit cleanup
git commit -m "cleanup: remove unused files and old documentation"
```

---

## Quick Test After Cleanup

```bash
# 1. Restart server
npm run dev

# 2. Check for import errors
# (should see no errors in console)

# 3. Test functionality
# - Open app
# - Select voice
# - Send message
# - Hear response
```

---

## Summary

**Deleting:**
- ❌ 12+ old markdown documentation files
- ❌ 3 old component versions
- ❌ 1 old service file version
- ❌ 1 old backend file version

**Keeping:**
- ✅ 1 main component (ChatAgent-Sarvam-Fixed.jsx)
- ✅ 1 service file (sarvamTtsService-Fixed.js)
- ✅ 1 stylesheet (ChatAgent.css)
- ✅ Core backend files
- ✅ Configuration files
- ✅ 2 key reference docs

**Result:** Clean, minimal codebase with only working files!

---

Ready to cleanup? Let me know and I can help with the renaming!
