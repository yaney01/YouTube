import assert from "node:assert/strict";

// Surge 的 WebView 引擎可能同时暴露 CommonJS module 与 $environment。
// 平台检测必须优先识别 Surge，否则 Storage 会误走 Node.js 的 require 路径。
globalThis.module = {};
globalThis.$environment = { "surge-version": "6.0" };
globalThis.$script = { startTime: Date.now() / 1000 };
globalThis.$argument = 'Type="Official"&Types="Translate"&AutoCC="true"&Position="Forward"&Vendor="Google"&ShowOnly="false"&LogLevel="WARN"&Storage="Argument"';
globalThis.$request = {
	url: "https://www.youtube.com/api/timedtext?v=test&lang=ko&kind=asr",
	method: "GET",
	headers: {},
};
globalThis.$persistentStore = {
	read: key => (key === "DualSubs" ? JSON.stringify({ YouTube: { Settings: { AutoCC: false } } }) : null),
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
assert.equal(rewrittenUrl.searchParams.get("tlang"), "zh-Hans");
assert.equal(rewrittenUrl.searchParams.get("subtype"), "Official");

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
assert.equal(playerResponse.captions.playerCaptionsTracklistRenderer.audioTracks[0].defaultCaptionTrackIndex, 1);

console.log("Surge request and response rewrite: ok");
