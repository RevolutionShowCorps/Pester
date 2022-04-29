class OSM {
	#credentials;
	#baseUrl = 'https://www.onlinescoutmanager.co.uk/';
	#token = null;

	constructor(credentials){
		this.#credentials = credentials;
	}

	async doRequest(endpoint){
		const result = await fetch(this.#baseUrl + endpoint);
		const json = await result.json();
		return json;		
	}
}

module.exports = (config) => {
	return new OSM(config);
}