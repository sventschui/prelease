const simpleOauth = require("simple-oauth2");

const config = {
	client: {
		id: process.env.CLIENT_ID,
		secret: process.env.CLIENT_SECRET,
	},
	auth: {
		tokenHost: 'https://github.com',
		tokenPath: '/login/oauth/access_token',
		authorizePath: '/login/ouath/authorized',
	},
	redirect_uri: process.env.REDIRECT_URI || 'http://localhost:8888/.netlify/functions/auth',
};

if (!config.client.secret) {
	throw new Error("MISSING REQUIRED ENV VARS. Please set CLIENT_SECRET");
}

const oauth2 = simpleOauth.create(config);

/* Function to handle intercom auth callback */
module.exports = {
	handler(event, context, callback) {
		const code = event.queryStringParameters.code;

		if (!code) {
			callback(null, {
				statusCode: 200,
				body: `<html>
						<body>
							Logging in with GitHub, hang in there!
							<script>
								window.location.href = 'https://github.com/login/oauth/authorize?client_id=${config.client.id}&redirect_url=${encodeURIComponent(config.redirect_uri)}&scope=read:org,repo'
							</script>
						</body>
					</html>`,
			})
			return;
		}

		/* Take the grant code and exchange for an accessToken */
		oauth2.authorizationCode
			.getToken({
				code,
				redirect_uri: config.redirect_uri,
				client_id: config.client.id,
				client_secret: config.client.secret,
			})
			.then((result) => {
				const accessToken = oauth2.accessToken.create(result);
				if (!accessToken.token.access_token) {
					console.error('Failed to retrieve AT from GitHub', accessToken);
					return callback(null, { statusCode: 500, body: 'An error occured!' });
				}
				return callback(null, {
					statusCode: 200,
					body: `<html>
							<body>
								Getting you back to prelease, hang in there!
								<script>
									window.opener.handleToken("${accessToken.token.access_token}");
									window.close();
								</script>
							</body>
						</html>`,
				});
			})
			.catch((error) => {
				console.log("Access Token Error", error);
				return callback(null, {
					statusCode: error.statusCode || 500,
					body: JSON.stringify({
						error: error.message,
					}),
				});
			});
	},
};
