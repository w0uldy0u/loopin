function saveAccessTokenEnv(res) {
	const b = res.body;
	if (!b || !b.accessToken) {
		throw new Error("Missing accessToken in response");
	}
	bru.setEnvVar("accessToken", String(b.accessToken));
	if (b.refreshToken) {
		bru.setEnvVar("refreshToken", String(b.refreshToken));
	}
}

module.exports = { saveAccessTokenEnv };
