# JIC Website — File Structure Guide
# Think of this like a C++ embedded project:
#   content/  = board definitions / config headers  ← EDIT HERE
#   pages/    = application layer                   ← thin wrappers
#   components/ = drivers / HAL                    ← framework, rarely touch
#   admin/ + supabase/ = secure management layer
#
# ════════════════════════════════════════════════════════════════════
#
#  ✏️  = Edit freely — this is your "content" layer
#  🔧  = Edit occasionally — layout, logic, routing
#  🔒  = Don't touch — build tools, UI primitives, plugins
#
# ════════════════════════════════════════════════════════════════════

jamatia-islamic-centre/
│
├── .env.example                     ✏️  Copy → .env, fill in Supabase credentials
├── .env                             ✏️  Your actual secrets (never commit this)
│
├── public/
│   ├── mosque-icon.svg              ✏️  Favicon / logo SVG
│   └── logo.svg                     ✏️  Site logo
│
│
│  ┌─────────────────────────────────────────────────────────────┐
│  │  ✏️  CONTENT LAYER  —  the only files non-devs need        │
│  │     All text, images, data, and links live here.            │
│  │     Pages & components just import from here.               │
│  └─────────────────────────────────────────────────────────────┘
│
├── src/content/
│   ├── site.js                      ✏️  Site name, address, phone, social links, hours
│   ├── nav.js                       ✏️  Navigation bar links (add/remove/rename pages)
│   ├── images.js                    ✏️  Every image URL used on the site
│   │
│   ├── pages/
│   │   ├── home.js                  ✏️  Hero text, services list, events list, CTA copy
│   │   ├── about.js                 ✏️  History paragraphs, mission/vision bullets, values
│   │   ├── projects.js              ✏️  Appeal target £, equipment list + costs, vision
│   │   └── contact.js              ✏️  FAQ questions & answers
│   │
│   └── data/
│       └── financials.js            ✏️  Annual income & expenditure figures  ← add each year here
│
│
│  ┌─────────────────────────────────────────────────────────────┐
│  │  🔧  CONFIG  —  connection settings                         │
│  └─────────────────────────────────────────────────────────────┘
│
├── src/config/
│   └── supabase.js                  🔧  Supabase client (reads from .env — don't hardcode keys)
│
│
│  ┌─────────────────────────────────────────────────────────────┐
│  │  🔧  PAGES  —  one file per URL route                       │
│  │     These import from content/ and render sections.         │
│  │     Only touch these to restructure a page layout.          │
│  └─────────────────────────────────────────────────────────────┘
│
├── src/pages/
│   ├── HomePage.jsx                 🔧  /
│   ├── AboutPage.jsx                🔧  /about
│   ├── ServicesPage.jsx             🔧  /services
│   ├── PrayerTimesPage.jsx          🔧  /prayer-times
│   ├── MadrassahPage.jsx            🔧  /madrassah
│   ├── YouthPage.jsx                🔧  /youth  (Itikaaf registration form)
│   ├── ProjectsPage.jsx             🔧  /projects
│   ├── TeamPage.jsx                 🔧  /team
│   ├── ContactPage.jsx              🔧  /contact
│   ├── FinancialHistoryPage.jsx     🔧  /financial-history
│   ├── PrivacyPage.jsx              🔧  /privacy
│   └── NotFoundPage.jsx             🔧  /* (404)
│
│
│  ┌─────────────────────────────────────────────────────────────┐
│  │  🔧  COMPONENTS — shell + page sections                     │
│  │     shell/    = the app frame (navbar, footer)              │
│  │     sections/ = reusable page blocks                        │
│  └─────────────────────────────────────────────────────────────┘
│
├── src/components/
│   │
│   ├── shell/                       🔧  App frame — rendered on every page
│   │   ├── Navbar.jsx               🔧  Top nav (links from content/nav.js)
│   │   ├── Footer.jsx               🔧  Footer (info from content/site.js)
│   │   ├── JamatiaLogo.jsx          🔧  Logo component
│   │   └── ScrollToTop.jsx          🔧  Scroll-to-top button
│   │
│   ├── sections/                    🔧  Page sections (import content & render it)
│   │   ├── contact/
│   │   │   ├── ContactForm.jsx      🔧  Contact form → Supabase edge function
│   │   │   ├── ContactInfoSection.jsx  🔧  Address/phone cards (from site.js)
│   │   │   ├── FaqSection.jsx       🔧  FAQ cards (from content/pages/contact.js)
│   │   │   ├── MapSection.jsx       🔧  Embedded Google Map iframe
│   │   │   └── ...
│   │   ├── prayer-times/
│   │   │   ├── PrayerTimesLogic.js  🔧  usePrayerTimes() hook — fetches from Supabase
│   │   │   ├── PrayerScheduleTabs.jsx  🔧  Monthly schedule table
│   │   │   └── ...
│   │   ├── financials/
│   │   │   └── FinancialChart.jsx   🔧  Recharts bar chart (data from financials.js)
│   │   ├── madrassah/               🔧  Madrassah page sections
│   │   ├── services/                🔧  Services page sections
│   │   └── youth/
│   │       └── ItikaafRegistrationForm.jsx  🔧  Registration form logic
│   │
│   ├── icons/
│   │   ├── MosqueIcon.jsx           🔒  SVG mosque icon component
│   │   └── MosqueSymbol.jsx         🔒  SVG mosque symbol
│   │
│   └── ui/                          🔒  Primitive UI building blocks (shadcn/radix)
│       ├── button.jsx               🔒
│       ├── card.jsx                 🔒
│       ├── tabs.jsx                 🔒
│       ├── toast.jsx                🔒
│       ├── toaster.jsx              🔒
│       └── use-toast.js             🔒
│
│
│  ┌─────────────────────────────────────────────────────────────┐
│  │  🔧  UTILITIES & BUSINESS LOGIC                             │
│  └─────────────────────────────────────────────────────────────┘
│
├── src/lib/
│   ├── utils.js                     🔒  cn() class-name helper
│   └── submitItikaafRegistration.js 🔧  Dual-path form submit (Sheets or Supabase)
│
├── src/layouts/
│   └── MainLayout.jsx               🔒  Navbar + <Outlet/> + Footer wrapper
│
├── src/styles/
│   └── index.css                    🔧  Global CSS, Tailwind directives, islamic-pattern
│
├── src/App.jsx                      🔒  Route table — add new pages here
├── src/main.jsx                     🔒  React root mount
│
│
│  ┌─────────────────────────────────────────────────────────────┐
│  │  🔒  BUILD TOOLCHAIN — never touch                          │
│  └─────────────────────────────────────────────────────────────┘
│
│
├── supabase/                        🔧  SQL schema files for DB setup
│   └── google-apps-script-example.js  🔧  Reference script for Sheets webhook
│
├── tailwind.config.js               🔧  Theme colours, fonts, custom classes
├── vite.config.js                   🔒  Vite bundler config
├── package.json                     🔒  Dependencies
└── jsconfig.json                    🔒  Path aliases (@/ → src/)


# ════════════════════════════════════════════════════════════════
#  QUICK REFERENCE — "Where do I change X?"
# ════════════════════════════════════════════════════════════════
#
#  Change site name / address / phone   →  src/content/site.js
#  Change social media links            →  src/content/site.js
#  Add / remove a nav link              →  src/content/nav.js
#  Swap a photo / image URL             →  src/content/images.js
#  Edit home page text or events        →  src/content/pages/home.js
#  Edit about page history              →  src/content/pages/about.js
#  Edit appeal amount or equipment      →  src/content/pages/projects.js
#  Edit FAQ answers                     →  src/content/pages/contact.js
#  Add a new financial year             →  src/content/data/financials.js
#  Change Supabase project              →  .env  (VITE_SUPABASE_URL / KEY)
#  Change Tailwind colours / theme      →  tailwind.config.js
#  Add a new page / route               →  src/App.jsx + src/pages/NewPage.jsx


## Production admin
- `/admin` is the role-protected management dashboard.
- `supabase/production_schema.sql` is the production database/RLS migration.
- Horizons runtime/editor plugins were removed; deployment is standard Vite.
