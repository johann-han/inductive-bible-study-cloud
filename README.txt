INDUCTIVE BIBLE STUDY WORKSPACE — CLOUD SYNC PREPARATION (v5)

What this version adds
- Email/password sign-in and account creation through Supabase Auth.
- Cloud syncing for Observe, Interpret and Apply notes per book/chapter.
- A merge of local and cloud studies on first sign-in, using most-recent edit time.
- Deletion markers so a deleted chapter does not simply reappear at the next sync.
- A server config endpoint (/api/config) that exposes only the Supabase project URL and public anon/publishable key.
- Existing local saves, Strong's UI/lexicon and AI Mentor request path are retained.
- When cloud settings are configured, AI calls require a valid signed-in Supabase session and are rate-limited per account as a basic safeguard against OpenRouter quota abuse.

IMPORTANT: Cloud syncing only becomes active after a Supabase project is configured. This package is not deployed online yet. Until deployment and setup are complete, your notes continue to save locally in the current browser.

PART A — Set up the Supabase database
1. Create a Supabase project at https://supabase.com/.
2. In the Supabase project, open SQL Editor.
3. Open supabase_schema.sql from this package, copy the full contents, and run it in SQL Editor.
4. In Project Settings -> API, copy the Project URL and the public publishable/anon key.
   Do NOT use the service_role/secret key in the browser or in SUPABASE_ANON_KEY.
5. In Authentication settings, decide whether new accounts need email confirmation. If confirmation is enabled, new users must confirm their email before signing in.
6. For a private personal app, create your own account first. After confirming it works, disable public sign-ups in Supabase Auth settings if you do not want other people to create accounts and use your AI quota.

PART B — Configure local testing
1. Copy .env.example to a file named .env in this folder.
2. Fill in OPENROUTER_API_KEY with your OpenRouter API key.
3. Fill in SUPABASE_URL and SUPABASE_ANON_KEY with your Supabase Project URL and public key.
4. Keep .env private. Do not upload it to a public repository or share its contents in chat.
5. Install Node.js 18 or newer if not already installed.
6. In a terminal opened in this folder, run: node server.js
7. Open http://127.0.0.1:8787 and press Ctrl+F5.
8. Click the Cloud button, create an account or sign in, then use Sync studies now. Existing local studies are merged; they are not intentionally cleared.
9. Test with one or two non-sensitive notes first and confirm the same record is present in Supabase and the Study Library.

PART C — Make it available on both computer and phone
The address 127.0.0.1 only works on the computer running the server; it cannot be used as your public mobile address. The app must be hosted on an HTTPS Node.js service. A typical route is to put these app files in a private GitHub repository and deploy the repository to a Node host such as Render, then add the environment variables below in the host's Environment settings:
- OPENROUTER_API_KEY (secret)
- OPENROUTER_MODEL (optional)
- SUPABASE_URL
- SUPABASE_ANON_KEY
The hosting service supplies PORT automatically. The server binds to 0.0.0.0 for hosted environments.

After deployment:
1. Copy the public HTTPS app URL supplied by the host.
2. Add that URL to Supabase Authentication URL Configuration / allowed redirect URLs (use the exact deployed URL and any required callback paths).
3. Open the HTTPS URL on the computer and phone.
4. Sign in with the same account on both devices. Changes normally sync after typing pauses; use Sync studies now for a manual sync.
5. Export Markdown backups until you have confirmed multi-device sync over several sessions.

DATA / SECURITY NOTES
- Local notes stay in browser localStorage as a local copy. Supabase stores a separate cloud copy.
- Row Level Security in supabase_schema.sql restricts reads and writes to the signed-in user's own records.
- The Supabase URL and public anon/publishable key are not secret. Never use a Supabase service_role/secret key in this app.
- The OpenRouter key is read only by the Node server and is never sent through /api/config. When Supabase is configured, AI requests must include a valid signed-in session and are limited to 30 requests per account per 10-minute window by this server process. This is a basic guard, not a substitute for monitoring OpenRouter usage and spending limits.
- First cloud sync merges records by their last-edit timestamps. If two devices edit the same chapter while offline, the most recently timestamped version wins; export important work as backup.
- This package's cloud code has been syntax-checked, but it cannot complete a live authentication/database test until you configure your own Supabase project and host. Do not delete the old folder or browser storage until you have confirmed cloud sync.
