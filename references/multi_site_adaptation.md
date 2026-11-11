# Marketplace Parameters

Load the target marketplace's parameters before fetching a listing, so the page comes back in the right language, currency and delivery region. After fetching, check language and currency.

## 1. Marketplace matrix

| Marketplace | Domain | `language` | Currency | Symbol | Title limit* | Keepa prefix |
|---|---|---|---|---|---|---|
| United States | amazon.com | en_US | USD | $ | **75 (enforced)** | 1 |
| United Kingdom | amazon.co.uk | en_GB | GBP | £ | 200 (reference) | 2 |
| Germany | amazon.de | de_DE | EUR | € | 200 (reference) | 3 |
| France | amazon.fr | fr_FR | EUR | € | 200 (reference) | 4 |
| Japan | amazon.co.jp | ja_JP | JPY | ¥ | 200 (reference) | 5 |
| Canada | amazon.ca | en_CA | CAD | C$ | 200 (reference) | 6 |
| Italy | amazon.it | it_IT | EUR | € | 200 (reference) | 8 |
| Spain | amazon.es | es_ES | EUR | € | 200 (reference) | 9 |
| **India** | **amazon.in** | **en_IN** | **INR** | **₹** | **75 (enforced); Item Highlights 75** | 11 |
| Mexico | amazon.com.mx | es_MX | MXN | MX$ | 200 (reference) | 12 |
| Australia | amazon.com.au | en_AU | AUD | A$ | 200 (reference) | 13 |
| Brazil | amazon.com.br | pt_BR | BRL | R$ | 200 (reference) | 15 |
| Singapore | amazon.sg | en_SG | SGD | S$ | 200 (reference) | 16 |
| Netherlands | amazon.nl | nl_NL | EUR | € | 200 (reference) | 17 |
| UAE | amazon.ae | en_AE | AED | AED | 200 (reference) | 19 |
| Sweden | amazon.se | sv_SE | SEK | kr | 200 (reference) | 21 |
| Poland | amazon.pl | pl_PL | PLN | zł | 200 (reference) | 22 |
| Turkey | amazon.com.tr | tr_TR | TRY | ₺ | 200 (reference) | 24 |
| Saudi Arabia | amazon.sa | en_AE / ar_SA | SAR | SAR | 200 (reference) | 25 |
| Egypt | amazon.eg | ar_EG | EGP | EGP | 200 (reference) | 26 |

\* US: 75-character title rule enforced. India: title and Item Highlights are both limited to 75 characters (confirmed by the seller in Seller Central, Nov 2026). Elsewhere, follow what Seller Central shows; 200 is a reference only. Always count characters with a script before giving a title or highlights.

Keepa price history: `https://keepa.com/#!product/{prefix}-{ASIN}`.

## 2. Fetch parameters

- Product page: `https://www.amazon.in/dp/{ASIN}?language=en_IN&currency=INR` (swap domain, language and currency).
- Optional delivery location: `&postalCode=` (US 10001, UK SW1A 1AA, DE 10115, IN 400001).
- Cookies (more reliable): `i18n-prefs={CURRENCY}; lc-main={language}`.
- `Accept-Language` header: en-US, en-GB, en-IN, de-DE, fr-FR, it-IT, es-ES, en-CA, en-AU, ja-JP, pt-BR, en-AE etc., matching the marketplace.
- Reviews: `/product-reviews/{ASIN}?language=...`
- Variant detail: `/dp/{ASIN}?th=1&psc=1&language=...&currency=...`
- Search (keyword research): `/s?k={keyword}&language=...`

Prefer the built-in browser over plain HTTP fetches: Item Highlights (`.dp-title-differentiators`) and some modules only render in a browser.

## 3. After-fetch checks

1. **Language:** page text matches the marketplace. If the interface is local but the seller's bullets are in another language, that is a localisation gap in the listing, not a fetch error.
2. **Currency:** price symbol matches (₹ for India, $ for US, £ UK, € EU).
3. **Region:** BSR and delivery text match the marketplace.

## 4. Language expectations by marketplace

| Marketplace | Listing language | Common problems |
|---|---|---|
| US | English, US spelling (color, center) | UK spelling mixed in |
| UK / India / Australia / Singapore | English (UK/Indian spelling acceptable) | Inconsistent spelling within one listing |
| Germany / France / Italy / Spain / Netherlands | Local language | English left in bullets |
| Japan | Japanese | English-only bullets, literal translation |
| UAE / Saudi | English and/or Arabic | No Arabic at all on Arabic-first categories |

## 5. Marketplace-specific compliance notes

| Rule | US | India | EU | UK | Japan |
|---|---|---|---|---|---|
| Title limit | 75 enforced | 75 enforced (+ highlights 75) | Check Seller Central | Check Seller Central | Check Seller Central |
| Food regulator | FDA | FSSAI | EFSA / national | FSA | MHLW / CAA |
| Organic marks | USDA Organic | NPOP / PGS-India + Jaivik Bharat logo | EU organic leaf | UK organic | JAS |
| Electrical certification | UL / ETL / FCC | BIS | CE | UKCA / CE | PSE |
| Units | inch / lb | cm / kg / ml | cm / kg | cm / kg | cm / kg |

When a certification isn't visible on the page, say "this category usually needs X in this marketplace and the page doesn't show it" rather than calling it a violation; it may be in backend attributes or A+.
