const OSM = require('./lib/OSM')(require('./config'), 'section:attendance:read+section:member:read');

const today = '2022-04-28'; //TODO get curr date


async function main(){
	const res = await OSM.getResource('oauth/resource');
	console.log(res);
}

main();