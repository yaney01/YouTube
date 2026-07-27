// 强制 YouTube 从加密的 Onesie initplayback 回退到可改写的 /player 响应。
// YouTube.Enhance 在 Onesie 密钥不匹配时也使用相同的空响应回退。
$done({
	response: {
		status: 200,
		headers: { "Content-Type": "text/plain" },
		body: new Uint8Array(),
	},
});
