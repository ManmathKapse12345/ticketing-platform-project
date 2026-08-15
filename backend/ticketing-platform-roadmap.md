# Event & Ticketing Platform — 3-Week Build Roadmap

**Your role in this:** you write every line of code. I'm here as a mentor — I'll give you the day's goal, the concepts you need to learn first, and a clear "definition of done" so you know when you're actually finished, not just when you've stopped. When you get stuck, come back and ask me to *explain* a concept, *review* code you've already written, or *debug* an error message — not to write the feature for you.

**Stack we're assuming** (matches what you listed): Node.js + Express, MongoDB (Atlas), Redis + BullMQ, Stripe or Razorpay (pick one — don't do both), Mongoose as the ODM. Frontend can be plain HTML/JS or React — your call, it's not the focus of this roadmap.

**Pace:** ~5 hrs/day, 6 days/week, 1 buffer/review day per week baked in. If you fall behind on a day, use the weekly buffer instead of skipping the concept — skipped fundamentals compound into bugs you can't debug later.

---

## Before Day 1 — Setup Checklist
- [ ] Install Node.js (LTS), Git, VS Code
- [ ] Create free MongoDB Atlas cluster
- [ ] Create Stripe **or** Razorpay account, get test-mode API keys
- [ ] Install Postman or Insomnia (for testing APIs without a frontend)
- [ ] Create a GitHub repo, commit from Day 1 onward (this becomes part of your resume proof)

---

## Week 1 — Foundations & Core Backend

### Day 1: Server Skeleton & DB Connection
**Learn:** what REST is, how Express routing works, how Mongoose connects to MongoDB.
**Build:** Express server, one `GET /health` route, Mongoose connection to your Atlas cluster.
**Done when:** `GET /health` returns 200 and your terminal logs "MongoDB connected."

### Day 2: Multi-Tenant Data Modeling
**Learn:** shared-DB multi-tenancy (every document tagged with `organizerId`), Mongoose schemas & relationships.
**Build:** Mongoose models — `User`, `Organizer`, `Event`, `TicketTier`, `Order`, `Ticket`. Sketch the relationships on paper first.
**Done when:** you can explain out loud why `TicketTier` belongs to `Event` and not the other way around.

### Day 3: Authentication
**Learn:** password hashing (bcrypt), JWTs, auth middleware, role-based access (organizer vs attendee).
**Build:** register/login endpoints, JWT middleware that protects routes, a `role` field that gates organizer-only actions.
**Done when:** Postman shows: signup → login → token → hitting a protected route works; hitting it without a token returns 401.

### Day 4: Event & Ticket Tier CRUD
**Build:** organizer-only endpoints to create/update/delete events, each with nested ticket tiers (name, price, quantity, sale window).
**Done when:** an organizer account can create an event with 2+ tiers and see it reflected in MongoDB Compass.

### Day 5: Public Event Discovery
**Build:** public (no-auth) endpoints — list published events, filter by date/category, get single event detail.
**Learn:** pagination, query filtering with Mongoose.
**Done when:** pagination + at least one filter works and is tested in Postman.

### Day 6: Order Flow (No Payment Yet)
**Learn:** race conditions — what happens if two people buy the last ticket at the same instant.
**Build:** an order-creation endpoint that reserves inventory safely (Mongo transactions, or atomic `$inc` with a quantity guard).
**Done when:** you fire two rapid concurrent requests for the last ticket and only one succeeds.

### Day 7: Buffer + Review
Catch up on anything slipped. Write a short Postman test collection for everything so far. Push clean commits with real messages (not "fix stuff").

---

## Week 2 — Payments, QR Tickets, Check-In

### Day 8: Payment Integration (Create)
**Learn:** Stripe PaymentIntents or Razorpay Orders (test mode), why you never trust the client to confirm payment.
**Build:** endpoint that creates a payment session tied to your `Order` document.
**Done when:** a test payment appears in your Stripe/Razorpay dashboard, linked to a real Order ID.

### Day 9: Webhooks (the actual source of truth)
**Learn:** why the webhook — not the frontend — is what confirms payment; signature verification; idempotency (handling the same webhook twice safely).
**Build:** webhook endpoint that listens for payment success/failure, updates the Order, decrements ticket inventory.
**Done when:** using the Stripe CLI (or Razorpay's test webhook tool) locally triggers a real order status change in your DB.

### Day 10: Refunds
**Build:** organizer-triggered refund endpoint + webhook listener for refund events; ticket status flips to void.
**Done when:** a refunded order can no longer be checked in.

### Day 11: Signed QR Ticket Generation
**Learn:** the `qrcode` npm package; signing a payload (HMAC or JWT) so the QR can't be edited or faked.
**Build:** on payment success, generate a QR encoding a signed `{ticketId, eventId, exp}` payload; store/attach it to the ticket.
**Done when:** you can decode your own QR and verify the signature is valid — then deliberately tamper with one character and watch verification fail.

### Day 12: Check-In API
**Build:** endpoint that accepts a scanned QR payload, verifies the signature, checks it hasn't already been used, marks it checked-in.
**Done when:** scanning the same valid QR twice returns "already checked in," not a duplicate success.

### Day 13: Mobile Scanner UI
**Learn:** browser camera access + a JS QR-scanning library.
**Build:** a minimal webpage that opens the device camera, scans a QR, and calls your check-in API.
**Done when:** you scan a ticket QR from your phone's browser and see a live confirmation.

### Day 14: Buffer + Review
Run the *entire* flow start to finish: browse → buy → pay → receive QR → scan → checked-in. Fix whatever breaks — something will.

---

## Week 3 — Analytics, PDFs/Queue, Ship It

### Day 15: Aggregation — Revenue & Sales
**Learn:** MongoDB aggregation pipeline (`$match`, `$group`, `$lookup`, `$sort`).
**Build:** organizer analytics endpoint: total revenue, tickets sold per tier, daily sales buckets.
**Done when:** the numbers match what you'd get by manually counting your seed data.

### Day 16: Aggregation — Conversion & Attendance
**Build:** a lightweight event-view counter, conversion rate (views → purchases), attendance rate (checked-in ÷ sold), all via aggregation.
**Done when:** dashboard JSON returns all three metrics correctly.

### Day 17: Analytics Dashboard UI
**Build:** simple frontend page with charts (Chart.js or Recharts) consuming yesterday's endpoints.
**Done when:** an organizer can visually see revenue over time and attendance %.

### Day 18: Background Jobs with BullMQ
**Learn:** why PDF/email generation shouldn't block the request-response cycle; Redis + BullMQ queues and workers.
**Build:** Redis running locally, a `generate-ticket-pdf` queue, and a worker process listening to it.
**Done when:** you can manually push a job onto the queue and watch the worker pick it up in a separate terminal.

### Day 19: PDF Generation
**Learn:** `pdfkit` or Puppeteer for PDF generation.
**Build:** the worker generates a ticket/invoice PDF (embedding the QR), saves it, and the payment webhook from Day 9 now enqueues this job automatically.
**Done when:** paying for a real test order results in a downloadable PDF, generated asynchronously.

### Day 20: Email Delivery + Failure Handling
**Build:** Nodemailer + a test SMTP (Mailtrap works well for dev), send the PDF as an email attachment; add retry/backoff to failed BullMQ jobs.
**Done when:** end-to-end works: pay → PDF generated → email sent (or logged, if using a sandbox inbox) — and a deliberately-failed job retries instead of vanishing.

### Day 21: Deploy, Document, Polish
**Build:** deploy backend (Render/Railway are free-tier friendly), MongoDB Atlas + Redis (Upstash) in prod, environment variables set as secrets — never committed.
**Write:** a real README — architecture diagram, setup steps, a screenshot or short demo GIF of the check-in flow.
**Done when:** you have a live URL a stranger could hit, and a repo that explains itself without you standing next to them.

---

## If you fall behind
Cut in this order, don't cut fundamentals: (1) skip the frontend scanner UI, test check-in via Postman only, (2) skip email delivery, just generate the PDF, (3) skip conversion-rate tracking, keep revenue + attendance only. Auth, payments, webhooks, and QR signing are the load-bearing parts — protect those days.

## Resume bullet points (draft once it's done, don't write these now)
- Built a multi-tenant ticketing platform with Stripe/Razorpay payment webhooks, achieving idempotent, race-condition-safe inventory management
- Designed a signed-QR check-in system preventing ticket forgery, with a mobile camera-based scanner
- Built async PDF/email generation pipeline using Redis + BullMQ, decoupling payment confirmation from delivery
- Built organizer analytics dashboard using MongoDB aggregation pipelines for real-time revenue and attendance metrics
