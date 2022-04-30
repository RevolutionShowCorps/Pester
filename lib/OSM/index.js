const fetch = require('node-fetch');

class OSM {
	//API-kinda stuff
	#credentials;
	#scopes;
	#baseUrl = 'https://www.onlinescoutmanager.co.uk/';
	#token = null;

	//cached props
	#sectionID = null;
	#termID = null;

	constructor(credentials, scopes) {
		this.#credentials = credentials;
		this.#scopes = scopes;
	}

	async #doRequest(endpoint, params = {}, type = 'GET', headers = {}) {
		const fetchOptions = {
			method: type,
			headers: headers
		};

		if (type.toLowerCase() == 'POST') {
			fetchOptions.body = JSON.stringify(params);
		} else {
			const paramStr = Object.keys(params).map((k) => {
				return `${k}=${params[k]}`
			}).join("&");

			if (paramStr.trim() !== "") {
				endpoint += "?" + paramStr;
			}
		}

		const result = await fetch(this.#baseUrl + endpoint, fetchOptions);
		const json = await result.json();
		return json;
	}

	async #getToken() {
		if (this.#token !== null) {
			return this.#token;
		}

		const result = await this.#doRequest(`oauth/token`, {
			grant_type: "client_credentials",
			client_id: this.#credentials.client_id,
			client_secret: this.#credentials.client_secret,
			scope: this.#scopes
		});

		if (result.hasOwnProperty("access_token")) {
			this.#token = result['access_token'];
			return this.#token;
		}

		console.log("Error getting API token");
		console.log(result);
		throw 'Invalid credentials'
	}

	async setTerm(termID, sectionID = null) {
		//usually we will want to set a term for a section...
		this.#termID = termID;
		this.#sectionID = sectionID ?? this.#sectionID;
	}

	async getSections() {
		const token = await this.#getToken();
		const response = await this.#doRequest('oauth/resource', {}, 'GET', {
			Authorization: `Bearer ${token}`
		});

		if (response.data.sections.length === 1) {
			const sec = response.data.sections[0];
			this.setTermFromSection(sec, Date.now());
		}

		return response.data.sections;
	}

	setTermFromSection(section, termDate) {
		const term = section.terms.filter(t => {
			const start = new Date(t.startdate);
			const end = new Date(t.enddate);

			return (start <= termDate && end >= termDate);
		});

		if (term.length === 0) {
			console.warn("No terms found for the date provided - no term set");
			return false;
		}

		if (term.length > 1) {
			console.warn("Multiple terms found for the date provided - please ensure the selected term is correct");
		}

		this.setTerm(term[0].term_id, section.section_id);

		return true;
	}

	//can we make a request against a section/term, or do we still need initialising?
	initialised() {
		return (this.#sectionID != null && this.#termID != null);
	}
}

module.exports = (config, scopes) => {
	return new OSM(config, scopes);
}