#!/usr/bin/env node

"use strict";

var util = require("util");
var path = require("path");
// Handles all the http request and response operations
var http = require("http");

var sqlite3 = require("sqlite3");
// wrapper around NodeStatic package, which handles mimetypes, content type
// static server used for serving javascript and css
var staticAlias = require("node-static-alias");


// ************************************

const DB_PATH = path.join(__dirname, "my.db");
const WEB_PATH = path.join(__dirname, "web");
const HTTP_PORT = 8039;

var delay = util.promisify(setTimeout);

// define some SQLite3 database helpers
//   (comment out if sqlite3 not working for you)
var myDB = new sqlite3.Database(DB_PATH);
var SQL3 = {
	run(...args) {
		return new Promise(function c(resolve, reject) {
			myDB.run(...args, function onResult(err) {
				if (err) reject(err);
				else resolve(this);
			});
		});
	},
	get: util.promisify(myDB.get.bind(myDB)),
	all: util.promisify(myDB.all.bind(myDB)),
	exec: util.promisify(myDB.exec.bind(myDB)),
};
// to handle static file requests
var fileServer = new staticAlias.Server(WEB_PATH, {
	cache: 100,
	serverInfo: "Node Exercise",
	alias: [
		{
			// regex to serve index.html if route has /index or nothing
			match: /^\/(?:index\/?)?(?:[?#].*$)?$/,
			serve: "index.html",
			// if cant find index.html serve 404
			force: true,
		},
		{	// if route has js file then serve js files as it is
			match: /^\/js\/.+$/,
			serve: "<% absPath %>",
			// if cant find js file serve 404
			force: true,
		},
		{
			// serve html file with same name as route
			match: /^\/(?:[\w\d]+)(?:[\/?#].*$)?$/,
			serve: function onMatch(params) {
				return `${params.basename}.html`;
			},
		},
		// for 404 html
		{
			match: /[^]/,
			serve: "404.html",
		},
	],
});
// handleRequest method receives res and req streams to operate on http operations  
var httpServe = http.createServer(handleRequest);

main();


// ************************************

function main() {
	httpServe.listen(HTTP_PORT)
	console.log(`Listening on http://localhost:${HTTP_PORT}...`);
}
/**
 * Handles all http requests 
 * @param {request stream received from client} req 
 * @param {response stream for sending info to client} res 
 */
async function handleRequest(req, res) {
	if (req.url == "/get-records") {
		let records = await getAllRecords();
		res.writeHead(200, {
			'Content-Type': 'application/json',
			// API response should not be cached
			'Cache-Control': 'no-cache'
		})
		res.end(JSON.stringify(records))
	} else {
		// delegating static file requests from webserver to file server
		fileServer.serve(req, res);
	}
	// if (req.url == "/hello") {
	// 	// setting response header
	// 	res.writeHead(200, { "Content-type": "text/plain" });
	// 	res.end("Hello World")
	// }
	// else {
	// 	res.writeHead(404, { "Content-type": "text/plain" });
	// 	res.end("Page not found")
	// }
}
// *************************
// NOTE: if sqlite3 is not working for you,
//   comment this version out
// *************************
async function getAllRecords() {
	var result = await SQL3.all(
		`
		SELECT 
			UserData.data as UserData,
			Content.data as Content
		FROM
			UserData JOIN Content
			ON (UserData.id = Content.userDataID)
		ORDER BY 
			UserData.id DESC, Content.data ASC
		`
	);

	return result;
}

// *************************
// NOTE: uncomment and use this version if
//   sqlite3 is not working for you
// *************************
// async function getAllRecords() {
// 	// fake DB results returned
// 	return [
// 		{ something: 53988400, other: "hello" },
// 		{ something: 342383991, other: "hello" },
// 		{ something: 7367746, other: "world" },
// 	];
// }
