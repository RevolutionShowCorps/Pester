const fetch = require('node-fetch');
const {URLSearchParams} = require('url');

class OSM {
	//API-kinda stuff
	#credentials;
	#scopes;
	#baseUrl = 'https://www.onlinescoutmanager.co.uk/';
	#token = null;

	//cached props
	#sectionID = null;
	#termID = null;

	log = false;

	constructor(credentials, scopes) {
		this.#credentials = credentials;
		this.#scopes = scopes;
	}

	async #doRequest(endpoint, params = {}, type = 'GET', headers = {}) {
		const fetchOptions = {
			method: type,
			headers: headers
		};

		if (type.toUpperCase() == 'POST') {
			let formData = ""
			Object.keys(params).forEach(k => {
				let data = Array.isArray(params[k]) ? JSON.stringify(params[k]) : params[k];
				formData += `${k}=${encodeURIComponent(data)}&`
			});
			formData = formData.substring(0, formData.length - 1);

			fetchOptions.body = formData;

			headers["Content-Type"] = "application/x-www-form-urlencoded";
			//fetchOptions.body = JSON.stringify(params);
		} else {
			const paramStr = Object.keys(params).map((k) => {
				return `${k}=${params[k]}`
			}).join("&");

			if (paramStr.trim() !== "") {
				endpoint += "?" + paramStr;
			}
		}

		const url = this.#baseUrl + endpoint;
		if(this.log){
			console.log(`Making request to ${url}...`);
			console.log();
			if(type.toUpperCase() == 'POST'){
				console.log("Sending request body:");
				console.log(fetchOptions.body);
				console.log();
			}
		}

		const result = await fetch(url, fetchOptions);
		let json;

		if(this.log){
			const text = await result.text();
			console.log(text);
			console.log();

			json = JSON.parse(text);
		} else {
			json = await result.json();
		}
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
					member.attendance[d] = null;
				}
			});

			members.push(member);
		});

		return members;
	}

	async getMeetings(afterDate = null) {
		if (!this.initialised()) {
			throw "No section or term ID set - call setTerm first!";
		}

		const response = await this.#doAuthenticatedRequest("ext/programme/", {
			action: 'getProgrammeSummary',
			sectionid: this.#sectionID,
			termid: this.#termID
		});

		let meetings = response.items;
		if(afterDate != null){
			meetings = meetings.filter(m => {
				const mDate = new Date(m.meetingdate + " " + m.starttime);
				return mDate >= afterDate;
			});
		}

		return meetings;
	}

	async getMemberDetails(scoutID){
		if (!this.initialised()) {
			throw "No section or term ID set - call setTerm first!";
		}

		const response = await this.#doAuthenticatedRequest("ext/customdata/",{
			action: 'getData',
			section_id: this.#sectionID,
			associated_id: scoutID,
			associated_type: 'member',
			associated_is_section: 'null',
			varname_filter: 'null',
			context: 'members',
			group_order: 'section'
		});

		//format member details a little nicer
		const member = {};
		response.data.forEach(d => {
			const data = {};
			d.columns.forEach(c => {
				data[c.varname] = c.value;
			});

			const id = (d.identifier.trim() === '' ? d.group_id : d.identifier);
			member[id] = data;
		});

		return member;
	}

	async setAttendance(date, scoutid, present){
		if (!this.initialised()) {
			throw "No section or term ID set - call setTerm first!";
		}

		const response = await this.#doAuthenticatedRequest(`ext/members/attendance/?action=update&sectionid=${this.#sectionID}&termid=${this.#termID}`, {
			scouts: [scoutid],
			selectedDate: date,
			present: present === null ? "Absent" : (present ? "Yes" : "No"),
			section: "explorers",
			sectionid: this.#sectionID,
			completedBadges: [],
			customData: []
		}, "POST");

		return response;
	}
}

module.exports = (config, scopes) => {
	return new OSM(config, scopes);
}