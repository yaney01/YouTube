import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PlayerResponse } from "../src/protobuf/player.response.js";

// Surge 的 WebView 引擎可能同时暴露 CommonJS module 与 $environment。
// 平台检测必须优先识别 Surge，否则 Storage 会误走 Node.js 的 require 路径。
globalThis.module = {};
globalThis.$environment = { "surge-version": "6.0" };
globalThis.$script = { startTime: Date.now() / 1000 };
globalThis.$argument = 'Type="Translate"&Types="Translate"&Languages="AUTO,ZH-HANS"&AutoCC="false"&Position="Forward"&Vendor="Google"&ShowOnly="false"&LogLevel="WARN"&Storage="Argument"';
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
assert.equal(manualTranslationUrl.searchParams.get("tlang"), null, "Translate mode must request the source subtitle from YouTube");
assert.equal(manualTranslationUrl.searchParams.get("subtype"), "Translate");

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
const vendoredCompositeResponse = await readFile(new URL("../vendor/DualSubs.Universal/Composite.Subtitles.response.bundle.js", import.meta.url), "utf8");
const vendoredTranslateResponse = await readFile(new URL("../vendor/DualSubs.Universal/Translate.response.bundle.js", import.meta.url), "utf8");
const postTranslateResponse = await readFile(new URL("../vendor/DualSubs.Universal/Translate.response.post.bundle.js", import.meta.url), "utf8");
assert.match(surgeModule, /youtube\.response\.js.*captionLang[^\n]+zh-Hans/);
assert.doesNotMatch(surgeModule, /Player\.response\.proto[^\n]+dist\/response\.bundle\.js/);
assert.doesNotMatch(surgeModule, /DualSubs\.YouTube\.Player/);
assert.doesNotMatch(surgeModule, /boxjs/i);
assert.doesNotMatch(surgeModule, /\{\{\{/);
assert.doesNotMatch(maaseaBaselineModule, /boxjs|\{\{\{/i);
assert.doesNotMatch(surgeModule, /raw\.githubusercontent\.com\/Maasea/);
assert.doesNotMatch(maaseaBaselineModule, /raw\.githubusercontent\.com\/Maasea/);
assert.match(surgeModule, /yaney01\/YouTube\/codex\/surge-youtube-bilingual-zh-hans\/vendor\/YouTube\.Enhance\/youtube\.response\.js/);
assert.match(surgeModule, /yaney01\/YouTube\/codex\/surge-youtube-bilingual-zh-hans\/vendor\/YouTube\.Enhance\/youtube\.request\.js/);
assert.match(vendoredEnhanceResponse, /^\/\/ Build: 2026\/7\/19 16:16:39/);
assert.doesNotMatch(vendoredEnhanceResponse, /&tlang=/);
assert.match(vendoredEnhanceRequest, /^\/\/ Build: 2026\/7\/12 22:44:32/);
assert.match(vendoredCompositeResponse, /console\.log\("Version: 1\.7\.5"\)/);
assert.match(vendoredTranslateResponse, /console\.log\("Version: 1\.7\.5"\)/);
assert.match(postTranslateResponse, /console\.log\("Version: 1\.7\.5-post\.1"\)/);
assert.match(postTranslateResponse, /s\.method="POST"/);
const scriptRules = surgeModule.split("\n").filter(line => line.includes("script-path="));
assert.ok(scriptRules.every(line => line.includes("script-path=https://raw.githubusercontent.com/yaney01/YouTube/codex/surge-youtube-bilingual-zh-hans/")));
const timedTextRequestRule = surgeModule.split("\n").find(line => line.startsWith("🍿️ DualSubs.YouTube.TimedText.request"));
assert.match(timedTextRequestRule ?? "", /Type="Translate"/);
const translateRule = surgeModule.split("\n").find(line => line.startsWith("🍿️ DualSubs.YouTube.Translate.TimedText.response"));
const translatePattern = translateRule?.match(/pattern=(.*?), requires-body=/)?.[1];
assert.ok(translatePattern, "Surge module must define the translate response pattern");
assert.match("https://www.youtube.com/api/timedtext?v=test&lang=ko&kind=asr&subtype=Translate", new RegExp(translatePattern));
assert.match(translateRule ?? "", /Translate\.response\.post\.bundle\.js\?v=1\.7\.5-post\.1/);
assert.match(translateRule ?? "", /Method="Part"&Times="3"&Interval="500"&Exponential="true"/);
assert.equal(surgeModule.split("\n").some(line => line.startsWith("🍿️ DualSubs.YouTube.Composite.TimedText.response")), false);
const getEnhanceRules = module => module.split("\n").filter(line => line.startsWith("📺 "));
assert.deepEqual(getEnhanceRules(surgeModule), getEnhanceRules(maaseaBaselineModule));

globalThis.$argument = 'Type="Translate"&Types="Translate"&Languages="AUTO,ZH-HANS"&Position="Forward"&Vendor="Google"&ShowOnly="false"&Times="0"&Interval="0"&LogLevel="WARN"&Storage="Argument"';
const longSourceLines = Array.from({ length: 125 }, (_, index) => `نص عربي طويل للاختبار رقم ${index}`);
globalThis.$request = {
	url: "https://www.youtube.com/api/timedtext?v=test&lang=ko&kind=asr&format=json3&subtype=Translate",
	method: "GET",
	headers: {},
};
globalThis.$response = {
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		events: longSourceLines.map((line, index) => ({ tStartMs: index * 1000, segs: [{ utf8: line }] })),
	}),
};
completedResponse = undefined;
const translatorRequests = [];
globalThis.$httpClient = {
	get: (request, callback) => {
		translatorRequests.push(request);
		callback(null, { status: 400, headers: { "Content-Type": "text/html" } }, "<html>URI too long</html>");
	},
	post: (request, callback) => {
		translatorRequests.push(request);
		const sourceLines = new URLSearchParams(request.body).get("q").split("\r");
		const translatedLines = sourceLines.map(line => `简体中文 ${line.match(/\d+$/)?.[0]}`);
		callback(null, { status: 200, headers: { "Content-Type": "application/json" } }, JSON.stringify([[[translatedLines.join("\r"), sourceLines.join("\r")]], null]));
	},
};
globalThis.$done = response => {
	completedResponse = response;
};
delete globalThis.module;
const originalRandom = Math.random;
Math.random = () => 0;

await import("../vendor/DualSubs.Universal/Translate.response.post.bundle.js?translate-route-regression");
await new Promise(resolve => setTimeout(resolve, 20));
Math.random = originalRandom;
globalThis.module = {};

assert.equal(translatorRequests.length, 2, "Google translation must keep the upstream 120-line batching limit");
assert.ok(translatorRequests.every(request => request.method === "POST"));
assert.ok(translatorRequests.every(request => !new URL(request.url).searchParams.has("q")));
assert.ok(translatorRequests.every(request => new URLSearchParams(request.body).get("q").split("\r").length <= 120));
assert.ok(translatorRequests.every(request => new URLSearchParams(request.body).get("tl") === "zh-CN"));
assert.ok(completedResponse, "Translate response script did not finish");
const translatedResponse = JSON.parse(completedResponse.body);
assert.equal(translatedResponse.events[0].segs[0].utf8, `${longSourceLines[0]}\n简体中文 0`);
assert.equal(translatedResponse.events[124].segs[0].utf8, `${longSourceLines[124]}\n简体中文 124`);

globalThis.$argument = JSON.stringify({ captionLang: "zh-Hans", blockUpload: false, blockImmersive: false, blockShorts: false, debug: false });
globalThis.$request = {
	url: "https://youtubei.googleapis.com/youtubei/v1/player",
	method: "POST",
	headers: { "Content-Type": "application/x-protobuf", "user-agent": "com.google.ios.youtube/21.29.3" },
};
globalThis.$response = {
	headers: { "Content-Type": "application/x-protobuf" },
	body: new Uint8Array([
		0x12,
		0x03,
		0xaa,
		0x01,
		0,
		...PlayerResponse.toBinary(
			PlayerResponse.create({
			captions: {
				playerCaptionsTracklistRenderer: {
					captionTracks: [
						{
							languageCode: "fr",
							vssId: "a.fr",
							kind: "asr",
							baseUrl: "https://www.youtube.com/api/timedtext?lang=fr&kind=asr",
							name: { runs: [{ text: "Français (générés automatiquement)" }] },
							isTranslatable: true,
						},
					],
					audioTracks: [{ captionTrackIndices: [0], defaultCaptionTrackIndex: 0 }],
					translationLanguages: [{ languageCode: "zh-Hant", languageName: { runs: [{ text: "中文（繁體）" }] } }],
				},
			},
			}),
		),
	]),
};
completedResponse = undefined;

await import("../vendor/YouTube.Enhance/youtube.response.js?ui-only-caption-regression");
await new Promise(resolve => setTimeout(resolve, 20));

assert.ok(completedResponse, "Vendored YouTube Enhance response script did not finish");
const enhancePlayerResponse = PlayerResponse.fromBinary(completedResponse.body);
const enhanceTracklist = enhancePlayerResponse.captions.playerCaptionsTracklistRenderer;
assert.equal(enhanceTracklist.captionTracks.length, 1, "UI-only mode must not append a direct tlang caption track");
assert.equal(new URL(enhanceTracklist.captionTracks[0].baseUrl).searchParams.get("tlang"), null);
assert.equal(enhanceTracklist.captionTracks[0].isTranslatable, true);
assert.equal(enhanceTracklist.audioTracks[0].defaultCaptionTrackIndex, 0, "UI-only mode must keep the source track selected");
assert.ok(enhanceTracklist.translationLanguages.some(language => language.languageCode === "zh-Hans"), "Auto-translate menu must include Simplified Chinese");
assert.ok(enhanceTracklist.translationLanguages.some(language => language.languageCode === "zh-Hant"), "Existing auto-translate languages must be preserved");
assert.equal(enhanceTracklist.translationLanguages.filter(language => language.languageCode === "zh-Hans").length, 1);

console.log("Surge source-first automatic translation flow: ok");
