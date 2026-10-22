# Tabcove: Roman Urdu guide (handover)

Yeh file is liye hai ke Claude ke bina bhi, ya kisi aur Claude ke saath, kaam chalta rahe. Sab kuch yahan hai:
kya hai, kahan hai, roz kya karna hai, kya kabhi nahi karna.

## 1. Yeh cheez kya hai

Tabcove ek Chrome extension hai jo browser ke tabs save karti hai, wapis kholti hai, aur khud ba khud backup rakhti
hai. Users poori duniya ke hain. Free version 5 saved sessions aur 24 ghante ke backups rakhti hai; Pro $9.99 ek baar
(Gumroad par) unlimited kar deta hai. Paisa Gumroad se Pakistani bank mein PKR mein aata hai (taqreeban 2 hafte).

Code: `D:\tabs`. GitHub: github.com/Mern-Umair/tabcove (push ke baad). Gumroad product: https://tabcove.gumroad.com/l/pro (product ID code mein hai). Edge Add-ons (live 22 Oct 2026): https://microsoftedge.microsoft.com/addons/detail/dhjlfjgodmjdbnnpaebngfdiplpdegph . Chrome Web Store (live 22 Oct 2026): https://chromewebstore.google.com/detail/tabcove-save-restore-back/ccmjgbajjpimmhdnacanbbhmfjecjnlp

## 2. Folder ka naqsha

- `public/manifest.json`: extension ki pehchan, permissions, shortcuts. Version yahin badalti hai.
- `src/background/index.ts`: asal dimagh. Har tab change par snapshot, timer par backup, band hui window yaad rakhna,
  restore, import, licence check.
- `src/lib/`: logic jo browser ke bina test hoti hai (capture, restore, import, license, storage, model).
- `src/manager/`: bara page (sidebar, session view, search, settings, welcome).
- `src/popup/`: toolbar wala chhota popup.
- `src/ui/styles.css`: saara design. Colours upar tokens mein hain, dark mode khud aa jata hai.
- `tests/`: unit tests. `tests/e2e/run.mjs`: asli Chrome mein poora test (30 checks).
- `scripts/`: icons banana, build check, zip, screenshots.
- `store/listing.md`: Chrome Web Store ka text. `store/screenshots/`: store ki tasveerein.
- `PRIVACY.md`: privacy policy jo store listing mein link hoti hai.

## 3. Commands (D:\tabs mein, PowerShell)

```
npm ci                 # pehli baar, ya package.json badalne par
npm run check          # sab kuch: typecheck, unit tests, build, browser test (3 se 5 minute)
npm run build          # sirf dist/ banana
npm run zip            # tabcove-<version>.zip, yehi store par upload hota hai
node scripts/screenshots.mjs   # store ki tasveerein dobara banana (internet chahiye)
```

Browser test ke liye "Chrome for Testing" chahiye (asli Chrome ab unpacked extension command line se nahi kholta):

```
npx @puppeteer/browsers install chrome@stable --path .cache
```

Apne Chrome mein khud test karne ke liye: `chrome://extensions` → Developer mode on → "Load unpacked" → `D:\tabs\dist`.

## 4. Naya version nikalna (store update)

1. Code badlo, `npm run check` green ho.
2. `public/manifest.json` mein `version` barhao (1.0.0 → 1.0.1).
3. `npm run zip`.
4. https://chrome.google.com/webstore/devconsole → Tabcove → Package → Upload new package → zip → Submit for review.
5. Review 1 din se 2 hafte. Email aata hai.
5b. Edge bhi: https://partner.microsoft.com/dashboard → Microsoft Edge → Tabcove → Update → wahi zip upload → Publish. Review 1 se 7 din, email tabcove@outlook.com par aata hai.
6. Git: `git add -A`, `git commit -m "..."`, `git push`.

## 5. Pro / Gumroad setup (ek baar)

1. gumroad.com par account, Settings → Payments mein Pakistani bank.
2. Product banao: "Tabcove Pro", $9.99, "Generate a unique license key per sale" ON.
3. Product ka ID (Gumroad product page → Advanced → Product ID) copy karo.
4. `src/lib/license.ts` mein `GUMROAD_PRODUCT_ID` mein daalo, aur `PRO_URL` mein product ka link.
5. `npm run check`, version barhao, zip, store par upload.

Licence kaise chalti hai: user key daalta hai → extension Gumroad se poochti hai → sahi ho to Pro on, 30 din tak
bina internet bhi chalta hai, har 7 din dobara check. Refund hua to key kaam karna band kar deti hai.

## 6. Roz / hafta kya karna hai

- Roz 10 minute: Reddit par Session Buddy / OneTab / "lost my tabs" wali posts dhoondo, madad karo, aakhir mein
  Tabcove ka zikr (docs/launch.md mein tayyar posts hain). Spam mat karo: 1 post par 1 jawab, pehle madad.
- Hafta: store ke reviews parho, har review ka jawab do (Developer Dashboard → Ratings). Bug ho to theek karke naya version.
- Mahina: Gumroad payout check, Payoneer/bank mein paisa.

## 7. Kabhi nahi karna

- Koi analytics, tracking, ya page ka content parhne wala code mat dalo. Privacy policy aur store listing "nothing collected"
  kehti hai; yeh toota to store se nikal sakti hai.
- `host_permissions` mein api.gumroad.com ke ilawa kuch mat dalo bina wajah ke. Har nayi permission par Google dobara
  review karta hai aur users ko warning dikhti hai.
- Remote script (CDN se JS) kabhi nahi. Store ka rule hai.
- Keystore/keys/passwords git mein nahi.
- Reviews ke liye paise ya fake reviews nahi.

## 8. Masle aur hal

- **Build fail**: `npm ci` phir `npm run check`. Error ka pehla line parho.
- **Browser test "Chrome was not found"**: upar wala `npx @puppeteer/browsers ...` chalao.
- **Store reject "permission not justified"**: `store/listing.md` ke Privacy tab answers dobara paste karo.
- **User kehta hai tabs gum ho gaye**: Settings → Export all sessions bhejne ko kaho; backups 24 ghante (free) rehte hain.
- **Licence "not found"**: Gumroad mein product ID sahi hai? Key wahi product ki hai? Refund to nahi hua?

## 9. Agar kisi aur Claude se kaam karwana ho

Usko yeh bolo: "D:\tabs mein Tabcove Chrome extension hai, README.md aur GUIDE.md parho, `npm run check` chalao, phir
yeh kaam karo: ...". Commit `manasproperty` identity se hotay hain aur push main karta hoon.
