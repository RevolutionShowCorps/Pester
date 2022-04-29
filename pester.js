const OSM = require('./lib/OSM')(require('./config'));

const today = '2022-04-28'; //TODO get curr date


async function main(){
	const res = await OSM.doRequest('oauth/token');
	console.log(res);
}

main();