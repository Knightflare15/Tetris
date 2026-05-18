# `src/server/emailService.ts`

## What It Does

This module sends transactional auth emails for Brix. Right now that means registration OTPs and forgot-password OTPs.

## Why It Exists

Email delivery is an integration concern, not an authentication-routing concern. Keeping it separate lets `index.ts` describe the auth workflow while this file deals with Resend and the local logging fallback.

## Runtime Behavior

- If `RESEND_API_KEY` is configured, the service sends emails through Resend's HTTP API.
- If `RESEND_API_KEY` is missing, the service logs the OTP with Pino so local development can still complete the flow.

## Important Boundary

This file does not decide who should receive an OTP or whether an OTP is valid. It only turns an email address and code into a delivered message or a logged fallback record.

## Why This Design

The app can keep shipping while DNS and email-domain verification are still being set up. Developers can test registration and reset flows immediately, then switch to real email delivery by adding environment variables instead of rewriting auth logic.
