const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const fs = require('fs');

function loadRoutes() {
	const routes = [];

	const routeFiles = fs.readdirSync(path.join(__dirname, 'routes'))
		.filter(file => file.endsWith('.js'));

	for (const file of routeFiles) {
		const route = require(path.join(__dirname, 'routes', file));
		routes.push([route.root, route.router]);
	}

	return routes;
}

async function main() {
	const app = express();
	app.use(express.json());
	app.use(express.urlencoded({
		extended: true
	}));
	
	app.engine(
		'hbs',
		engine({
			extname: '.hbs'
		})
	);
	app.set('view engine', 'hbs');
	app.set('views', path.join(__dirname, 'views'));

	for (const route of loadRoutes()) {
		app.use(route[0], route[1]);
	}

	app.use((req, res) => {
		res.status(404).render('error', {
			title: 'Error',
			code: 404,
			msg: 'Page Not Found'
		});
	});

	app.listen(60002, () => {
		console.log(`Server listening on :60002`);
	});
}

main();