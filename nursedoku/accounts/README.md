# Account system — pending backend connection

Proposed provider: Supabase Auth + PostgreSQL. Guest play stays available. The current website has no working sign-in or cloud sync yet.

Implementation after the Supabase connection is confirmed:

1. Select/create the project and review any plan costs before provisioning paid resources.
2. Configure email verification and allowed redirects for https://siahverse.cc/nursedoku/.
3. Use the official Supabase client for email sign-in, sign-out, session refresh, and recovery. Never store user passwords in app code.
4. Apply schema.sql. Verify two test users cannot access each other's progress and unauthenticated access is denied.
5. Put only the project URL and publishable browser key in client configuration. No secret/service-role key belongs in the public repository.
6. Ask each signed-in user before uploading existing guest progress. Merge completed shifts/dates; offer an explicit choice for the active puzzle. Keep guest data separate when signing out.
7. Show sync status, handle offline changes, and provide account/data deletion.

Store game progress only; no patient information. The SQL file is preparatory and has not been executed against a live database.
