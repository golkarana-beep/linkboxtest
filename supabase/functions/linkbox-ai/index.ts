// Public-facing proxy for LinkBox. Set OPENAI_API_KEY as a Supabase Function secret.
// Configure allowed origin and provider budget/rate limits before production use.
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CHAT_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "سرویس هوش مصنوعی هنوز پیکربندی نشده است." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 20) throw new Error("پیام‌ها نامعتبر هستند.");
    const messages = body.messages.map((m: any) => {
      if (!['user', 'assistant'].includes(m?.role) || typeof m?.content !== 'string' || m.content.length > 12000) throw new Error("محتوای پیام نامعتبر است.");
      return { role: m.role, content: m.content };
    });
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini", instructions: "You are LinkBox's helpful AI assistant. Reply in the user's language. Be accurate, clear, and concise.", input: messages, max_output_tokens: 1200 }),
    });
    const result = await upstream.json();
    if (!upstream.ok) return new Response(JSON.stringify({ error: "سرویس هوش مصنوعی پاسخ نداد. کمی بعد دوباره تلاش کنید." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const reply = (result.output || []).flatMap((item: any) => item.content || []).filter((part: any) => part.type === "output_text").map((part: any) => part.text).join("\n");
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "درخواست نامعتبر است." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
