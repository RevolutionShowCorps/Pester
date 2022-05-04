const config = require('./config');
const OSM = require('./lib/OSM')(config, 'section:attendance:read+section:member:read+section:programme:read+section:attendance:write'); //TODO do something fancy with scopes

async function main(){
	await OSM.getSections();

	const today = new Date(Date.now());
	let tomorrow = new Date(today.getTime());
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow = tomorrow.toISOString().split('T')[0];
	
	const meetings = await OSM.getMeetings(today);
	const rehearsals = meetings.filter(m => m.meetingdate == tomorrow);
	
	if(rehearsals.length === 0){
		return;
	}

	const rehearsal = meetings[0];
	const isJuniorRehearsal = rehearsal.title.toLowerCase() == 'juniors';

	console.log(`${rehearsal.title} is${isJuniorRehearsal ? "" : " NOT"} a junior rehearsal`);

	const members = await OSM.getMemberSummary(); //needed to check attendance dates

	for(let i = 0; i < members.length; i++){
		const member = members[i];
		const detail = await OSM.getMemberDetails(member.scoutid);
		
		const isJunior = (detail.customisable_data.cf_is_junior_.trim().toLowerCase() != 'no' || member.patrol.toLowerCase().indexOf('junior') > -1);
		if(isJunior === isJuniorRehearsal){
			continue;
		}

		console.log(`Found ${member.firstname} ${member.lastname}, who is${isJunior ? "" : " NOT"} at juniors`);
		console.log();
		await OSM.setAttendance(tomorrow, member.scoutid, false);
	}

	
}

main();