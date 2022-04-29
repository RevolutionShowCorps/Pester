class OSM {
	#credentials;
	#scopes;
	#baseUrl = 'https://www.onlinescoutmanager.co.uk/';
	#token = null;

	constructor(credentials, scopes){
		this.#credentials = credentials;
		this.#scopes = scopes;
	}

	async #doRequest(endpoint, params = {}, type = 'GET', headers = {}){
		const fetchOptions = {
			method: type,
			headers: headers
		};

		if(type.toLowerCase() == 'POST'){
			fetchOptions.body = JSON.stringify(params);
		} else {
			const paramStr = Object.keys(params).map((k) => {
				return `${k}=${params[k]}`
			}).join("&");

			if(paramStr.trim() !== ""){
				endpoint += "?" + paramStr;
			}
		}

		const result = await fetch(this.#baseUrl + endpoint, fetchOptions);
		const json = await result.json();
		return json;		
	}

	async #getToken(){
		if(this.#token !== null){
			return this.#token;
		}

		const result = await this.#doRequest(`oauth/token`, {
			grant_type: "client_credentials",
			client_id: this.#credentials.client_id,
			client_secret: this.#credentials.client_secret,
			scope: this.#scopes
		});

		if(result.hasOwnProperty("access_token")){
			this.#token = result['access_token'];
			return this.#token;
		}

		console.log("Error getting API token");
		console.log(result);
		throw 'Invalid credentials'
	}

	async getResource(resource){
		const token = await this.#getToken();
		const response = await this.#doRequest(resource, {}, 'GET', {
			Authorization: `Bearer ${token}`
		});

		return response;		
	}
}

module.exports = (config, scopes) => {
	return new OSM(config, scopes);
}