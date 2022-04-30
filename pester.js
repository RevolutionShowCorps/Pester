const config = require('./config');
const OSM = require('./lib/OSM')(config, 'section:attendance:read+section:member:read+section:programme:read'); //TODO do something fancy with scopes

const section_name = 'Queensbury Scout Band';

const today = new Date('2022-04-28'); //TODO get curr date

async function main(){
	//initialises section and term for us!
	await OSM.getSections();
	await checkForMeeting();
}

//step 1
//can run at some point early morning
//finds if there's a meeting today, and when it is
//schedules the attendance check
async function checkForMeeting(){
	const meetings = await OSM.getMeetings(today);

	const dateOnly = new Date(today.getTime());
	dateOnly.setHours(0, 0, 0, 0);
	
	meetings.forEach(async m => {
		const meetingDate = new Date(m.meetingdate);
		meetingDate.setHours(0, 0, 0, 0);

		if(meetingDate.getTime() == dateOnly.getTime()){
			console.log(`Found meeting for ${m.meetingdate}, starting at ${m.starttime}`);
			await scheduleRegisterCheck(meetingDate, m.starttime, m.endTime);
		}
	})
}

//step 2
//schedule tasks (steps 3 and 4)
async function scheduleRegisterCheck(date, startTime, endTime){
	await contactMissingParents(date);

	await updateRegisters(date);
}

//step 3
//the scheduled task
async function contactMissingParents(date){

}

//step 4
//tidyup
//mark questionables as not attended
async function updateRegisters(date){

} 

main();