import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";

const testData = fs.mkdtempSync(path.join(os.tmpdir(), "magistro-auth-test-"));
process.env.LH_DATA_DIR = testData;
process.env.LH_AUTH_FILE = path.join(testData, "auth.json");
after(() => fs.rmSync(testData, { recursive: true, force: true }));

const { MAGISTRO_PROVIDER, resolveMagistroWebUrl } = await import("../src/core/auth-keys.ts");
const { subscribe } = await import("../src/core/events.ts");
const { STANDARD_MAGISTRO_SLOT_DEFAULTS } = await import("../src/core/settings.ts");
const { beginMagistroConnect, completeMagistroConnect, ensureStandardMagistroModels } = await import("../src/server/magistro-auth.ts");
const { deleteKey, providerKeyPresent } = await import("../src/server/keys.ts");
const { readSettings, writeSettings } = await import("../src/store/settings.ts");
const { syncMagistroProvider } = await import("../src/server/magistro-provider.ts");

describe("Magistro browser-redirect auth flow", () => {
	it("derives the billing web URL by stripping trailing /v1", () => {
		assert.equal(resolveMagistroWebUrl(undefined), "http://localhost:8000");
		assert.equal(resolveMagistroWebUrl("http://127.0.0.1:8000/v1/"), "http://127.0.0.1:8000");
		assert.equal(resolveMagistroWebUrl("https://api.magistro.example/v1"), "https://api.magistro.example");
	});

	it("issues a one-time state, rejects invalid/reused states, persists key, seeds deepseek-flash low, and emits magistro-connected", () => {
		const prevBase = process.env.MAGISTRO_API_BASE_URL;
		const prevKey = process.env.MAGISTRO_API_KEY;
		delete process.env.MAGISTRO_API_KEY;
		process.env.MAGISTRO_API_BASE_URL = "https://billing.magistro.example/v1";
		syncMagistroProvider();

		const events: string[] = [];
		const off = subscribe((ev) => {
			if (ev.type === "magistro-connected") events.push(ev.type);
		});

		try {
			const { state, authUrl } = beginMagistroConnect("http://localhost:3000");
			const parsed = new URL(authUrl);
			assert.equal(parsed.origin, "https://billing.magistro.example");
			assert.equal(parsed.searchParams.get("connect"), "1");
			assert.equal(parsed.searchParams.get("redirect_uri"), "http://localhost:3000/api/auth/magistro/callback");
			assert.equal(parsed.searchParams.get("state"), state);

			assert.equal(completeMagistroConnect("wrong-state", "mgst_valid_token_123456").ok, false);
			assert.equal(providerKeyPresent("magistro"), false);

			const badToken = completeMagistroConnect(state, "short");
			assert.equal(badToken.ok, false);
			// State is consumed one-time so replays fail
			assert.equal(completeMagistroConnect(state, "mgst_valid_token_123456").ok, false);

			const next = beginMagistroConnect("http://127.0.0.1:4123");
			const ok = completeMagistroConnect(next.state, "mgst_valid_token_123456");
			assert.equal(ok.ok, true);
			assert.equal(providerKeyPresent("magistro"), true);
			assert.deepEqual(events, ["magistro-connected"]);

			const stored = readSettings();
			assert.deepEqual(stored?.models, STANDARD_MAGISTRO_SLOT_DEFAULTS);

			// Existing slot overrides are preserved when ensuring defaults
			writeSettings({
				version: 1,
				models: {
					strong: { model: { provider: "magistro", id: "deepseek-v4-pro" }, thinkingLevel: "medium" },
				},
			});
			ensureStandardMagistroModels();
			const merged = readSettings();
			assert.deepEqual(merged?.models?.strong, {
				model: { provider: "magistro", id: "deepseek-v4-pro" },
				thinkingLevel: "medium",
			});
			assert.deepEqual(merged?.models?.cheap, STANDARD_MAGISTRO_SLOT_DEFAULTS.cheap);
			assert.deepEqual(merged?.models?.vision, STANDARD_MAGISTRO_SLOT_DEFAULTS.vision);

			deleteKey(MAGISTRO_PROVIDER.envVar);
		} finally {
			off();
			if (prevBase === undefined) delete process.env.MAGISTRO_API_BASE_URL; else process.env.MAGISTRO_API_BASE_URL = prevBase;
			if (prevKey === undefined) delete process.env.MAGISTRO_API_KEY; else process.env.MAGISTRO_API_KEY = prevKey;
			syncMagistroProvider();
		}
	});
});
