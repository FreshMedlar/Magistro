/**
 * Magistro token proxy provider (Phase 1 step 6): routes LLM calls to the
 * separate Magistro OpenAI-compatible proxy (`MAGISTRO_API_BASE_URL`, default
 * `http://localhost:8000/v1`) using the user's personal `MAGISTRO_API_KEY`.
 * No billing logic or secrets are embedded in the distributed app.
 */

import { createProvider, type Api, type Model } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { piModels } from "../agent/models.ts";
import { MAGISTRO_PROVIDER, resolveMagistroBaseUrl } from "../core/auth-keys.ts";
import { authStore } from "../store/auth.ts";

interface MagistroModelSeed {
	id: string;
	name: string;
	contextWindow: number;
	maxTokens: number;
	reasoning: boolean;
	input: ("text" | "image")[];
}

const MAGISTRO_MODELS: readonly MagistroModelSeed[] = [
	{
		id: "deepseek-flash",
		name: "DeepSeek V4.1 Flash (Magistro)",
		contextWindow: 1_000_000,
		maxTokens: 384_000,
		reasoning: true,
		input: ["text", "image"],
	},
	{
		id: "deepseek-v4-pro",
		name: "DeepSeek V4 Pro (Magistro)",
		contextWindow: 1_000_000,
		maxTokens: 384_000,
		reasoning: true,
		input: ["text"],
	},
	{
		id: "deepseek-chat",
		name: "DeepSeek Chat (Magistro)",
		contextWindow: 128_000,
		maxTokens: 8_192,
		reasoning: false,
		input: ["text"],
	},
	{
		id: "deepseek-reasoner",
		name: "DeepSeek Reasoner (Magistro)",
		contextWindow: 128_000,
		maxTokens: 65_536,
		reasoning: true,
		input: ["text"],
	},
];

function readMagistroApiKey(): string | undefined {
	const raw = process.env.LH_IGNORE_ENV_KEYS === "1"
		? authStore.authVars()[MAGISTRO_PROVIDER.envVar]
		: process.env[MAGISTRO_PROVIDER.envVar] ?? authStore.authVars()[MAGISTRO_PROVIDER.envVar];
	const trimmed = raw?.trim();
	return trimmed || undefined;
}

export function magistroProxyBaseUrl(): string {
	return resolveMagistroBaseUrl(process.env[MAGISTRO_PROVIDER.baseUrlEnvVar]);
}

function toMagistroModel(seed: MagistroModelSeed, baseUrl: string): Model<Api> {
	return {
		id: seed.id,
		name: seed.name,
		api: "openai-completions",
		provider: MAGISTRO_PROVIDER.id,
		baseUrl,
		reasoning: seed.reasoning,
		input: [...seed.input],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: seed.contextWindow,
		maxTokens: seed.maxTokens,
		type: "chat",
	};
}

let lastFingerprint: string | undefined;

/** Register or update the `magistro` provider in `piModels()` when `MAGISTRO_API_KEY` is present. */
export function syncMagistroProvider(): void {
	const models = piModels();
	const apiKey = readMagistroApiKey();
	const baseUrl = magistroProxyBaseUrl();
	const fingerprint = JSON.stringify([Boolean(apiKey), apiKey ?? "", baseUrl]);
	if (fingerprint === lastFingerprint && (Boolean(apiKey) === (models.getProvider(MAGISTRO_PROVIDER.id) !== undefined))) {
		return;
	}
	if (!apiKey) {
		models.deleteProvider(MAGISTRO_PROVIDER.id);
		lastFingerprint = fingerprint;
		return;
	}
	models.setProvider(
		createProvider<Api>({
			id: MAGISTRO_PROVIDER.id,
			name: MAGISTRO_PROVIDER.label,
			baseUrl,
			auth: {
				apiKey: {
					name: `${MAGISTRO_PROVIDER.label} API key`,
					resolve: async () => ({
						auth: { apiKey: readMagistroApiKey() ?? apiKey },
						source: MAGISTRO_PROVIDER.envVar,
					}),
				},
			},
			models: MAGISTRO_MODELS.map((seed) => toMagistroModel(seed, baseUrl)),
			api: openAICompletionsApi(),
		}),
	);
	lastFingerprint = fingerprint;
}
