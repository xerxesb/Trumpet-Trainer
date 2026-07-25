# 🎺 Sophie's Trumpet Practice Tracker

A cute, iPad-friendly web app for tracking trumpet practice.

## Features

- **⏱️ Live timer** — start/stop/reset while practising, then save the session
  with an optional note. Timing is measured from the real clock, so it stays
  accurate even if the iPad screen locks or the tab goes to the background.
- **✏️ Add a past session** — forgot to track a day? Enter the date, duration,
  and a note to add it after the fact.
- **📊 Stats** — total practice, session count, average per session, and a
  day streak.
- **🎯 Weekly goal** — set a minutes-per-week goal and watch the progress bar
  (with encouraging messages) fill up.
- **🗒️ History** — a scrollable list of every session, with delete.

All data is stored locally in the browser (`localStorage`) — nothing leaves the
device and no account is needed.

## Running it

It's a plain static site — no build step. Open `index.html` in a browser, or
serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### On an iPad

Open the hosted URL in Safari, then **Share → Add to Home Screen** to launch it
full-screen like a real app.

## Files

- `index.html` — markup
- `style.css` — the cute pink/purple theme
- `app.js` — timer, manual entry, stats, and `localStorage` persistence
