# 🔍 Audio Halt Debugging Guide

## 🎯 What to Look For in Console Logs

I've added comprehensive logging. When audio halts, look for one of these patterns:

### **1. HALT DETECTED - Unexpected Pause**
```
⚠️ [HALT DETECTED] Audio paused unexpectedly at 12.34s / 45.67s
   readyState=2, networkState=2
```
**Reason**: Audio randomly paused during playback
**Check**: See "Codes Below" for readyState/networkState meanings

### **2. STOP AUDIO CALLED - Someone Stopped It**
```
🛑 [STOP AUDIO CALLED] Stopped at 12.34s / 45.67s
   Called from: ChatAgent-Sarvam.jsx:295
```
**Reason**: stopCurrentAudio() was called
**Check**: Look at the line number - is it unexpected?

### **3. Stalled/Suspended - Network Issue**
```
⚠️ [Stalled] Audio playback stalled - buffering?
⚠️ [Suspend] Audio loading suspended
```
**Reason**: Sarvam API stream interrupted
**Check**: Network tab in DevTools

### **4. Streaming Error - MediaSource Issue**
```
❌ Streaming error: InvalidStateError
❌ [SourceBuffer Error]: event
```
**Reason**: MediaSource API error
**Check**: Likely a browser compatibility issue

### **5. Slow Updates - Buffer Getting Stuck**
```
⚠️ [Slow Update] Buffer update took 250ms
```
**Reason**: SourceBuffer updates are slow
**Check**: System load/memory?

---

## 📊 Audio State Codes

Every 2 seconds you'll see:
```
📊 [Audio State] readyState=2 networkState=2 paused=false currentTime=15.42s
```

### readyState values:
- `0` = HAVE_NOTHING (no data)
- `1` = HAVE_METADATA (metadata loaded)
- `2` = HAVE_CURRENT_DATA (current frame available)
- `3` = HAVE_FUTURE_DATA (future data available)
- `4` = HAVE_ENOUGH_DATA (ready to play)

### networkState values:
- `0` = NETWORK_EMPTY (not connected)
- `1` = NETWORK_IDLE (connected, idle)
- `2` = NETWORK_LOADING (actively loading)
- `3` = NETWORK_NO_SOURCE (no source)

**Good state for playing**: `readyState >= 2` and `networkState=1 or 2`

---

## 🔧 Steps to Debug

### Step 1: Open Browser Console
Press `F12` → Go to **Console** tab

### Step 2: Trigger Audio Playback
Send a long message that causes audio to play

### Step 3: Watch for Patterns
Scroll through logs and look for:
- ❌ (error)
- ⚠️ (warning)
- 🛑 (stop)
- ⏸️ (pause)

### Step 4: Take Screenshots
When audio halts, screenshot the console. Save it.

### Step 5: Share Key Info
Tell me:
1. **Where does it halt?** (beginning, middle, end?)
2. **What error/warning appears?** (Copy the log message)
3. **Does it ever resume?** (Yes/No)
4. **How long does it play before halting?** (X seconds)

---

## 🚨 Common Causes (in order of likelihood)

### **Cause 1: Network Interruption** (Most Common)
**Signs**:
```
⚠️ [Stalled] Audio playback stalled
⚠️ [Suspend] Audio loading suspended
```
**Solution**: Check internet connection, Sarvam API status

### **Cause 2: stopCurrentAudio() Called Unexpectedly**
**Signs**:
```
🛑 [STOP AUDIO CALLED] Stopped at 5.00s / 60.00s
```
**Solution**: Don't call user actions during playback

### **Cause 3: Browser Audio Context Suspended**
**Signs**:
```
⚠️ [HALT DETECTED] Audio paused unexpectedly
   readyState=2, networkState=1
```
**Solution**: Click page before sending message

### **Cause 4: Large Buffer Issues**
**Signs**:
```
⚠️ [Slow Update] Buffer update took 500ms
❌ [SourceBuffer Error]
```
**Solution**: Sarvam API might be slow

### **Cause 5: Browser Memory/Performance**
**Signs**:
```
Multiple ⚠️ [Slow Update] messages in a row
```
**Solution**: Close other tabs, restart browser

---

## 🧪 Quick Test

Run this in console to check audio:
```javascript
// Test audio element directly
const audio = new Audio();
audio.src = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
audio.play();
audio.addEventListener('pause', () => console.log('Paused!'));
audio.addEventListener('ended', () => console.log('Ended!'));
```

If this halts, it's a **browser issue**, not our code.

---

## 💾 How to Share Debug Info

When you report the issue, include:
1. **Console screenshots** (show the full log sequence)
2. **When it halts** (immediately? after 30 seconds?)
3. **What voice you're using**
4. **Browser version** (Chrome, Firefox, Edge)
5. **Internet speed** (slow/fast/unstable)

---

## 🎯 Next Steps

1. **Start the app**
2. **Open DevTools** (F12)
3. **Send a long message**
4. **Watch console logs**
5. **When audio halts, take screenshot**
6. **Share the logs with me**

Then I can pinpoint the exact cause! 🔍
