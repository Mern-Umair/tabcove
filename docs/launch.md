# Launch plan and ready-to-post text

The research behind this: for a solo maker with no audience, the first paying customers come from communities
(Reddit, Discord) far more often than from store search or Product Hunt, and a $5–17 one-time price converts better
than subscriptions. So the plan is: ship to the store, then show up where people are complaining about losing tabs.

## Order of work (after the code is done)

1. Accounts: Payoneer, Gumroad (bank details, product "Tabcove Pro" $9.99 with licence keys ON), Chrome Web Store
   developer ($5), Reddit (make it now; post after it is 2+ weeks old and has some comment karma from helping people).
2. Set `GUMROAD_PRODUCT_ID` and `PRO_URL` in `src/lib/license.ts`, `npm run check`, `npm run zip`.
3. Store listing from `store/listing.md`, screenshots from `store/screenshots/`, privacy URL = PRIVACY.md on GitHub.
   Submit. Review takes 1 day to 2 weeks.
4. While waiting: GitHub repo public, GitHub Pages or the repo README as the home page. Reply to comments on the
   threads below without a link yet; add the link the day the listing is live.
5. Listing live: post in the subreddits below (one per day, not all at once), reply to every comment within hours.
6. Week 2 onward: one small improvement per week (changelog in the store "What's new"), one post or helpful reply a
   day, answer every store review.

## Where to post, and what each one allows

- r/chrome_extensions: makers may post their extension; say it is yours, what it does, free/Pro. Good first post.
- r/productivity: no self-promo posts; helpful comments only, mention Tabcove only when someone asks for a tool.
- r/chrome, r/browsers: "I made this" posts are allowed on some days; read the sidebar first.
- r/SideProject, r/indiehackers: launch posts welcome; readers are makers, not many buyers, but good feedback.
- Session Buddy and OneTab complaint threads (search Reddit for "session buddy lost sessions", "onetab lost tabs",
  "chrome crashed lost tabs"): reply with the practical fix first (export, check backups), then one line about Tabcove.
- Hacker News "Show HN": one post, early morning US time, title "Show HN: Tabcove – save, restore and back up Chrome tabs, no account".
- Product Hunt: launch once the first ten reviews exist; expect signups, not sales.

Rules that keep accounts safe: never post the same text twice, never post a link in a subreddit that bans promotion,
always disclose "I made this", reply to criticism without arguing.

## Post 1: r/chrome_extensions (launch)

Title: I made Tabcove: saves and backs up your tabs automatically, restores in one click, nothing leaves your computer

Body:

> Last month Chrome restarted for an update and I lost two days of research tabs. Session Buddy's new version had
> eaten my saved sessions, so I built the thing I wanted:
>
> - Every window is backed up automatically (only when something changed), and a window you close is kept so you
>   can bring it back.
> - Save all windows with Ctrl+Shift+S, or "save and close all" to free memory.
> - Restore a whole session, one window, or just the tabs you tick. Tabs open lazily, so 200 tabs come back in
>   seconds without eating RAM.
> - Search across every saved session and backup.
> - Keeps pinned tabs and tab groups.
> - No account, no sync server, no analytics. Everything stays in your browser. Export to a file any time; imports
>   OneTab and Session Buddy exports.
>
> Free: 24 hours of backups and 5 saved sessions. Pro is $9.99 once (not a subscription) for unlimited sessions and
> backups kept forever.
>
> Link: [store link]. I'd really like to hear what is missing, I'm shipping fixes weekly.

## Post 2: reply template for "I lost my tabs" threads

> Two things to try right now: (1) Ctrl+Shift+T a few times, Chrome reopens closed tabs in order; (2) chrome://history,
> filter by today, select and open. For next time, use something that backs up automatically rather than on demand;
> I built Tabcove for exactly this (free, local-only), but any session manager with timed backups will do.

## Post 3: Show HN

Title: Show HN: Tabcove – automatic tab backups for Chrome, local-only, $9.99 once for Pro

Body:

> Tabcove keeps a live snapshot of every Chrome window, writes a backup every 30 minutes when something changed,
> and keeps windows you close. Restore is lazy (tabs are created then discarded, so they load on click).
> Storage is chrome.storage.local only; the one network request is the Gumroad licence check if you buy Pro.
> Built with Preact + Vite, MV3, ~70 KB. Happy to answer questions about the MV3 service-worker lifecycle, which
> was the hardest part (the worker is killed after 30 s, so every snapshot has to be cheap and idempotent).

## Store "What's new" template

> 1.0.1: faster search, fixes for [thing]. Tell us what to improve: umairii2207@gmail.com

## Measuring

- Store: Developer Dashboard → Stats (impressions, installs, uninstalls) weekly.
- Gumroad: sales, and which day they came (match to posts).
- Reddit: comments and upvotes per post; delete nothing, answer everything.
- Honest expectation from the research: 0–50 users in month 1 from the store alone; community posts are what move it.
