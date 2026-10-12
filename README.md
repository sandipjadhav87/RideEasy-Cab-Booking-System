# RideEasy — 30-minute deployment starter

A responsive cab-booking demo. It starts in preview mode and can be connected to Firebase Firestore.

## Quick local preview
1. Open this folder in VS Code.
2. Use the **Live Server** extension to serve `index.html` (ES modules usually do not work reliably when opening the file directly).
3. Submit a sample booking. Until Firebase is configured, the app displays a demo reference and explicitly says the booking was not saved.

## Connect Firebase Firestore
1. Open https://console.firebase.google.com/ and create a project.
2. Add a Web App in Project settings and copy its Firebase web config.
3. In Firebase, create a Firestore database.
4. Replace the placeholder values in `app.js`'s `firebaseConfig`.
5. Configure Firestore Security Rules before allowing writes. Do NOT use unrestricted public read/write rules. For a quick class demo, create rules that only permit the operations you explicitly intend, and do not store real customer information.
6. Serve the site over HTTP/HTTPS and test a booking. A successful submission returns a Firestore document ID.

**Security note:** Firebase web configuration is visible in the browser by design. Security must be enforced with Firestore Rules and, for private/admin views, authentication. Do not put service-account keys or private credentials in frontend files.

## Deploy static files to Amazon S3
1. Create an S3 bucket in your chosen region.
2. Upload `index.html`, `style.css`, and `app.js` (keep their paths together).
3. Enable Static website hosting and set the index document to `index.html`.
4. S3 website endpoints use HTTP. For HTTPS, consider CloudFront and review pricing first.
5. To make a direct S3 website publicly accessible, public read access is required. Only publish intended website assets; never upload secrets or private data.

## Important limitations
- Fare is a demo flat estimate by cab type, not calculated from real route distance.
- No real driver dispatch, GPS tracking, payment, or authentication is implemented.
- The starter does not include an admin bookings screen; adding one safely requires authentication and appropriate Firestore rules.
- AWS/Firebase charges depend on account eligibility, configuration, and usage. Check current pricing and set billing alerts.
