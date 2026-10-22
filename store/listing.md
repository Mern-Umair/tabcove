# Chrome Web Store listing: Tabcove

Paste into the Developer Dashboard. Store search ranks on the name, the summary and the first lines of the
description, so the phrases people type ("save tabs", "session manager", "restore tabs", "tab backup") lead.

## Name (max 75; shown in search results)

```
Tabcove: Save, Restore & Back Up Tabs
```

## Summary / short description (max 132)

```
Never lose your tabs again. Auto-saves every window, restores sessions in one click, backs up tabs on your computer. No account.
```
(129 characters; same text as `description` in manifest.json.)

## Category

Productivity → Workflow & Planning (fallback: Tools)

## Language

English

## Detailed description (max 16,000; plain text, no HTML)

```
Tabcove saves your tabs so a crash, an accidental close or a "restart to update" never costs you a day of research again.

SAVE TABS WITH ONE CLICK
• Save all windows as a named session from the toolbar button or Ctrl+Shift+S
• "Save and close all windows" to clear the decks and free memory, with everything kept
• Sessions keep pinned tabs, tab groups (names and colours) and which window each tab was in

RESTORE TABS THE WAY YOU WANT
• Open a whole session, one window, or just the tabs you tick
• Tabs open without loading until you click them, so 200 tabs come back in seconds and use almost no memory
• Open into new windows or into the window you are in

AUTOMATIC BACKUPS, SO THERE IS NOTHING TO REMEMBER
• Every window is backed up on a timer (every 30 minutes by default; only when something changed)
• A window you close is kept as a "closed window" you can bring back
• What was open before the browser last closed is kept as the previous session
• Crash recovery: reopen everything from the last backup

FIND ANY TAB YOU EVER SAVED
• Search titles and addresses across every saved session and backup
• Filter inside a session, select tabs, open or remove them

YOUR DATA STAYS ON YOUR COMPUTER
• No account, no sign-in, no sync server, no analytics
• Everything is stored in your browser profile; export it as a file any time, import it on another computer
• Imports OneTab exports, Session Buddy exports and plain lists of links, so switching takes a minute
• Tabcove never reads the content of your pages; it only needs the tab titles and addresses

FREE AND PRO
Free: automatic backups for the last 24 hours, 5 saved sessions, search, export. That is enough for most people.
Pro ($9.99 once, no subscription): unlimited saved sessions, every backup kept for as long as you set, import. One payment, works on all your computers.
Pro is sold by the developer (not by Google or Microsoft) through Gumroad, with a 14-day refund if it does not work for you.

WHO IT IS FOR
Researchers, developers, students, anyone with 40 tabs open who has lost them all at least once. If you used Session Buddy, OneTab, Tab Session Manager or Toby and want something simpler and safer, this is it.

Keyboard shortcuts: Ctrl+Shift+S saves all windows, Ctrl+Shift+Y opens the manager (change them at chrome://extensions/shortcuts).

Questions or ideas: umairii2207@gmail.com
```

## Screenshots (1280×800 PNG, up to 5; text in the image must be real UI)

1. Manager page, "Open now" with 2 windows and ~20 tabs, light theme. Caption overlay: "Every window, saved automatically".
2. Saved session with the title field and the Open all button. Caption: "Restore all, one window, or just the tabs you tick".
3. Search results across sessions for a word. Caption: "Find any tab you ever had open".
4. Popup over a busy browser window. Caption: "One click to save, one to save and close".
5. Settings page, dark theme, Pro box. Caption: "Your data stays on your computer".

Small promo tile 440×280 and marquee 1400×560: icon on the teal background, name, and the line
"Never lose your tabs again".

## Privacy tab answers

- Single purpose: "Saves, restores and backs up the user's tabs and windows."
- Permission justifications:
  - tabs: read tab URLs and titles to save them, and open them to restore.
  - tabGroups: keep tab group names and colours in saved sessions.
  - storage, unlimitedStorage: store sessions and backups locally; large sessions exceed the default quota.
  - alarms: run the timed backup while the extension is idle.
  - favicon: show site icons in the session list from Chrome's icon cache.
  - host permission api.gumroad.com: verify a Pro licence key the user enters; nothing else is sent.
- Remote code: No.
- Data usage: tick nothing (no data collected). Certify the three statements.
- Privacy policy URL: https://github.com/Mern-Umair/tabcove/blob/main/PRIVACY.md (or the GitHub Pages address once set up).

## Distribution

Public, all regions, free listing (payment happens on Gumroad; the extension only checks a key).
