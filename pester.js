const config = require('./config');
const OSM = require('./lib/OSM')(config, 'section:attendance:read+section:member:read'); //TODO do something fancy with scopes

const section_name = 'Queensbury Scout Band';

const today = '2022-04-28'; //TODO get curr date

async function main(){
	const sections = await OSM.getSections();

	if(!OSM.initialised()){
		const section = sections.filter(s => s.section_name.toLowerCase().trim() === section_name.toLowerCase().trim())[0];
		OSM.setTermFromSection(section, Date.now());
	}

}

main();