const config = require('./config');
const OSM = require('./lib/OSM')(config, 'section:attendance:read+section:member:read+section:programme:read+section:attendance:write'); //TODO do something fancy with scopes

async function main(){
	await OSM.getSections();

	const meetings = await OSM.getMeetings(Date.now());
	const members = await OSM.getMemberSummary(); //needed to check attendance dates

	for(let i = 0; i < members.length; i++){
		const member = members[i];
		const detail = await OSM.getMemberDetails(member.scoutid);
		
		const isJunior = (detail.customisable_data.cf_is_junior_.trim().toLowerCase() != 'no' || member.patrol.toLowerCase().indexOf('junior') > -1);
		if(isJunior){
			continue;
		}

		console.log(`Found ${member.firstname} ${member.lastname}, who is${isJunior ? "" : " NOT"} at juniors`);
		console.log();
		await OSM.setAttendance("2022-05-12", member.scoutid, false);
	}

	
}

main();