> Historical Alpha checkpoint below. Current RC1 status: [RELEASE_RC1.md](RELEASE_RC1.md). Deployment results will be recorded in RELEASE_DEPLOYMENT.md.

# Database status and prepared migrations

**No production Supabase changes were made.** Player progress gains an optional `v2` object inside the existing JSONB progress value. The application migration preserves old KP, missions, journal, visited places and driver stops.

- `001_profiles.sql`: existing profiles/RLS setup; retained.
- `002_v2_moderation.sql`: new server-only moderation evidence/audit table, creation-time index, RLS enabled, no anon/authenticated table permissions.
- `003_v2_leaderboards.sql`: service-role-only, security-invoker ranking RPC returning names and scores, eight validated metrics and at most 20 rows.
- `supabase/functions/profile-store/index.ts`: prepared additions for moderation records/history and rankings. The `PROFILE_TOKEN_SHA256` placeholder must be replaced using the existing authorized server-token configuration before any deployment; never deploy the placeholder or expose the secret to the client.

The server supports either direct server-only Supabase credentials or the existing Edge Function adapter. Both require the migrations before running this V2 server. The laptop launcher clears Supabase variables and uses atomic file-backed profiles; local rankings and moderation history also use laptop files.

Verified: in-memory and file round-trips, serialized save retry behavior, legacy progress migration, mocked existing Supabase profile REST adapter. **Not verified:** executing new SQL on PostgreSQL, new RPC permissions/query plans, real Supabase restart/reload and Edge Function integration. No local PostgreSQL binary was available. Validate these on an isolated development database before production release. Do not reset the existing profiles table.

## RC2 restore point

Remote migration `rc2_profile_restore_point` creates `kr_release_backup_20261004.profiles_before_rc2` as a full copy of the 42 pre-release profiles. RLS is enabled and all PUBLIC/anon/authenticated permissions revoked. Existing public profile schema and the Edge Function are unchanged. Restore only selected profiles after reviewing newer progress.
