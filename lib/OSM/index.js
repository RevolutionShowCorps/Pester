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

	//quick wrapper to add token
	async #doAuthenticatedRequest(endpoint, params = {}, type = 'GET', headers = {}) {
		const token = await this.#getToken();
		headers.Authorization = `Bearer ${token}`;
		return await this.#doRequest(endpoint, params, type, headers);
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

	//can we make a request against a section/term, or do we still need initialising?
	initialised() {
		return (this.#sectionID != null && this.#termID != null);
	}

	async setTerm(termID, sectionID = null) {
		//usually we will want to set a term for a section...
		this.#termID = termID;
		this.#sectionID = sectionID ?? this.#sectionID;
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

	async getSections() {
		const response = await this.#doAuthenticatedRequest('oauth/resource');

		if (response.data.sections.length === 1) {
			const sec = response.data.sections[0];
			this.setTermFromSection(sec, Date.now());
		}

		return response.data.sections;
	}

	async getMemberSummary() {
		if (!this.initialised()) {
			throw "No section or term ID set - call setTerm first!";
		}

		const response = await this.#doAuthenticatedRequest("ext/members/attendance", {
			action: 'get',
			sectionid: this.#sectionID,
			termid: this.#termID
		});

		//let's format this a little nicer, shall we?
		//instead of {
		// items: <list of members with some meetings>
		// meetings: <list of total meetings>
		//}
		//this formats to a member with a list of attendance for every meeting

		const members = [];
		const dates = Object.keys(response.meetings);

		response.items.forEach(m => {
			if (m.scoutid < 0) {
				return;
			}


			const member = {};

			//1. build up member data
			Object.keys(m).forEach(prop => {
				if (!dates.includes(prop)) {
					member[prop] = m[prop];
				}
			});

			//2. build up attendance data
			member.attendance = [];
			dates.forEach(d => {
				if (m.hasOwnProperty(d)) {
					member.attendance[d] = (m[d] == "Yes");
				} else {
					member.attendance[d] = false;
				}
			});

			members.push(member);
		});

		return members;
	}
}

module.exports = (config, scopes) => {
	return new OSM(config, scopes);
}