DEARLY — ONE CONFESSION WEBSITE + GCASH CHECKOUT
================================================

This project uses the uploaded flower-confession website as the ONLY product.
It has a customization panel, live preview, a GCash checkout redirect through
PayMongo Hosted Checkout, and a customized standalone HTML download after the
server receives a verified payment webhook.

RUN LOCALLY
-----------
1. Install Node.js 18 or newer. No extra npm packages are required.
2. Open this folder in VS Code.
3. Open the terminal in this folder and run:
      npm install
4. Copy .env.example to a new file named .env.
5. Add your PayMongo TEST secret key and webhook signing secret to .env.
6. Run:
      npm start
7. Open http://localhost:3000

GCASH / PAYMONGO SETUP
---------------------
1. Create or sign in to your PayMongo merchant account and complete the
   required business verification/onboarding.
2. In PayMongo Dashboard > Developers, copy your TEST secret API key and put
   it in PAYMONGO_SECRET_KEY in .env. Do not share or publish this key.
3. Make sure GCash is enabled/approved in your PayMongo payment methods.
4. Deploy this Node app to a host with a public HTTPS domain.
5. Set BASE_URL to that exact HTTPS origin (no trailing slash).
6. In PayMongo Dashboard > Developer Tools > Webhooks, add:
      https://YOUR-DOMAIN/webhooks/paymongo
   Subscribe to:
      checkout_session.payment.paid
7. Copy that webhook's signing secret into PAYMONGO_WEBHOOK_SECRET.
8. Test using PayMongo TEST keys and a test payment first. When ready, switch
   to LIVE API keys and create a separate LIVE webhook/signing secret.

IMPORTANT PAYMENT NOTES
-----------------------
- A static HTML file opened with file:// cannot process real GCash payments.
  The Node server and public HTTPS deployment are required.
- The server controls the price (PRICE_PHP in .env); the browser cannot alter it.
- The download is unlocked only after a signed PayMongo webhook marks the
  order paid. A return URL by itself is not treated as proof of payment.
- Orders are stored in orders.json for this starter. For a busy production
  store, move orders to a durable database and add backups/monitoring.
- PayMongo account approval and GCash availability are controlled by PayMongo.
- The starter price is PHP 99. Change PRICE_PHP in .env if needed.

CUSTOMIZATION INCLUDED
----------------------
Recipient name, sender name, opening text, long confession, question, YES/NO
button labels, theme (pink/lavender/peach/red), and background music upload.
The original flower animation, teddy bear, floating hearts, multi-page flow,
YES/NO responses, and uploaded music are preserved in the downloadable site.
