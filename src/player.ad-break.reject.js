// YouTube 21.29+ 通过独立的 player/ad_break 接口加载播放页广告。
// 空 protobuf 是合法响应，同时不会影响正常的 /player 播放与字幕响应。
$done({
	response: {
		status: 200,
		headers: { "Content-Type": "application/x-protobuf" },
		body: new Uint8Array(),
	},
});
