const config = require('./config');
const OSM = require('./lib/OSM')(config, 'section:attendance:read+section:member:read+section:programme:read'); //TODO do something fancy with scopes

const today = '2022-05-05';

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

			const mSub = ((name == 'Leaders' || m.patrolleader > 0) ? 0 : member.customisable_data.cf_is_senior_.trim().toLowerCase() == 'no' ? 3 : 1);

			count++;
			list += `<p>${m.firstname} ${m.lastname}`
			console.log(`${m.firstname} ${m.lastname} should pay subs of £${mSub}`);

			if(m.patrolleader > 0){
				list += " (instructor)";
			} else if(name != 'Leaders'){
				list += ` £${mSub}`;
				sectionSubs += mSub;
			}

			if(m.attendance[today] === false){
				missing++;
				list += " - <b>Not Attending</b>";

				if(name != 'Leaders' || m.patrolleader <= 0){
					sectionSubs -= mSub;
				}
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

	attendanceReport = `<p>Here is the attendance report for the rehearsal on ${today}. There are ${missing} absent from a total of ${count}.</p>${attendanceReport}<br /><p>Total subs due: <b>£${subsDue}</b></p>`

	console.log("Sending report...");
	console.log(attendanceReport);

	console.log("Report sent!");

}

main();