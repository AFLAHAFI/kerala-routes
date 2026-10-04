# RC1 deployment record

## Verified before publication
- Local RC source archive created: Kerala_Routes_V2_RC_Local.zip.
- 64 automated tests passed; build and compiled two-player restart smoke passed.
- GitHub rollback branch: backup/pre-v2-2026-10-04.
- Supabase migrations applied: v2_rc1_profile_restore_point; v2_rc1_moderation_and_leaderboards.
- 41 original profile identities and all 41 progress/settings values unchanged immediately after migration; private backup contains 41 rows.
- All eight leaderboard metrics execute successfully and return at most 20 rows.
- Public/anonymous and authenticated roles cannot execute the leaderboard RPC; service_role can. Anonymous roles cannot insert reports; moderation RLS enabled.
- Existing profile-store Edge Function advanced to version 2, preserving its custom server-token authentication and original load/save contract.
- Security advisor: informational no-policy notices only. These tables intentionally allow server-only access; no browser policy is required.
- Render JASEERA workspace confirmed. Merged extra client origins, 15-player capacity and mandatory persistence; existing credentials retained.

## Publication
Pending live Render, Pages and Sites verification. Do not interpret a source push as proof of a healthy deployment.

## Browser/device limitation
The cloud Chrome browser reports WebGL unavailable on the existing game. No real-device rendering/FPS, touch or audio acceptance is claimed. Release is explicitly a public playtest candidate.
