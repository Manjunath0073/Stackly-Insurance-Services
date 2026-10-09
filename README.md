# Stackly Insurance Services Marketing Pages

Premium, responsive Stackly Insurance Services pages built with semantic HTML5, hand-authored custom CSS, and framework-free vanilla JavaScript. No CSS framework or runtime CSS compiler is used — all styling lives in the project's own stylesheets for fast, deterministic loading.

## Run locally

No build step is required. Serve the folder over HTTP so the image, font, and CDN requests behave like production:

```bash
npx serve .
```

Then open the local URL printed by the command. A static host, VS Code Live Server, or any equivalent HTTP server works as well.

All styling is plain CSS shipped with the project: `assets/css/style.css` holds the shared tokens, shell, and components; each page adds its own stylesheet (`about.css`, `products.css`, …); and `assets/css/responsive.css` holds shared typography + small-screen refinements loaded last. The in-browser Tailwind Play CDN was removed because it was unused (the markup uses no Tailwind utility classes) and it both slowed first paint and injected a late `preflight` reset that intermittently overrode component padding. Keeping the CSS local makes loading fast and deterministic.

## Project structure

```text
index.html
about.html
products.html
claims.html
resources.html
contact.html
404.html
login.html
signup.html
customer-dashboard.html
agent-dashboard.html
assets/
  logo/
    logo-stackly.webp
  images/
    hero-family-shield.webp
    why-stackly-home.webp
    claims-support-agent.webp
    testimonial-maya.webp
    testimonial-jordan.webp
    testimonial-priya.webp
  css/style.css
  css/about.css
  css/products.css
  css/claims.css
  css/resources.css
  css/contact.css
  css/404.css
  css/dashboard.css
  js/main.js
  js/about.js
  js/products.js
  js/claims.js
  js/resources.js
  js/contact.js
  js/404.js
  js/auth.js
  js/login.js
  js/signup.js
  js/store.js
  js/dashboard.js
  js/agent.js
```

## Image sources and licenses

All homepage photos are downloaded from Unsplash and served locally as WebP files. They are used under the [Unsplash License](https://unsplash.com/license). The query parameters below document the source and optimization settings used for each asset.

- `hero-family-shield.webp`: [Unsplash image source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=42&fm=webp)
- `why-stackly-home.webp`: [Unsplash image source](https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=760&q=42&fm=webp)
- `claims-support-agent.webp`: [Unsplash image source](https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=760&q=42&fm=webp)
- `testimonial-maya.webp`: [Unsplash image source](https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=72&fm=webp)
- `testimonial-jordan.webp`: [Unsplash image source](https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=72&fm=webp)
- `testimonial-priya.webp`: [Unsplash image source](https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=72&fm=webp)

Every local image is below 100KB. No generated-gradient placeholders were needed.

## About page image sources

About-page photos are also from Unsplash and are used under the [Unsplash License](https://unsplash.com/license). They are stored in `assets/images/about/` as optimized WebP files.

- `about-hero-team.webp`: [source](https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=42&fm=webp)
- `about-hero-office.webp`: [source](https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=680&q=42&fm=webp)
- `about-hero-detail.webp`: [source](https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=620&q=42&fm=webp)
- `about-story-founders.webp`: [source](https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=760&q=42&fm=webp)
- `about-mission-care.webp`: [source](https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=620&q=42&fm=webp)
- `about-vision-path.webp`: [source](https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=620&q=42&fm=webp)
- `about-values-home.webp`: [source](https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=620&q=42&fm=webp)
- `about-leader-maya.webp`: [source](https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=360&q=62&fm=webp)
- `about-leader-jordan.webp`: [source](https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=360&q=62&fm=webp)
- `about-leader-nina.webp`: [source](https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=360&q=62&fm=webp)
- `about-leader-eli.webp`: [source](https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=360&q=62&fm=webp)
- `about-leader-priya.webp`: [source](https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=360&q=62&fm=webp)
- `about-team-studio.webp`: [source](https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=42&fm=webp)
- `about-numbers-community.webp`: [source](https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=42&fm=webp)
- `about-culture-collab.webp`: [source](https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=680&q=42&fm=webp)
- `about-culture-workshop.webp`: [source](https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=620&q=42&fm=webp)
- `about-culture-support.webp`: [source](https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=620&q=42&fm=webp)
- `about-culture-office.webp`: [source](https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=620&q=42&fm=webp)
- `about-community-hands.webp`: [source](https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=620&q=42&fm=webp)
- `about-community-circle.webp`: [source](https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=620&q=42&fm=webp)

All About-page images are below 100KB. No generated placeholders were needed.

## Products page image sources

Products-page photos are from Unsplash and are used under the [Unsplash License](https://unsplash.com/license). They are stored in `assets/images/products/` as optimized WebP files.

- `products-hero-home.webp`: [source](https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=880&q=40&fm=webp)
- `products-hero-auto.webp`: [source](https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=680&q=40&fm=webp)
- `products-hero-health.webp`: [source](https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=620&q=40&fm=webp)
- `products-category-auto.webp`: [source](https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=420&q=44&fm=webp)
- `products-category-home.webp`: [source](https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=420&q=44&fm=webp)
- `products-category-life.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=420&q=44&fm=webp)
- `products-category-health.webp`: [source](https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=420&q=44&fm=webp)
- `products-category-travel.webp`: [source](https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=420&q=44&fm=webp)
- `products-category-business.webp`: [source](https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=420&q=44&fm=webp)
- `products-spotlight-home.webp`: [source](https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=820&q=40&fm=webp)
- `products-spotlight-family.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=620&q=40&fm=webp)
- `products-spotlight-detail.webp`: [source](https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=620&q=40&fm=webp)
- `products-plan-essential.webp`: [source](https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=420&q=44&fm=webp)
- `products-plan-premium.webp`: [source](https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=420&q=44&fm=webp)
- `products-plan-elite.webp`: [source](https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=420&q=44&fm=webp)
- `products-builder-home.webp`: [source](https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=680&q=40&fm=webp)
- `products-builder-road.webp`: [source](https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=680&q=40&fm=webp)
- `products-proof-maya.webp`: [source](https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=360&q=62&fm=webp)
- `products-proof-jordan.webp`: [source](https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=360&q=62&fm=webp)
- `products-proof-priya.webp`: [source](https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=360&q=62&fm=webp)
- `products-cta-family.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=760&q=40&fm=webp)
- `products-cta-travel.webp`: [source](https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=760&q=40&fm=webp)

All Products-page images are below 100KB. No generated placeholders were needed.

## Claims page image sources

Claims-page photos are from Unsplash and are used under the [Unsplash License](https://unsplash.com/license). They are stored in `assets/images/claims/` as optimized WebP files.

- `claims-hero-agent.webp`: [source](https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=880&q=40&fm=webp)
- `claims-hero-family.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=760&q=40&fm=webp)
- `claims-hero-device.webp`: [source](https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=620&q=40&fm=webp)
- `claims-process-report.webp`: [source](https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=620&q=40&fm=webp)
- `claims-process-review.webp`: [source](https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=620&q=40&fm=webp)
- `claims-process-approve.webp`: [source](https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=620&q=40&fm=webp)
- `claims-process-payout.webp`: [source](https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=620&q=40&fm=webp)
- `claims-speed-relief.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=820&q=40&fm=webp)
- `claims-type-auto.webp`: [source](https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=420&q=44&fm=webp)
- `claims-type-home.webp`: [source](https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=420&q=44&fm=webp)
- `claims-type-health.webp`: [source](https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=420&q=44&fm=webp)
- `claims-type-travel.webp`: [source](https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=420&q=44&fm=webp)
- `claims-type-life.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=420&q=44&fm=webp)
- `claims-type-business.webp`: [source](https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=420&q=44&fm=webp)
- `claims-tracker-support.webp`: [source](https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=760&q=40&fm=webp)
- `claims-story-maya.webp`: [source](https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=360&q=62&fm=webp)
- `claims-story-jordan.webp`: [source](https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=360&q=62&fm=webp)
- `claims-story-priya.webp`: [source](https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=360&q=62&fm=webp)
- `claims-cta-family.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=760&q=40&fm=webp)
- `claims-cta-travel.webp`: [source](https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=760&q=40&fm=webp)

All Claims-page images are below 100KB. No generated placeholders were needed.

## Resources page image sources

Resources-page photos are from Unsplash and are used under the [Unsplash License](https://unsplash.com/license). They are stored in `assets/images/resources/` as optimized WebP files.

- `resources-hero-notebook.webp`: [source](https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=760&q=40&fm=webp)
- `resources-hero-desk.webp`: [source](https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=680&q=40&fm=webp)
- `resources-hero-family.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-featured-home.webp`: [source](https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=760&q=40&fm=webp)
- `resources-featured-claims.webp`: [source](https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-featured-business.webp`: [source](https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-category-guides.webp`: [source](https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=420&q=44&fm=webp)
- `resources-category-blog.webp`: [source](https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=420&q=44&fm=webp)
- `resources-category-video.webp`: [source](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=420&q=44&fm=webp)
- `resources-category-webinar.webp`: [source](https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=420&q=44&fm=webp)
- `resources-category-case-study.webp`: [source](https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=420&q=44&fm=webp)
- `resources-category-tools.webp`: [source](https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=420&q=44&fm=webp)
- `resources-article-home.webp`: [source](https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-article-auto.webp`: [source](https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-article-health.webp`: [source](https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-article-travel.webp`: [source](https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-article-life.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-article-business.webp`: [source](https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-guide-review.webp`: [source](https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-guide-first-home.webp`: [source](https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-guide-claims.webp`: [source](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-webinar-claims.webp`: [source](https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-webinar-protection.webp`: [source](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-webinar-founders.webp`: [source](https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=620&q=40&fm=webp)
- `resources-newsletter-family.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=760&q=40&fm=webp)
- `resources-newsletter-travel.webp`: [source](https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=760&q=40&fm=webp)

All Resources-page images are below 100KB. No generated placeholders were needed.

## Contact page image sources and map

Contact-page photos are from Unsplash and are used under the [Unsplash License](https://unsplash.com/license). They are stored in `assets/images/contact/` as optimized WebP files.

- `contact-hero-support.webp`: [source](https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=880&q=40&fm=webp)
- `contact-hero-welcome.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=760&q=40&fm=webp)
- `contact-method-call.webp`: [source](https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=520&q=42&fm=webp)
- `contact-method-email.webp`: [source](https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=520&q=42&fm=webp)
- `contact-method-visit.webp`: [source](https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=520&q=42&fm=webp)
- `contact-method-chat.webp`: [source](https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=520&q=42&fm=webp)
- `contact-office-salem.webp`: [source](https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=760&q=40&fm=webp)
- `contact-support-family.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=760&q=40&fm=webp)

All Contact-page images are below 100KB. No generated placeholders were needed.

The contact page uses a lazy-loaded, keyless OpenStreetMap export iframe centered on Stackly Insurance Services, 12 Cherry Road, Hasthampatti, Salem, Tamil Nadu 636007, India. Coordinates: latitude `11.6643`, longitude `78.1460`. The Get Directions link opens Google Maps with the same destination coordinates; no API key is used.

## Auth pages

`login.html` and `signup.html` intentionally use a minimal auth shell rather than the full marketing navigation: logo, opposite-page link, and slim legal footer. This keeps sign-in and onboarding focused and avoids competing conversion paths.

Both forms support exactly two roles: `Customer (Policyholder)` and `Agent`. Login validates role, email format, and an 8-character minimum password. Signup validates name, email and confirmation, phone, country, password complexity, matching confirmation, the role-specific Customer policy-interest or Agent license/agency ID field, and required Terms acceptance. Validation runs on blur and submit with accessible inline messages. Submissions are simulated client-side; integrate the API call in `login.js` or `signup.js` where the loading state currently resolves. Credentials are not logged or stored.

Auth imagery is from Unsplash under the [Unsplash License](https://unsplash.com/license):

- `auth-login-panel.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=40&fm=webp)
- `auth-signup-panel.webp`: [source](https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=40&fm=webp)
- `auth-trust-card.webp`: [source](https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=620&q=40&fm=webp)

All auth images are below 100KB. No generated placeholders were needed.

## 404 page

`404.html` reuses the exact shared header and footer markup from the marketing pages (same logo path, navigation links, and CTAs), so the page stays fully navigable and consistent. A deliberate decision was made to keep the full marketing shell rather than a slim error shell so a visitor who lands on a broken URL can recover immediately through the normal navigation. Page-only styling lives in `assets/css/404.css` (namespaced with `.nf-` / `.notfound-`) and page-only behavior lives in `assets/js/404.js` (IIFE with a `DOMContentLoaded` guard).

The page renders the two required recovery actions:

- **Go to Home** — a standard link to `index.html`.
- **Go Back** — calls `window.history.back()`. A browser exposes little reliable history information, so the script falls back to `index.html` when `document.referrer` is empty or `window.history.length <= 1`, which keeps the button useful on direct hits and fresh tabs. See `assets/js/404.js` for the documented logic.

The hero also offers a cancelable 15-second auto-redirect to the homepage. The countdown is exposed through an `aria-live="polite"` status region, announced at the start, again at five seconds, and on cancel. The "Stay on this page" control is keyboard operable and, once the notice is dismissed, returns focus to the Go Back button. The countdown ring, floating 404 digits, hero parallax, and staggered reveals all respect `prefers-reduced-motion`. The page is marked `noindex, nofollow` because error pages should not be indexed.

### 404 image sources

404-page photos are from Unsplash under the [Unsplash License](https://unsplash.com/license) and are stored in `assets/images/404/` as optimized WebP files, all under 100KB.

- `404-hero-lost-path.webp`: [source](https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=880&q=40&fm=webp)
- `404-illustration.webp`: [source](https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=560&q=42&fm=webp)
- `404-link-home.webp`: [source](https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=420&q=44&fm=webp)
- `404-link-products.webp`: [source](https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=420&q=44&fm=webp)
- `404-link-claims.webp`: [source](https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=420&q=44&fm=webp)
- `404-link-resources.webp`: [source](https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=420&q=44&fm=webp)
- `404-link-contact.webp`: [source](https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=420&q=44&fm=webp)
- `404-link-account.webp`: [source](https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=420&q=44&fm=webp)

All 404-page images are below 100KB. No generated placeholders were needed; the signpost and compass marks are inline decorative SVG rather than image assets.

## Customer dashboard (role-based SPA)

`customer-dashboard.html` is a hash-routed single-page app built with vanilla JavaScript and the same shared local CSS as the marketing pages (no CSS framework). Its persistent shell is a fixed sidebar, a sticky topbar (search, notifications, user menu, theme toggle), and a scrollable content area where routed views render. Routes: `#/overview`, `#/policies`, `#/claims`, `#/payments`, `#/documents`, `#/support`, `#/profile`, `#/settings`.

### Data layer and roles

`assets/js/store.js` is the single source of truth and is shared by the auth pages, the customer dashboard, and the future agent dashboard. It exposes `getSession()`, `setSession(user)`, `clearSession()`, `getUsers()`, `getUserById(id)`, `getUserByEmail(email)`, `updateUser(id, patch)`, and the per-user demo data helpers `ensureData/getData/saveData/updateData`. All state lives in `localStorage`.

Stored keys:

- `stackly.users` — array of user records.
- `stackly.session` — `{ userId, role, email, startedAt }` for the active session.
- `stackly.data` — map of `userId` to seeded demo data (policies, claims, payments, documents, notifications, tickets, activity, agent).
- `stackly.ui` — shell preferences such as sidebar collapse.

Stored user shape (no passwords or credentials are ever stored):

```json
{
  "id": "usr_...",
  "fullName": "Maya Rodriguez",
  "email": "maya@example.com",
  "phone": "+1 512 555 0142",
  "country": "United States",
  "role": "customer",
  "createdAt": "2026-01-14T10:00:00.000Z",
  "policyInterest": "Home",
  "agencyId": "",
  "avatar": "",
  "profile": { "firstName": "Maya", "lastName": "Rodriguez", "dateOfBirth": "", "address": "", "city": "", "postalCode": "", "occupation": "", "preferredContact": "Email" },
  "prefs": { "theme": "system", "emailUpdates": true, "smsAlerts": true, "claimAlerts": true, "productNews": false, "reduceMotion": false, "largeText": false }
}
```

Two roles are supported: `customer` and `agent`. Signup persists the new user via `StacklyStore.createUser(...)`, logs them in with `setSession(...)`, and the success screen links to the dashboard. Login matches by email and validates that the selected role matches the account; on a demo login for an unknown email it creates a lightweight account (no password stored) so the dashboard is reachable. Both auth pages load `store.js` before `login.js`/`signup.js`, and `auth.js` validation is unchanged.

### Profile resolution and demo data

This is a **front-end-only demo with no backend authentication**. Both dashboards read their profile purely from `localStorage` and can be opened at the same time (even in two tabs). Sessions are stored per role under `stackly.session.roles` so one role never blocks the other.

On load a dashboard calls `StacklyStore.getDashboardUser(role)`, which resolves, in order: the stored session for that role → the active primary session if its role matches → any existing user of that role (for example one created at signup) → a seeded demo user persisted to `localStorage`. The resolved user's `fullName`, email, phone, country, role badge, initials/avatar, agency/license ID, and member-since are displayed in the shell and profile/settings, and profile edits persist via `updateUser`. There is no login wall; `login.html`/`signup.html` remain available to load the details you enter.

Demo data is seeded deterministically per user id (FNV-1a hash + xorshift RNG) the first time a user opens a dashboard, so charts render on first load and stay consistent across reloads. No backend is required; replace the `store.js` data functions with API calls to integrate a real service. Because there is no server, this is not real security — a production build would enforce authentication and authorization server-side.

### Charts

Charts use **ApexCharts** loaded lazily per session from `cdn.jsdelivr.net`. If ApexCharts fails to load, the adapter falls back to **Chart.js**; if neither loads (offline), sparklines and radial gauges render as inline SVG and other charts show an accessible text fallback. Charts are created when a view mounts and destroyed on route change to avoid leaks. All chart configuration is centralized in the `StacklyCharts`/`Charts` adapter inside `dashboard.js` and exposed on `window.StacklyDashboard` for the future Agent dashboard.

Charts by view: Overview (5 KPI sparklines, coverage donut, premium area, claims stacked bar, protection radial gauge), Policies (coverage horizontal bar, policy breakdown donut), Claims (status donut, claims-by-month stacked bar), Payments (premium vs payouts bar, status donut), Documents (library-by-type donut), Support (resolved radial, response sparkline), Profile (completion radial).

### Security, accessibility, performance

- User-injected text is escaped (`esc()`) before insertion; no credentials are stored or logged.
- The page is `noindex, nofollow`; chart containers carry `role="img"` with `aria-label` plus visually hidden summaries; drawers trap focus and close on `Escape`.
- `prefers-reduced-motion` and an in-app "Reduce motion" preference soften animations; a "Larger text" preference scales type.
- Dashboards are chart-heavy, so Lighthouse is expected around 90+ rather than 95+ (documented tradeoff). Charts load only when needed and are disposed on route change.

### 404 → Dashboard imagery

Dashboard images live in `assets/images/dashboard/` (`avatars/` for advisor photos) and are WebP under 100KB, from Unsplash under the [Unsplash License](https://unsplash.com/license).

- `overview-welcome.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=760&q=40&fm=webp)
- `empty-state.webp`: [source](https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=520&q=42&fm=webp)
- `policy-home.webp`: [source](https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=320&q=44&fm=webp)
- `policy-auto.webp`: [source](https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=320&q=44&fm=webp)
- `policy-health.webp`: [source](https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=320&q=44&fm=webp)
- `policy-life.webp`: [source](https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=320&q=44&fm=webp)
- `policy-travel.webp`: [source](https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=320&q=44&fm=webp)
- `policy-business.webp`: [source](https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=320&q=44&fm=webp)
- `claim-evidence-photo.webp`: [source](https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=320&q=42&fm=webp)
- `claim-evidence-document.webp`: [source](https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=320&q=42&fm=webp)
- `avatars/agent-maya.webp`: [source](https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=60&fm=webp)
- `avatars/agent-jordan.webp`: [source](https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=60&fm=webp)

Users without an avatar render brand-gradient initials, so no default avatar image is required. All dashboard images are below 100KB and no placeholders were needed.

## Agent dashboard (role-based SPA)

`agent-dashboard.html` is the second role-based SPA. It reuses the exact shared shell from the customer dashboard (sidebar, topbar, drawer, toast, and the chart adapter exposed by `dashboard.js` on `window.StacklyDashboard`). Agent-only logic lives in `assets/js/agent.js` and agent-scoped styles use the `.ag-` namespace in `assets/css/dashboard.css`. Routes: `#/overview`, `#/customers`, `#/policies`, `#/claims`, `#/leads`, `#/commissions`, `#/appointments`, `#/messages`, `#/reports`, `#/profile`, `#/settings`.

### Roles and cross-links

- Front-end-only, no backend authentication. Each dashboard resolves its own profile from `localStorage` via `StacklyStore.getDashboardUser(role)` (role session → matching signed-up user → seeded demo user), so **both dashboards can be open at the same time** without one blocking the other.
- Login, when used, redirects by role: agents land on `agent-dashboard.html`, customers on `customer-dashboard.html` (an explicit `?next=` still wins).
- Name, email, phone, country, role badge, initials/avatar, agency/license ID (`agencyId`), and member-since (`createdAt`) are shown consistently in the sidebar, topbar, profile, and settings — all from `localStorage`.
- To display a specific agent, choose the Agent role on `signup.html` (with a license/agency ID) or log in with the Agent role. Otherwise a demo agent is seeded automatically so the dashboard is never empty.

### Agent data shape (store.js extension)

Agent-domain data is stored separately from customer data, keyed by agent id:

- `stackly.agentData` — map of `agentId` → agent workspace data.

The workspace object contains `region`, `agencyId`, `targets { premiumMonthly, commissionMonthly, policiesMonthly, conversionRate }`, and arrays `customers`, `policies`, `claims`, `leads`, `commissions`, `appointments`, `messages`, `notifications`, `activity`, plus an `agent` display name. Accessors added to `StacklyStore`: `ensureAgentData(agent)`, `getAgentData(id)`, `saveAgentData(id, data)`, `updateAgentData(id, patch)`.

Example customer record: `{ id, name, avatar, email, phone, city, region, status, policiesCount, premium, lastContact, since, score, owner, tags }`. Example lead record: `{ id, name, company, email, phone, stage, value, source, product, updatedAt, owner }`. Seeding is deterministic per agent id (FNV-1a + xorshift) and persists on first load so all charts and the kanban board stay stable. `stackly.users`, `stackly.session`, `stackly.data`, auth validation, and the customer dashboard behavior are unchanged.

### Agent charts

Same ApexCharts → Chart.js → inline-SVG fallback, lazily mounted per view and disposed on route change. Charts by view: Overview (6 KPI sparklines, premium-written area, policies-by-type donut, claims queue stacked bar, leads funnel, commission bar, two target radial gauges), Customers (clients-by-status bar, premium-by-city horizontal bar, client coverage donut), Policies (new-vs-renewals stacked bar, book-by-product donut, detail coverage donut), Claims Queue (status donut, monthly stacked bar, time-to-settle area, queue funnel), Leads/Pipeline (pipeline bar, win-rate donut, kanban board with keyboard move controls), Commissions (earnings bar, product-mix donut), Appointments (meetings-per-week bar), Reports (revenue-vs-target bar, product-mix donut, premium-by-city horizontal bar, conversion area), Profile (completion radial).

The shared chart adapter now honors optional `yFormatter`, `xFormatter`, `valueFormatter`, and `totalFormatter` options so count-based charts render integers instead of currency. Agent data and avatars are rendered with the same `esc()`, `avatarMarkup()`, `pageHead()`, `statCard()`, and `chartCard()` helpers the customer dashboard uses.

### Agent imagery

Advisor and customer avatars live in `assets/images/dashboard/agents/` and `assets/images/dashboard/customers/` (WebP, under 100KB, from Unsplash under the [Unsplash License](https://unsplash.com/license)). Clients without an avatar fall back to brand-gradient initials. Shared assets (`policy-*`, `claim-evidence-*`, `empty-state`) are reused from the customer dashboard list above.

- `agents/agent-advisor-1.webp`: [source](https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&q=62&fm=webp)
- `agents/agent-advisor-2.webp`: [source](https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=62&fm=webp)
- `customers/customer-01.webp`: [source](https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=60&fm=webp)
- `customers/customer-02.webp`: [source](https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=60&fm=webp)
- `customers/customer-03.webp`: [source](https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=60&fm=webp)
- `customers/customer-04.webp`: [source](https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=60&fm=webp)
- `customers/customer-05.webp`: [source](https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&q=60&fm=webp)
- `customers/customer-06.webp`: [source](https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=60&fm=webp)

### Replacing demo data with an API

Both dashboards are client-side simulations that read and write only `localStorage`. To connect a backend, replace the `ensure*/get*/save*Data`, `getDashboardUser`, and agent accessors in `store.js` (and the `createUser`/`setSession` calls in `login.js`/`signup.js`) with API requests; the view code reads only through these accessors. There is no auth wall in this demo, so a production build must enforce authentication and authorization server-side.

## Adding future pages

Use `style.css` and `main.js` for the shared shell, tokens, header, footer, scroll progress, navigation, reveals, and shared form behavior. Add each new page's markup in a top-level HTML file, then keep page-only selectors and interactions in a namespaced stylesheet and JavaScript file such as `products.css` and `products.js`. Cross-page navigation should point back to the relevant homepage anchor, while the active navigation item should be changed only on the current page.

## Logo

The supplied brand file must stay at the exact path `assets/logo/logo-stackly.webp`. Both the header and footer reference that path directly. Replace the file in that location if the brand asset is updated; no markup refactor is required.

## Included behavior

- Sticky header with scroll shrink and accessible mobile navigation
- IntersectionObserver scroll reveals and animated trust metrics
- Three-step client-side quote funnel teaser
- Keyboard-operable testimonial carousel with previous, next, dot, and arrow-key controls
- Single-open accessible FAQ accordion
- Client-side newsletter and CTA confirmation states
- Reduced-motion support via `prefers-reduced-motion`
