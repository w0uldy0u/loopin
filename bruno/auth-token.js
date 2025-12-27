function saveAccessTokenEnv(res) {
	const b = res.body;
	if (!b || !b.accessToken) {
		throw new Error("Missing accessToken in response");
	}
	bru.setEnvVar("accessToken", String(b.accessToken));
}

module.exports = { saveAccessTokenEnv };
