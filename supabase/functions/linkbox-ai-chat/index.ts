// Deploy as Supabase Edge Function: linkbox-ai-chat
// Required secret: OPENAI_API_KEY. Configure per-project rate limiting before public launch.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("CHAT_ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "OpenAI service is not configured" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
    const body = await req.json();
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 20) return new Response(JSON.stringify({ error: "Invalid message history" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    const safe = messages.map((m: { role?: string; content?: string }) => {
      if (!(["user", "assistant"].includes(m?.role || "")) || typeof m.content !== "string" || !m.content.trim() || m.content.length > 8000) throw new Error("Invalid message");
      return { role: m.role, content: m.content.trim() };
    });
    const result = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini", messages: [
        { role: "system", content: "You are LinkBox AI, a helpful, accurate assistant. Reply in the user's language, with a natural Persian style when the user writes Persian. Use markdown when useful. Do not claim to have capabilities you do not have." },
        ...safe,
      ], temperature: 0.7, max_tokens: 1200 }),
    });
    const data = await result.json();
    if (!result.ok) return new Response(JSON.stringify({ error: "AI provider request failed" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) throw new Error("Empty response");
    return new Response(JSON.stringify({ reply: reply.trim() }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    const status = e instanceof Error && e.message === "Invalid message" ? 400 : 500;
    return new Response(JSON.stringify({ error: status === 400 ? "Invalid message content" : "Unable to process request" }), { status, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
