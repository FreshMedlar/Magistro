import { beginMagistroConnect } from "@/src/server";

export const dynamic = "force-dynamic";

function resolveAppOrigin(req: Request): string {
	const headerOrigin = req.headers.get("origin");
	if (headerOrigin) {
		try {
			const parsed = new URL(headerOrigin);
			if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.origin;
		} catch {
			// fall back to request URL
		}
	}
	return new URL(req.url).origin;
}

export async function POST(req: Request) {
	try {
		const { authUrl } = beginMagistroConnect(resolveAppOrigin(req));
		return Response.json({ authUrl }, { headers: { "Cache-Control": "no-store" } });
	} catch {
		return Response.json({ error: "Could not start Magistro sign-in" }, { status: 400 });
	}
}
