# Tabcove privacy policy

Last updated 21 October 2026

Tabcove is a browser extension that saves, restores and backs up your tabs and windows. This page explains what it
does with your data. The short version: everything stays in your browser, on your computer, and nothing is sent to
us or to anyone else.

## What Tabcove stores

- The addresses (URLs) and titles of your open tabs, which tabs are pinned or grouped, and which windows they are in.
- The sessions you save, the automatic backups, closed windows and the previous session.
- Your settings and, if you buy Pro, your licence key.

All of this is kept in Chrome's local extension storage (`chrome.storage.local`) in your browser profile. It is not
synced through your Google account, not uploaded to any server, and not visible to us. Removing the extension deletes
it. You can also delete it at any time from Settings → Delete all data, and export it as a file from the same page.

## What Tabcove does not do

- It does not read, change or collect the content of the pages you visit. It never injects scripts into pages.
- It does not collect your browsing history, searches, form entries, passwords or personal information.
- It does not use analytics, tracking, advertising or any third-party service while you use it.
- It does not sell, share or transfer any data. There is nothing to sell.

## The one network request: licence checks

If you enter a Pro licence key, Tabcove sends that key to Gumroad (`api.gumroad.com`) to confirm the purchase, once
when you enter it and again about once a week. Only the key and the product identifier are sent; no tab data. Gumroad's
own privacy policy applies to that request (https://gumroad.com/privacy). Without a licence key the extension makes no
network requests at all.

## Permissions, and why each one is needed

- **tabs** and **tabGroups**: to read the URL, title, pin state and group of your tabs, and to reopen them.
- **storage** and **unlimitedStorage**: to keep sessions and backups on your computer, including very large ones.
- **alarms**: to make the timed backups while the extension is idle.
- **favicon**: to show each site's icon in the list, from Chrome's own icon cache.
- **api.gumroad.com**: only for the Pro licence check described above.

## Incognito

Tabcove is not enabled in incognito windows unless you allow it in Chrome's extension settings, and it never records
incognito tabs in sessions or backups either way.

## Children

Tabcove is a general-purpose tool and is not directed at children under 13.

## Changes and contact

If this policy changes, the date at the top changes with it and the new version is published at the same address.
Questions: umairii2207@gmail.com.
