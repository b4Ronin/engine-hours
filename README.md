# Engine Hours Tracker (Offline Web App)

Simple, fast, offline-first web app for logging equipment hours during rounds.

Designed for:
- One-hand use
- No keyboard (custom keypad)
- Real-world engine room workflow

---

## Features

- Offline use (after first load)
- Custom number pad (bottom 1/3 screen)
- ENTER key navigation (auto-advance)
- Auto-calculations:
  - BT2 → fills BT1
  - Azipull Port → fills Stbd
- Setup Mode (one-time initialization)
- End Day Lock (prevents edits)
- View Today (full-screen read-only display)
- Auto daily rollover (today → tomorrow previous)

---

## Installation (iPhone / Android)

1. Open the app link in browser  
2. Tap:
   - iPhone: Share → Add to Home Screen  
   - Android: Menu → Install App / Add to Home Screen  

---

## First-Time Setup (IMPORTANT)

1. Tap **Setup Mode**
2. Enter ALL current meter readings (including BT1 + Azipull Stbd)
3. Tap **End Day Lock**

This creates your baseline.

---

## Daily Use

1. Open app
2. Enter today’s readings:
   - BT2 only (BT1 auto-fills)
   - Azipull Port only (Stbd auto-fills)
3. Press ENTER to move through list
4. Tap **End Day Lock** when done

---

## View Mode

- Tap **View Today**
- Displays all values full screen
- No editing
- Keypad hidden

---

## Data Behavior

- Data is stored locally on your device
- No syncing between users
- Each device is independent
- Clearing browser data will erase logs

---

## Updating the App

1. Upload new files to GitHub repo
2. Same URL updates automatically
3. If changes don’t show:
   - Refresh browser
   - Or reinstall Home Screen app

---

## Notes

- Setup Mode should only be used once
- Do not edit locked fields (BT1 / Azipull Stbd)
- Designed to replace clipboard-based logging

---

## Version

Current Version: V15
