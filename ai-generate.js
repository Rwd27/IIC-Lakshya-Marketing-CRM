// Netlify Function: proxies email/message generation requests to the
// Anthropic API. The API key lives only here, as a Netlify environment
// variable (ANTHROPIC_API_KEY) — it is never sent to the browser.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "ANTHROPIC_API_KEY is not set in Netlify environment variables." }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid JSON body." }) };
  }

  const { system, user } = payload;
  if (!user) {
    return { statusCode: 400, body: JSON.stringify({ message: "Missing 'user' prompt." }) };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: system || undefined,
        messages: [{ role: "user", content: user }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || data?.message || JSON.stringify(data);
      return { statusCode: res.status, body: JSON.stringify({ message: msg }) };
    }

    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    return {
      statusCode: 200,
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: "Error reaching Anthropic API: " + err.message }) };
  }
};
