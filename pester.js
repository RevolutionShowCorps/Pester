const config = require('./config');
const OSM = require('./lib/OSM')(config, 'section:attendance:read+section:member:read'); //TODO do something fancy with scopes

const today = '2022-04-28'; //TODO get curr date

async function main(){
	const res = await OSM.getSections();
	console.log(res);
}

main();