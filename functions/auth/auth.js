const simpleOauth = require("simple-oauth2");

const backendSimpleConfig = {
	client: {
		id: process.env.CLIENT_ID,
		secret: process.env.CLIENT_SECRET,
	},
	auth: {
		tokenHost: 'https://github.com',
		tokenPath: '/login/oauth/access_token',
		authorizePath: '/login/ouath/authorized',
	},
};

if (!backendSimpleConfig.client.secret) {
	throw new Error("MISSING REQUIRED ENV VARS. Please set CLIENT_SECRET");
}

const oauth2 = simpleOauth.create(backendSimpleConfig);

/* Function to handle intercom auth callback */
module.exports = {
	handler(event, context, callback) {
		const code = event.queryStringParameters.code;
		/* state helps mitigate CSRF attacks & Restore the previous state of your app */
		const state = event.queryStringParameters.state;

		if (!code) {
			callback(null, {
				statusCode: 200,
				body: `<html>
						<body>
							Logging in with GitHub, hang in there!
							<script>
								window.location.href = 'https://github.com/login/oauth/authorize?client_id=${backendSimpleConfig.client.id}&redirect_url='+window.location.href+'&scope=read:org,repo'
							</script>
						</body>
					</html>`,
			})
			return;
		}

		console.log('got code!', code);

		/* Take the grant code and exchange for an accessToken */
		oauth2.authorizationCode
			.getToken({
				code,
				redirect_uri: 'http://localhost:8888/.netlify/functions/auth',
				client_id: backendSimpleConfig.client.id,
				client_secret: backendSimpleConfig.client.secret,
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
