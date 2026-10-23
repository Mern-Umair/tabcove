# Launch plan and ready-to-post text (updated 22 Oct 2026 after research)

Research notes: D:\research_notes\Tabcove launch tactics\ (Reddit rules, case studies, other channels,
conversion). The numbers that matter: free-to-paid for extensions is 0.3–2%, so the first sale needs roughly
100–300 real installs. A Reddit post brings tens of installs, not hundreds. The store listing is the engine; posts,
directories and press feed it. Makers who got a sale within days did three things on launch day: good listing,
one-time price, 3–4 channels at once (not the same link everywhere in one hour).

Store links (both live 22 Oct 2026): Chrome https://chromewebstore.google.com/detail/tabcove-save-restore-back/ccmjgbajjpimmhdnacanbbhmfjecjnlp and Edge https://microsoftedge.microsoft.com/addons/detail/dhjlfjgodmjdbnnpaebngfdiplpdegph

## Before approval (every day, 20 minutes)

- Reddit (u/umair_tahir_dev): 5–10 genuine comments on New/Rising posts in r/chrome_extensions ("looking for an
  extension" threads), r/browsers, r/webdev, r/NoStupidQuestions. No links, no Tabcove, no VPN, no AI-written text.
  Goal: 50–100 comment karma in 5–7 days. Verify the email address in Reddit settings.
- Shadowban check once: open reddit.com/appeal while logged in, or view your profile in an incognito window.

## Approval day (in this order)

1. Me (done 23 Oct): store links are in site/index.html, README.md,
   GUIDE.md, this file; upload 1.0.2 (tabcove-1.0.2.zip) as the first update.
2. Gumroad (you): Products → Tabcove Pro → Discounts (left menu "Checkout" → "Discounts") → New discount:
   code LAUNCH40, 40% off, limit 50 uses, expires in 7 days. Share link: https://tabcove.gumroad.com/l/pro/LAUNCH40
   Settings → Payments: "Show buyers their local currency" stays on; enable purchasing-power-parity discounts if the
   product page offers it. Product → Settings: "Publicly show the number of sales" OFF until 10 sales. Reviews ON.
3. Post 1 in r/chrome_extensions with the "Self Promotion" flair, Tuesday–Thursday 5–7 PM Pakistan time (8–10 AM
   US East). GIF: store/demo.gif. Text below.
4. Free directories (30 minutes): AlternativeTo (add Tabcove as an alternative to Session Buddy, OneTab, Toby,
   Workona), SaaSHub, Slant ("What are the best tab managers for Chrome"). Text below.
5. Three press emails (text below): Chrome Story offlineblog.net@gmail.com, 9to5Google gtips@9to5g.com, Chrome
   Unboxed info@chromeunboxed.com.

## Days 1–7 after approval (one place per day; never the same link in 3+ places within an hour)

- r/SideProject: Monday ~7 PM PKT or weekend US morning; title "[Tabcove] - ..." ; post the GIF as a video/GIF post.
- r/indiehackers: once, with the "SHOW IH" flair.
- r/software: Wednesday only, flair "Self-Promotion Wednesdays", must include a deal (the LAUNCH40 code).
- r/alphaandbetausers and r/betatests: title "[Chrome, Beta] Tabcove – ..." with the link.
- Complaint threads (help first, one line about Tabcove, say "I made it"): search Reddit for "session buddy lost
  sessions", "onetab lost tabs", "toby paywall", "chrome crashed lost tabs". Known ones: Session Buddy data loss in
  r/chrome (Jul 2025), OneTab update anger in r/firefox (Oct 2025). r/chrome bans promotion posts, so there only reply
  helpfully; the one line about Tabcove is a comment, not a post, and still a risk: keep it to one.
- Show HN: once, Tuesday–Thursday 5–7 PM PKT. Link to the landing page, not the store. Text below.
- 3–5 short before/after clips (10–20 s, phone screen recording of the GIF is fine) to YouTube Shorts / TikTok /
  Instagram Reels with the landing page in the description.
- Day 7+: the extension itself asks happy users for a review (built into 1.0.2).

## Do not post in

r/chrome (promotion of extensions not allowed), r/productivity (no self-promotion in any form),
r/InternetIsBeautiful (no extensions), r/startups, r/Entrepreneur, r/SaaS, r/webdev except Showoff Saturday.
Never ask for upvotes anywhere (Product Hunt bans it). Never put the Gumroad link or the price in a Reddit post body.

## Week 2

- Product Hunt: self-hunt (no hunter needed), schedule for 12:01 AM Pacific, ask friends to "visit and comment",
  never "upvote". Expect a backlink and a few installs, not sales.
- Ship 1.0.3 with whatever the first users asked for; reply to every review and every comment.

---

## Post 1: r/chrome_extensions (flair: Self Promotion)

Title:

```
I made Tabcove: automatic tab backups for Chrome, restores in one click, nothing leaves your computer
```

Body (attach store/demo.gif as the image):

```
Last month Chrome restarted for an update and I lost two days of research tabs. Session Buddy had eaten my saved sessions the week before, so I built the thing I wanted:

- Every window is backed up automatically (only when something changed), and a window you close is kept so you can bring it back.
- Save all windows with Ctrl+Shift+S, or "save and close all" to free memory.
- Restore a whole session, one window, or just the tabs you tick. Tabs open lazily, so 200 tabs come back in seconds without eating RAM.
- Search across every saved session and backup.
- Keeps pinned tabs and tab groups.
- No account, no sync server, no analytics. Everything stays in your browser. Export to a file any time; imports OneTab and Session Buddy exports.

Free version keeps 24 hours of backups and 5 saved sessions; there is a one-time Pro, no subscription.

What is missing for you? I'm shipping fixes weekly.

I'm the dev. Store link: https://chromewebstore.google.com/detail/tabcove-save-restore-back/ccmjgbajjpimmhdnacanbbhmfjecjnlp
```

## Post 2: reply for "I lost my tabs" threads

```
Two things to try right now: (1) Ctrl+Shift+T a few times, Chrome reopens closed tabs in order; (2) chrome://history, filter by today, select and open. For next time, use something that backs up automatically rather than on demand. I made Tabcove for exactly this (free, local-only), but any session manager with timed backups will do.
```

## Post 3: r/SideProject

Title:

```
[Tabcove] - I lost 2 days of tabs to a Chrome update, so I built an extension that backs them up automatically
```

Body: same as Post 1 but add one line at the end: "Built with Preact + Vite, MV3. Happy to answer anything about
the service-worker lifecycle, which was the hard part."

## Post 4: Show HN (link to https://mern-umair.github.io/tabcove/)

Title:

```
Show HN: Tabcove – automatic, local-only tab backups for Chrome (MV3, open source)
```

First comment (post it yourself right after submitting):

```
Tabcove keeps a live snapshot of every Chrome window, writes a backup every 30 minutes when something changed, and keeps windows you close. Restore is lazy: tabs are created then discarded, so they load on click. Storage is chrome.storage.local only; the one network request is a Gumroad licence check if you buy Pro.

The hard part was MV3: the service worker is killed after ~30 s, so every snapshot has to be cheap and idempotent, and timed work goes through chrome.alarms. Source: https://github.com/Mern-Umair/tabcove
```

## Post 5: r/software (Wednesday, flair Self-Promotion Wednesdays)

```
Tabcove: Chrome/Edge extension that backs up your tabs automatically and restores them in one click. Free tier (24 h of backups, 5 saved sessions). Pro is one-time, and for this week the code LAUNCH40 takes 40% off. Everything stays on your computer. I'm the developer. https://chromewebstore.google.com/detail/tabcove-save-restore-back/ccmjgbajjpimmhdnacanbbhmfjecjnlp
```

## Press email (adjust the first line per site)

Subject: `New extension: automatic tab backups for Chrome, local-only, one-time Pro`

```
Hi [name],

I read your piece on [their recent tab-manager/extension article]. I built something your readers might like.

Tabcove is a Chrome and Edge extension that backs up every window automatically, keeps windows you close, and restores a session in one click (tabs load lazily, so 200 tabs come back in seconds). No account, no sync server, no analytics; everything stays in the browser profile. It imports OneTab and Session Buddy exports.

Free: 24 hours of backups and 5 saved sessions. Pro: $9.99 once, no subscription.

Store: https://chromewebstore.google.com/detail/tabcove-save-restore-back/ccmjgbajjpimmhdnacanbbhmfjecjnlp
Demo GIF and screenshots: https://mern-umair.github.io/tabcove/
Source: https://github.com/Mern-Umair/tabcove

Happy to answer questions or give you Pro keys for a review.

Umair Tahir
```

## Directory text (AlternativeTo, SaaSHub, Slant)

Name: Tabcove
Tagline (60 chars): `Automatic tab backups for Chrome and Edge, local-only`
Description:

```
Tabcove saves, restores and backs up your browser tabs. Every window is backed up automatically, closed windows are kept, and any session comes back in one click with lazy loading. Keeps pinned tabs and tab groups, searches every saved session, imports OneTab and Session Buddy exports. No account, no sync server, no analytics. Free tier; Pro is a one-time payment.
```

Alternative to: Session Buddy, OneTab, Toby, Workona, Tab Session Manager. Platforms: Chrome, Edge, Brave.
Website: https://mern-umair.github.io/tabcove/  Pricing: Freemium, one-time purchase.

## Store "What's new" text for 1.0.3 (upload tabcove-1.0.3.zip to both stores; skip 1.0.2 on Chrome)

```
1.0.3: the free-limit card now shows your own usage, backups older than 24 hours are flagged before they go, a licence key can be pasted together with the whole receipt email, and a once-a-week reminder after a restore. Tell us what to improve: umairii2207@gmail.com
```

## Measuring

- Chrome Developer Dashboard → Stats (impressions, installs, uninstalls), weekly. Edge Partner Center → Analytics.
- Gumroad: sales and the day they came; match them to posts.
- Reddit: comments and upvotes per post; delete nothing, answer everything within hours.
- Realistic: a post that lands can bring the first sale in 1–3 days; otherwise 100–300 installs take 2–4 weeks.

---

# 7-day sprint texts (added 23 Oct 2026; store links are live, use the Chrome link unless the place is Edge-specific)

Chrome: https://chromewebstore.google.com/detail/tabcove-save-restore-back/ccmjgbajjpimmhdnacanbbhmfjecjnlp
Edge: https://microsoftedge.microsoft.com/addons/detail/dhjlfjgodmjdbnnpaebngfdiplpdegph
Launch code (make it on Gumroad first): LAUNCH40, link https://tabcove.gumroad.com/l/pro/LAUNCH40

## WhatsApp / Facebook group / university group text

```
Mera Chrome extension store par aa gaya hai: Tabcove. Tabs ka automatic backup rakhta hai, Chrome crash ya restart ho ya window galti se band ho jaye to sab ek click mein wapis. Free hai, koi account nahi, data computer se bahar nahi jata. Install karke 2 din use karo aur batao kya kami lagi:
https://chromewebstore.google.com/detail/tabcove-save-restore-back/ccmjgbajjpimmhdnacanbbhmfjecjnlp
```

## X / Twitter (attach store/demo.gif)

```
Chrome restarted for an update and I lost two days of research tabs. So I built Tabcove: automatic tab backups, closed windows kept, one-click restore, everything stays on your computer. Free on the Chrome Web Store, one-time Pro, no subscription.
https://chromewebstore.google.com/detail/tabcove-save-restore-back/ccmjgbajjpimmhdnacanbbhmfjecjnlp
```

## Quora answers (questions: "How do I recover tabs after Chrome crashed", "Chrome closed all my tabs, how to get them back", "Best Session Buddy alternative")

```
Right now: press Ctrl+Shift+T a few times; Chrome reopens closed tabs in order, and it also reopens whole closed windows. If that is empty, open chrome://history, filter by today, select the pages and open them.

For next time, the only real fix is a backup that runs on its own, not one you have to remember to click. I lost two days of tabs this way and built a small extension for it, Tabcove (free, local-only): it backs up every window on a timer, keeps windows you close, and restores a session in one click without loading every tab at once. Any session manager with timed backups will do the same job; the point is to set it up before the next crash.
```

Disclosure line to add under every Quora answer: "I'm the developer of Tabcove."

## r/indiehackers (flair: SHOW IH)

Title:
```
SHOW IH: Tabcove, a tab-backup Chrome extension. Built in 2 days with an AI pair, shipped to both stores, now the hard part: first 100 users
```
Body:
```
What it is: Chrome/Edge extension that backs up every window automatically, keeps closed windows, restores in one click. Local-only, no account. Free tier, one-time Pro ($9.99, no subscription), licence via Gumroad.

Why: Chrome restarted for an update and I lost two days of research tabs; Session Buddy had lost my saved sessions the week before.

Numbers so far: 0 sales, a few dozen installs from friends, both stores approved in under 24 hours. Plan for the first 100 users: subreddit posts, three press emails, AlternativeTo/SaaSHub, Show HN, Product Hunt next week.

What I want from you: tell me where you would look for a tool like this, and what would make you pay $9.99 once instead of using the free tier.

Store: https://chromewebstore.google.com/detail/tabcove-save-restore-back/ccmjgbajjpimmhdnacanbbhmfjecjnlp
```

## r/alphaandbetausers and r/betatests

Title:
```
[Chrome, Edge] Tabcove – automatic tab backups that restore in one click, looking for feedback on the free tier limits
```
Body:
```
Tabcove backs up every browser window automatically, keeps windows you close, and restores a session (or just the tabs you tick) in one click with lazy loading. No account, no server, everything stays in your browser. Imports OneTab and Session Buddy exports.

Free: 24 h of backups, 5 saved sessions. Pro is one-time. I want to know whether those limits feel fair, and what you would expect in the free tier.

Chrome: https://chromewebstore.google.com/detail/tabcove-save-restore-back/ccmjgbajjpimmhdnacanbbhmfjecjnlp
Edge: https://microsoftedge.microsoft.com/addons/detail/dhjlfjgodmjdbnnpaebngfdiplpdegph
```

## Product Hunt (schedule for Thursday 12:01 AM Pacific = 12:01 PM Pakistan)

Name: Tabcove
Tagline (60): `Automatic tab backups for Chrome and Edge, local-only`
Description:
```
Tabcove backs up every browser window on its own, keeps the windows you close, and brings any session back in one click. Tabs load lazily, so 200 tabs come back in seconds without eating RAM. Keeps pinned tabs and tab groups, searches every saved session, imports OneTab and Session Buddy. No account, no sync server, no analytics. Free tier; Pro is one payment, not a subscription.
```
First comment:
```
Maker here. I built Tabcove after a Chrome update ate two days of research tabs. The free tier keeps 24 hours of backups and 5 saved sessions; Pro is $9.99 once. Everything stays in your browser profile; the only network request is the licence check if you buy Pro. Source is public. What would you want in the next version?
```
Gallery: store/screenshots/*.png and store/demo.gif. Topics: Chrome Extensions, Productivity, Browser Extensions.

## Reply template for every comment, review and email

```
Thanks for trying it. [answer the actual question in one or two lines]. If something does not work the way you expect, tell me the steps and I will fix it in the next update; I ship weekly.
```

## Daily log (fill every night)

| Day | Installs (Chrome dashboard) | Edge installs | Gumroad sales | Posts made | Replies answered |
|-----|-----|-----|-----|-----|-----|
