const config = require('./config');
const OSM = require('./lib/OSM')(config, 'section:attendance:read+section:member:read+section:programme:read'); //TODO do something fancy with scopes

const today = '2022-05-05';

async function main(){
	await OSM.getSections();

	const members = await OSM.getMemberSummary();
	const patrols = {};

	members.forEach(m => {
		if(patrols.hasOwnProperty(m.patrol)){
			patrols[m.patrol].push(m);
		} else {
			patrols[m.patrol] = [m];
		}
	});

	let attendanceReport = '';
	let count = 0, missing = 0;

	Object.keys(patrols).forEach(name => {
		attendanceReport += `<h2>${name}</h2>`

		patrols[name].forEach(m => {
			count++;
			attendanceReport += `<p>${m.firstname} ${m.lastname}`

			if(m.attendance[today] === false){
				missing++;
				attendanceReport += " - <b>Not Attending</b>";
			}

			attendanceReport += "</p>";
		})
	});

	attendanceReport = `<p>Here is the attendance report for the rehearsal on ${today}. There are ${missing} absent from a total of ${count}.</p>${attendanceReport}`

	console.log(attendanceReport);
}

main();