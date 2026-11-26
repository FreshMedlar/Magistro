/**
 * Browser-redirect authentication flow for the hosted Magistro billing/token
 * service. Generates one-time CSRF state tokens, receives the loopback callback,
 * persists `MAGISTRO_API_KEY`, seeds standard-user default model slots, and
 * broadcasts `"magistro-connected"` over the SSE bus.
 */

import { randomBytes } from "node:crypto";
import { emit } from "../core/events.ts";
import { MAGISTRO_PROVIDER, resolveMagistroWebUrl } from "../core/auth-keys.ts";
import {
	CURRENT_SETTINGS_VERSION,
	MODEL_SLOTS,
	STANDARD_MAGISTRO_SLOT_DEFAULTS,
	STANDARD_USER_SETTINGS,
	type ModelsSettings,
} from "../core/settings.ts";
import { readSettings, writeSettings } from "../store/settings.ts";
import { saveKey } from "./keys.ts";

const CONNECT_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_STATES = 50;
const KEY = Symbol.for("lh.magistroAuthStates");

interface PendingState {
	expiresAt: number;
}

function pendingStates(): Map<string, PendingState> {
	const g = globalThis as typeof globalThis & { [KEY]?: Map<string, PendingState> };
	return (g[KEY] ??= new Map());
}

function pruneExpired(now = Date.now()): void {
	const map = pendingStates();
	for (const [k, v] of map) {
		if (v.expiresAt <= now) map.delete(k);
	}
	while (map.size > MAX_PENDING_STATES) {
		const oldest = map.keys().next().value;
		if (!oldest) break;
		map.delete(oldest);
	}
}

export function magistroWebUrl(): string {
	return resolveMagistroWebUrl(process.env[MAGISTRO_PROVIDER.baseUrlEnvVar]);
}

/** Populate any unset strong/cheap/vision slots with `deepseek-flash` (low)
 *  when standard-user mode is active so users can start chatting immediately. */
export function ensureStandardMagistroModels(): void {
	const existing = readSettings() ?? { version: CURRENT_SETTINGS_VERSION };
	const models: ModelsSettings = { ...existing.models };
	let changed = false;
	for (const slot of MODEL_SLOTS) {
		if (!models[slot]?.model) {
			models[slot] = { ...STANDARD_MAGISTRO_SLOT_DEFAULTS[slot] };
			changed = true;
		}
	}
	if (changed) {
		writeSettings({ ...existing, version: CURRENT_SETTINGS_VERSION, models });
	}
}

export function beginMagistroConnect(appOrigin: string): { state: string; authUrl: string } {
	let parsed: URL;
	try {
		parsed = new URL(appOrigin);
	} catch {
		throw new Error("Invalid app origin");
	}
	if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.username || parsed.password || parsed.search || parsed.hash) {
		throw new Error("Invalid app origin");
	}
	const origin = parsed.origin;
	const state = randomBytes(24).toString("hex");
	pruneExpired();
	pendingStates().set(state, { expiresAt: Date.now() + CONNECT_TTL_MS });

	const redirectUri = `${origin}/api/auth/magistro/callback`;
	const authUrl = `${magistroWebUrl()}/?connect=1&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
	return { state, authUrl };
}

export function completeMagistroConnect(
	state: string,
	token: string,
): { ok: true } | { ok: false; status: number; error: string } {
	const trimmedState = state.trim();
	const pending = trimmedState ? pendingStates().get(trimmedState) : undefined;
	if (!pending || pending.expiresAt <= Date.now()) {
		if (trimmedState) pendingStates().delete(trimmedState);
		return { ok: false, status: 400, error: "Sign-in request expired or invalid. Start again from Magistro." };
	}
	pendingStates().delete(trimmedState);

	const saved = saveKey(MAGISTRO_PROVIDER.envVar, token);
	if (!saved.ok) {
		return { ok: false, status: 400, error: saved.error };
	}
	if (STANDARD_USER_SETTINGS) {
		ensureStandardMagistroModels();
	}
	emit("magistro-connected", {});
	return { ok: true };
}
