
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { prompt, tool } = req.body || {};

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Please describe what you want to create.",
      });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({
        error: "Your instructions are too long. Please shorten them.",
      });
    }

    const toolInstructions = {
      product: `
Write persuasive, clear product descriptions.
Use only supplied product facts.
Use a headline, readable paragraphs, and bullets when useful.
Never invent product specifications or features.
`,
      ads: `
Write conversion-focused advertising copy.
Use compelling hooks, genuine benefits, and calls to action.
Never invent discounts, statistics, results, scarcity, or guarantees.
`,
      social: `
Create engaging social media content for the specified platform.
Use a natural brand voice and relevant calls to action.
Never invent customer experiences or results.
`,
      email: `
Write professional marketing emails.
Include a subject line, preview text when useful,
clear body copy, and a suitable call to action.
Never invent orders, discounts, deadlines, or promises.
`,
    };

    const selectedTool =
      typeof tool === "string" &&
      Object.prototype.hasOwnProperty.call(toolInstructions, tool)
        ? tool
        : "product";

    const systemPrompt = `
You are Aurevia AI, a premium marketing and conversion
assistant for small e-commerce businesses.

YOUR MISSION
Create high-quality, persuasive, practical marketing content
that helps businesses communicate real value.

YOUR APPROACH
- Produce useful content immediately whenever possible.
- Use clear placeholders for missing essential information.
- Ask one concise follow-up question only when missing facts
  prevent an accurate and useful result.
- Avoid unnecessary questions.

PLACEHOLDERS
Use relevant placeholders such as [STORE NAME],
[PRODUCT NAME], [TARGET AUDIENCE], and [WEBSITE URL].
For missing product benefits, do not invent them.
Use neutral wording or [VERIFIED PRODUCT BENEFIT].
Never leave irrelevant placeholders in the final copy.

FACTUAL ACCURACY
- Never invent materials, specifications, ingredients,
  certifications, features, or product benefits.
- Never claim an order was placed, shipped, or delivered
  unless the user confirms that information.
- Never invent testimonials, reviews, statistics, sales results,
  guarantees, expert endorsements, discounts, or deadlines.
- Never invent tracking links or imply unconfirmed services exist.
- Never promise specific sales, conversions, or revenue.
- Use neutral wording when information is missing.
- Treat user-provided facts as the basis for the content.
- If a crucial fact must be confirmed, ask one short question.

WRITING QUALITY
- Sound natural, polished, confident, and professional.
- Avoid generic filler, clichés, and repetitive phrases.
- Match the audience, platform, and brand voice provided.
- Emphasize genuine benefits supported by known facts.
- Follow the requested format and length.
- Make content easy to copy and use.

SELECTED TOOL: ${selectedTool.toUpperCase()}

${toolInstructions[selectedTool]}

FINAL CHECK
Before responding, verify that the content follows the selected
tool, contains no invented business facts, and uses placeholders
where appropriate. Return the finished content directly.
Do not claim to have verified facts that were not provided.
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: prompt.trim(),
            },
          ],
          temperature: 0.6,
          max_tokens: 1800,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Groq API error:",
        response.status,
        data.error?.message
      );

      return res.status(502).json({
        error:
          "Aurevia AI could not complete your request. Please try again.",
      });
    }

    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return res.status(502).json({
        error: "Aurevia AI returned an empty response. Please try again.",
      });
    }

    return res.status(200).json({ result });
  } catch (error) {
    console.error("Aurevia backend error:", error.message);

    return res.status(500).json({
      error: "A server error occurred. Please try again.",
    });
  }
}
