# LinkBox AI chat function

Deploy this function to the Supabase project configured in `config.js`.

1. Set the secret `OPENAI_API_KEY` in Supabase (never place it in frontend files or GitHub).
2. Optionally set `OPENAI_MODEL` (defaults to `gpt-4o-mini`).
3. Optionally set `CHAT_ALLOWED_ORIGIN` to the exact published LinkBox origin.
4. Deploy function `linkbox-ai-chat` and test with the deployed public site.

This starter validates request shape and message size. Before enabling broad public traffic, configure server-side rate limiting/quotas and abuse monitoring. OpenAI usage is billed to the API account owning the key. The static GitHub Pages site itself cannot keep API secrets.
