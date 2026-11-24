import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";

const testData = fs.mkdtempSync(path.join(os.tmpdir(), "magistro-provider-test-"));
process.env.LH_DATA_DIR = testData;
process.env.LH_AUTH_FILE = path.join(testData, "auth.json");
after(() => fs.rmSync(testData, { recursive: true, force: true }));

const { MAGISTRO_PROVIDER, resolveMagistroBaseUrl } = await import("../src/core/auth-keys.ts");
const { deleteKey, isWritableAuthKey, providerKeyPresent, saveKey } = await import("../src/server/keys.ts");
const { catalogProviders, modelCatalog } = await import("../src/server/model-catalog.ts");
const { magistroProxyBaseUrl, syncMagistroProvider } = await import("../src/server/magistro-provider.ts");
const { piModels } = await import("../src/agent/models.ts");

describe("Magistro token proxy provider", () => {
	it("defaults base URL to localhost proxy and rejects malformed URLs", () => {
		assert.equal(resolveMagistroBaseUrl(undefined), "http://localhost:8000/v1");
		assert.equal(resolveMagistroBaseUrl("https://api.magistro.example/v1/"), "https://api.magistro.example/v1");
		assert.equal(resolveMagistroBaseUrl("ftp://invalid.example/v1"), "http://localhost:8000/v1");
		assert.equal(resolveMagistroBaseUrl("https://user:pass@evil.example/v1"), "http://localhost:8000/v1");
	});

	it("registers magistro provider when MAGISTRO_API_KEY is saved and unregisters on delete", async () => {
		assert.equal(isWritableAuthKey(MAGISTRO_PROVIDER.envVar), true);
		const prevBase = process.env.MAGISTRO_API_BASE_URL;
		const prevKey = process.env.MAGISTRO_API_KEY;
		delete process.env.MAGISTRO_API_KEY;
		delete process.env.MAGISTRO_API_BASE_URL;
		syncMagistroProvider();
		try {
			assert.equal(providerKeyPresent("magistro"), false);
			assert.equal(piModels().getProvider("magistro"), undefined);

			process.env.MAGISTRO_API_BASE_URL = "http://localhost:8010/v1/";
			const saved = saveKey(MAGISTRO_PROVIDER.envVar, "mgst_test_personal_token_123456");
			assert.equal(saved.ok, true);
			assert.equal(magistroProxyBaseUrl(), "http://localhost:8010/v1");
			assert.equal(providerKeyPresent("magistro"), true);

			const provider = piModels().getProvider("magistro");
			assert.ok(provider);
			assert.equal(provider!.baseUrl, "http://localhost:8010/v1");

			const catalog = modelCatalog();
			const magistroModels = catalog.models.filter((m) => m.provider === "magistro");
			assert.ok(magistroModels.some((m) => m.id === "deepseek-flash" && m.input.includes("image")));
			assert.ok(magistroModels.some((m) => m.id === "deepseek-v4-pro" && m.reasoning));
			for (const model of magistroModels) {
				assert.equal(model.cost, null, "billing/pricing must never live in the app");
			}
			assert.equal(catalogProviders().find((p) => p.id === "magistro")?.keyPresent, true);

			deleteKey(MAGISTRO_PROVIDER.envVar);
			assert.equal(providerKeyPresent("magistro"), false);
			assert.equal(piModels().getProvider("magistro"), undefined);
		} finally {
			if (prevBase === undefined) delete process.env.MAGISTRO_API_BASE_URL; else process.env.MAGISTRO_API_BASE_URL = prevBase;
			if (prevKey === undefined) delete process.env.MAGISTRO_API_KEY; else process.env.MAGISTRO_API_KEY = prevKey;
			syncMagistroProvider();
		}
	});
});
