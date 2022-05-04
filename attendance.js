const config = require('./config');
const OSM = require('./lib/OSM')(config, 'section:attendance:read+section:member:read+section:programme:read'); //TODO do something fancy with scopes

let tomorrow = new Date(Date.now());
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow = tomorrow.toISOString().split('T')[0];

const withSubs = false;

async function main(){
	await OSM.getSections();

	const members = await OSM.getMemberSummary();
	const patrols = {};

	members.forEach(m => {
		if(patrols.hasOwnProperty(m.patrol)){
			//if patrol leader, add to start, otherwise add to end
			if(m.patrolleader > 0){
				patrols[m.patrol].unshift(m);
			} else {
				patrols[m.patrol].push(m);
			}
		} else {
			patrols[m.patrol] = [m];
		}
	});

	let attendanceReport = '';
	let count = 0, missing = 0, subsDue = 0;

	let patrolNames = Object.keys(patrols);
	for(let i = 0; i < patrolNames.length; i++){
		const name = patrolNames[i].trim();
		const isJuniorPatrol = name.toLowerCase().indexOf("junior") > -1;
		let list = '';
		let sectionSubs = 0;

		for(let j = 0; j < patrols[name].length; j++){
			const m = patrols[name][j];
			const member = await OSM.getMemberDetails(m.scoutid);
			if(member.customisable_data.cf_is_junior_.trim().toLowerCase() == 'no' && !isJuniorPatrol){
				continue;
			}

			const mSub = withSubs ? ((name == 'Leaders' || m.patrolleader > 0) ? 0 : member.customisable_data.cf_is_senior_.trim().toLowerCase() == 'no' ? 3 : 1) : 0;

			count++;
			list += `<p>${m.firstname} ${m.lastname}`
			console.log(`${m.firstname} ${m.lastname} should pay subs of £${mSub}`);

			if(m.patrolleader > 0){
				list += " (instructor)";
			} else if(mSub > 0){
				list += ` £${mSub}`;
				sectionSubs += mSub;
			}

			if(m.attendance[tomorrow] === false){
				missing++;
				list += " - <b>Not Attending</b>";

				if(name != 'Leaders' || m.patrolleader <= 0){
					sectionSubs -= mSub;
				}
			} else {
				console.log(m.attendance[tomorrow]);
			}

			list += "</p>";
		}

		if(name == 'Leaders'){
			sectionSubs = 0;
		}

		if(list != ''){
			attendanceReport += `<h2>${name}${sectionSubs > 0 ? " - £" + sectionSubs : ""}</h2>${list}`;
		}

		subsDue += sectionSubs;
	}

	attendanceReport = `<p>Here is the attendance report for the rehearsal on ${tomorrow}. There are ${missing} absent from a total of ${count}.</p>${attendanceReport}`;

	if(subsDue > 0){
		attendanceReport += `<br /><p>Total subs due: <b>£${subsDue}</b></p>`;
	}

	console.log("Sending report...");
	console.log(attendanceReport);

	console.log("Report sent!");

}

main();