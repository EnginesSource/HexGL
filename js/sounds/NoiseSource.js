var WAUtils = WAUtils || {}

WAUtils.createNoiseSource = function (ctx) {
	var buffer = function (l) {
		var buffer = ctx.createBuffer(1, l, 44100)
		var buf = buffer.getChannelData(0)

		for (var i=0; i<l; i++) {
			buf[i] = Math.random() * 2 - 1
		}

		return buffer
	}(80000)

	var bsn = ctx.createBufferSource()
	bsn.buffer = buffer
	bsn.loop = true

	return bsn
}
