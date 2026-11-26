import { completeMagistroConnect } from "@/src/server";

export const dynamic = "force-dynamic";

function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function page(title: string, heading: string, body: string, ok: boolean): Response {
	const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: #141414; color: #e6e6e6; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 24px; }
    .card { max-width: 440px; width: 100%; background: #1c1c1c; border: 1px solid ${ok ? "#3a3a3a" : "#7f1d1d"}; border-radius: 8px; padding: 24px; line-height: 1.5; }
    h1 { margin: 0 0 8px; font-size: 1.2rem; }
    p { margin: 0 0 16px; color: #b5b5b5; font-size: 0.92rem; }
    a { display: inline-block; padding: 8px 14px; border-radius: 6px; background: #ffffff; color: #141414; font-weight: 600; font-size: 0.875rem; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(heading)}</h1>
    <p>${escapeHtml(body)}</p>
    <a href="/">Open Magistro</a>
  </div>
</body>
</html>`;
	return new Response(html, {
		status: ok ? 200 : 400,
		headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
	});
}

export async function GET(req: Request) {
	const url = new URL(req.url);
	const state = url.searchParams.get("state") ?? "";
	const token = url.searchParams.get("token") ?? "";
	const result = completeMagistroConnect(state, token);
	if (!result.ok) {
		return page("Magistro — Sign-in Failed", "Could not connect Magistro", result.error, false);
	}
	return page(
		"Magistro — Connected",
		"Magistro is connected",
		"Your API token has been saved. You can close this browser tab and return to the Magistro app.",
		true,
	);
}
