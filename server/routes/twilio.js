const express = require('express');
const twilioConfig = require('../../twilio');
const twilio = require('twilio')(twilioConfig.sid, twilioConfig.token);

const router = express.Router();

router.post('/sms', async (req, res, next) => {
	if(req.body.Body == null){
		console.log("No body");
		return next();
	}

	//very basic - forward message on!
	await twilio.messages.create({
		body: `Juniors message from ${req.body.From}: ${req.body.Body}`,
		from: twilioConfig.number,
		to: twilioConfig.testRecipient //contact.phone1
	});

	res.send("<Response />");

	
});

module.exports = {
	root: '/twilio/',
	router: router
};