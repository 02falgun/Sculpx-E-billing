# Progressive Web App (PWA) Strategy

## 1. PWA Goals & Philosophy
The application serves both transient mobile diners (who scan a QR code and expect a fast, native-like experience without app store downloads) and hotel staff (who run POS and KDS stations all day on tablets).

> **Offline Boundary Notice**:
> The app caches shell assets, stylesheets, fonts, and menus for instant display on intermittent Wi-Fi.
> However, **the frontend does NOT pretend to support offline ordering**. Order submission requires live backend confirmation of availability, pricing, and KOT generation.

---

## 2. Web App Manifest (`public/manifest.json`)
- **App Name**: Restro E-Billing & QR Dining
- **Display Mode**: `standalone`
- **Theme Color**: `#0f172a` (Sleek slate dark tone)
- **Background Color**: `#f8fafc`
- **Orientation**: Portrait-primary for mobile guest flow; Any/Landscape for POS and Kitchen KDS.
- **Icons**: Adaptive maskable PNGs (192x192, 512x512).

---

## 3. Caching Strategy
- **Static Assets (CSS, JS, Fonts)**: `Cache-First` with version hashing.
- **Menu Catalog**: `Stale-While-Revalidate` for instant browsing even when moving between Wi-Fi deadzones.
- **Order, Cart & Payment Submissions**: `Network-Only` (Never serve cached mutations).
- **Network Status Banner**: When `navigator.onLine` switches to false, an unobtrusive banner notifies the user that live updates are paused until reconnection.
