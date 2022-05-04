const schedule = require('node-schedule');

const config = require('./config');
const OSM = require('./lib/OSM')(config, 'section:attendance:read+section:member:read+section:programme:read'); //TODO do something fancy with scopes

const twilioConfig = require('./twilio');
const twilio = require('twilio')(twilioConfig.sid, twilioConfig.token);

const today = new Date(Date.now());

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

		if(meetingDate.getTime() == dateOnly.getTime() && m.title.toLowerCase() == 'juniors'){
			await scheduleRegisterCheck(m.meetingdate, m.starttime);
		}
	})
}

//step 2
//schedule tasks (steps 3)
async function scheduleRegisterCheck(date, startTime){
	let scheduleDate = new Date(`${date} ${startTime}`); //temp
	scheduleDate.setHours(scheduleDate.getHours(), scheduleDate.getMinutes() + 15);

	console.log(`Scheduling contact for ${scheduleDate}`);

	const job = schedule.scheduleJob(scheduleDate, async () => {
		console.log("Sending scheduled messages");
		await contactMissingParents(date);
	});
}

//step 3
//the scheduled task
async function contactMissingParents(date){
	let members = await OSM.getMemberSummary();
	console.log(members);
	members = members.filter(m => m.attendance[date] === null && m.active && m.patrolleader <= 0);
	console.log(members);

	members.forEach(async m => {
		const details = await OSM.getMemberDetails(m.scoutid);
		//make sure they're actually a junior
		if(details.customisable_data.cf_is_junior_.trim().toLowerCase() != 'yes'){
			return;
		}

		const contact = details.emergency;
		
		const message = `Hi ${contact.firstname}, is ${m.firstname} coming to Revo Juniors tonight? Cheers, Luke`;
		console.log(`Message: ${message}`);
		console.log(`Sending to ${contact.phone1}`);
		await twilio.messages.create({
			body: message,
			from: twilioConfig.number,
			to: twilioConfig.testRecipient //contact.phone1
		});
	});
}

main();