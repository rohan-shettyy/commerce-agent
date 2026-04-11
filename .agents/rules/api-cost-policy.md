---
trigger: always_on
---

API & Cost Policy
Every AI API used in this project must be free with no credit card required.
The stack uses the Google Gemini API free tier (obtainable at https://aistudio.google.com/apikey — no billing account needed).
All other AI components run locally or use free browser APIs.
Do NOT introduce any paid API or service at any point.

Free Tier Rate Limits (Gemini 3.1 Flash — as of April 2026)
Metric	Free Tier Limit
RPM (requests per minute)	15
TPM (tokens per minute)	250,000
RPD (requests per day)	1,500
Model to use: gemini-3.1-flash — highest free-tier RPD (1,500/day) among current Gemini models. Do NOT use gemini-2.5-pro (only 100 RPD free) or any model labeled experimental or preview (unstable, subject to deprecation without notice).