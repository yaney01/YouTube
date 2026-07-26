import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlayerResponse } from "../src/protobuf/player.response.js";

// Surge 的 WebView 引擎可能同时暴露 CommonJS module 与 $environment。
// 平台检测必须优先识别 Surge，否则 Storage 会误走 Node.js 的 require 路径。
globalThis.module = {};
globalThis.$environment = { "surge-version": "6.0" };
globalThis.$script = { startTime: Date.now() / 1000 };
globalThis.$argument = 'Type="Official"&Types="Translate"&AutoCC="false"&Position="Forward"&Vendor="Google"&ShowOnly="false"&LogLevel="WARN"&Storage="Argument"';
globalThis.$request = {
	url: "https://www.youtube.com/api/timedtext?v=test&lang=ko&kind=asr",
	method: "GET",
	headers: {},
};
globalThis.$persistentStore = {
	read: key => (key === "DualSubs" ? JSON.stringify({ YouTube: { Settings: { AutoCC: true } } }) : null),
	write: () => true,
};

let completedRequest;
globalThis.$done = request => {
	completedRequest = request;
};

await import("../dist/request.bundle.js");
await new Promise(resolve => setTimeout(resolve, 20));

assert.ok(completedRequest, "Surge request script did not finish");
const rewrittenUrl = new URL(completedRequest.url);
assert.equal(rewrittenUrl.searchParams.get("tlang"), null);
assert.equal(rewrittenUrl.searchParams.get("subtype"), null);

globalThis.$request = {
	url: "https://www.youtube.com/api/timedtext?v=test&lang=ko&kind=asr&tlang=zh-Hans",
	method: "GET",
	headers: {},
};
completedRequest = undefined;

await import("../dist/request.bundle.js?manual-translate");
await new Promise(resolve => setTimeout(resolve, 20));

assert.ok(completedRequest, "Surge manual translation request did not finish");
const manualTranslationUrl = new URL(completedRequest.url);
assert.equal(manualTranslationUrl.searchParams.get("tlang"), "zh-Hans");
assert.equal(manualTranslationUrl.searchParams.get("subtype"), "Official");

globalThis.$request = {
	url: "https://www.youtube.com/youtubei/v1/player",
	method: "POST",
	headers: { "Content-Type": "application/json" },
};
globalThis.$response = {
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		captions: {
			playerCaptionsTracklistRenderer: {
				captionTracks: [
					{ languageCode: "en", vssId: ".en", baseUrl: "https://www.youtube.com/api/timedtext?lang=en" },
					{ languageCode: "ko", vssId: "a.ko", kind: "asr", baseUrl: "https://www.youtube.com/api/timedtext?lang=ko&kind=asr" },
				],
				audioTracks: [{ captionTrackIndices: [0, 1], defaultCaptionTrackIndex: 0 }],
				translationLanguages: [],
			},
		},
	}),
};

let completedResponse;
globalThis.$done = response => {
	completedResponse = response;
};

await import("../dist/response.bundle.js");
await new Promise(resolve => setTimeout(resolve, 20));

assert.ok(completedResponse, "Surge response script did not finish");
const playerResponse = JSON.parse(completedResponse.body);
const tracklist = playerResponse.captions.playerCaptionsTracklistRenderer;
assert.equal(tracklist.captionTracks.length, 3);
assert.equal(new URL(tracklist.captionTracks[2].baseUrl).searchParams.get("tlang"), "zh-Hans");
assert.equal(tracklist.audioTracks[0].defaultCaptionTrackIndex, 2);

globalThis.$request = {
	url: "https://youtubei.googleapis.com/youtubei/v1/player",
	method: "POST",
	headers: { "Content-Type": "application/protobuf" },
};
globalThis.$response = {
	headers: { "Content-Type": "application/protobuf" },
	body: PlayerResponse.toBinary(
		PlayerResponse.create({
			captions: {
				playerCaptionsTracklistRenderer: {
					captionTracks: [
						{ languageCode: "en", vssId: ".en", baseUrl: "https://www.youtube.com/api/timedtext?lang=en", name: { runs: [{ text: "English" }] } },
						{ languageCode: "ko", vssId: "a.ko", kind: "asr", baseUrl: "https://www.youtube.com/api/timedtext?lang=ko&kind=asr", name: { runs: [{ text: "한국어 (자동 생성)" }] } },
					],
					audioTracks: [{ captionTrackIndices: [0, 1], defaultCaptionTrackIndex: 0 }],
					translationLanguages: [],
				},
			},
		}),
	),
};
completedResponse = undefined;

await import("../dist/response.bundle.js?protobuf-player");
await new Promise(resolve => setTimeout(resolve, 20));

assert.ok(completedResponse, "Surge protobuf response script did not finish");
const protobufPlayerResponse = PlayerResponse.fromBinary(completedResponse.body);
const protobufTracklist = protobufPlayerResponse.captions.playerCaptionsTracklistRenderer;
assert.equal(protobufTracklist.captionTracks.length, 3);
assert.equal(new URL(protobufTracklist.captionTracks[2].baseUrl).searchParams.get("tlang"), "zh-Hans");
assert.equal(protobufTracklist.audioTracks[0].defaultCaptionTrackIndex, 2);

const surgeModule = await readFile(new URL("../modules/DualSubs.YouTube.AutoSource.sgmodule", import.meta.url), "utf8");
const maaseaBaselineModule = await readFile(new URL("../modules/YouTube.Enhance.zh-Hans.baseline.sgmodule", import.meta.url), "utf8");
const vendoredEnhanceResponse = await readFile(new URL("../vendor/YouTube.Enhance/youtube.response.js", import.meta.url), "utf8");
const vendoredEnhanceRequest = await readFile(new URL("../vendor/YouTube.Enhance/youtube.request.js", import.meta.url), "utf8");
assert.match(surgeModule, /youtube\.response\.js.*captionLang[^\n]+zh-Hans/);
assert.doesNotMatch(surgeModule, /Player\.response\.proto[^\n]+dist\/response\.bundle\.js/);
assert.doesNotMatch(surgeModule, /DualSubs\.YouTube\.Player/);
assert.doesNotMatch(surgeModule, /boxjs/i);
assert.doesNotMatch(surgeModule, /\{\{\{/);
assert.doesNotMatch(maaseaBaselineModule, /boxjs|\{\{\{/i);
assert.doesNotMatch(surgeModule, /raw\.githubusercontent\.com\/Maasea/);
assert.doesNotMatch(maaseaBaselineModule, /raw\.githubusercontent\.com\/Maasea/);
assert.match(surgeModule, /yaney01\/YouTube\/codex\/fix-source-language-zh-hans\/vendor\/YouTube\.Enhance\/youtube\.response\.js/);
assert.match(surgeModule, /yaney01\/YouTube\/codex\/fix-source-language-zh-hans\/vendor\/YouTube\.Enhance\/youtube\.request\.js/);
assert.match(vendoredEnhanceResponse, /^\/\/ Build: 2026\/7\/19 16:16:39/);
assert.match(vendoredEnhanceRequest, /^\/\/ Build: 2026\/7\/12 22:44:32/);
const getEnhanceRules = module => module.split("\n").filter(line => line.startsWith("📺 "));
assert.deepEqual(getEnhanceRules(surgeModule), getEnhanceRules(maaseaBaselineModule));

console.log("Surge source-first automatic translation flow: ok");
