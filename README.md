# Ace Club LMS

A high-performance GMAT learning platform built with Next.js 14 and Supabase.

## Features
- **Student Dashboard**: Progress tracking and session access.
- **Admin Panel**: Manage courses, sessions, and students.
- **Session-Based Learning**: Structured content release for Notion materials, PDFs, and videos.
- **GMAT Question Bank**: Supabase-backed standalone and RC/DI set storage with CSV import tooling.
- **Premium Design**: Dark-themed, glassmorphic UI.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Question Bank

Run `supabase_question_bank.sql` in Supabase SQL Editor, then validate CSV uploads with:

```bash
npm run question-bank:dry-run
```

See `docs/question-bank.md` for schema, CSV, and endpoint details.

## Registration Payments

Run `supabase_registration_payments.sql` in Supabase SQL Editor before opening public cohort registration.

Required environment variables:

```bash
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
RAZORPAY_WEBHOOK_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Generic Standard Checkout endpoints are available at:

- `POST /api/create-order` with `{ "amount": 2500000, "currency": "INR", "receipt": "receipt_001" }`
- `POST /api/verify-payment` with Razorpay's `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`
