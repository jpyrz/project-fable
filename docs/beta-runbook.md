# Invite beta runbook

## Before opening invitations

1. Replace temporary pet and town art with approved original assets.
2. Apply migrations to a fresh staging project and inspect every RLS policy with two ordinary test accounts plus one moderator.
3. Run the full onboarding-to-chat journey at 390 × 844 and 1440 × 900.
4. Simulate two simultaneous purchases of one listing; exactly one must settle.
5. Complete a backup and restore drill, then record the date and operator.
6. Publish community rules, privacy notice, terms, reporting expectations, and a monitored moderation contact.

## Launch stages

- Start with 10 known testers for 72 hours.
- Expand to 25 after resolving data-loss, economy, or moderation-severity defects.
- Expand to 50, then 100 only while every infrastructure quota remains below 70% and reports can be reviewed within 24 hours.

## Watch daily

- Onboarding completion and verification failures
- Currency created, destroyed, and market fee volume
- Suspicious game-run rate
- Failed or duplicated purchase correlations
- Peak realtime connections and message volume
- Open reports, mutes, bans, and response time

Do not log chat or DM bodies to analytics. Use database IDs to correlate an incident with access-controlled moderation records.
