// 强制 YouTube 从加密的 Onesie initplayback 回退到可改写的 /player 响应。
// 覆盖所有 initplayback 变体，避免无 ack 请求绕过字幕与广告响应处理。
$done({
	response: {
		status: 200,
		headers: { "Content-Type": "text/plain" },
		body: new Uint8Array(),
	},
});
