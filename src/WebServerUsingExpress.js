#!/usr/bin/env node

"use strict";

var util = require("util");
var path = require("path");
var http = require("http");

var express = require("express");
var sqlite3 = require("sqlite3");
// express gives prebuilt http request handler with all the needed functions
var app = express()

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

var httpserv = http.createServer(app);


main();


// ************************************

function main() {
	defineRoutes()
	httpserv.listen(HTTP_PORT);
	console.log(`Listening on http://localhost:${HTTP_PORT}...`);
}

function defineRoutes() {
	// middle is function which gets called when some criteria meets
	// this middleware/function gets called when there is get request with route get-records
	// order of define matters in middleware
	app.get('/get-records', async function (req, res) {
		var records = await getAllRecords()
		if (records && records.length > 0) {
			res.writeHead(200, {
				'Content-Type': 'application/json',
				'Cache-control': 'no-cache'
			})
			res.end(JSON.stringify(records))
		}
		// we are not calling next() so express assumes that all the necessary actions
		// are taken by this function due to this express does not call middleware
	})
	// next tells express to call next middleware
	// here we convert http routes to filenames in our directory
	app.use(function (req, res, next) {
		if (/^\/(?:index\/?)?(?:[?#].*$)?$/.test(req.url)) {
			// this updated urt will be passed down to next middleware - static server
			req.url = "/index.html";
		}
		else if (/^\/js\/.+$/.test(req.url)) {
			next();
			return;
		}
		else if (/^\/(?:[\w\d]+)(?:[\/?#].*$)?$/.test(req.url)) {
			let [, basename] = req.url.match(/^\/([\w\d]+)(?:[\/?#].*$)?$/);
			req.url = `${basename}.html`;
		}
		next();
	})
	// use() is general form of middleware, called for any type of request
	// express.static is inbuilt static server 
	app.use(express.static(WEB_PATH, {
		maxAge: 100,
		setHeaders: function setHeaders(res) {
			res.setHeaders("Server, 'Node exercise")
		}
	}))
	// TODO: define routes
	//
	// Hints:
	//
	// {
	// 	match: /^\/(?:index\/?)?(?:[?#].*$)?$/,
	// 	serve: "index.html",
	// 	force: true,
	// },
	// {
	// 	match: /^\/js\/.+$/,
	// 	serve: "<% absPath %>",
	// 	force: true,
	// },
	// {
	// 	match: /^\/(?:[\w\d]+)(?:[\/?#].*$)?$/,
	// 	serve: function onMatch(params) {
	// 		return `${params.basename}.html`;
	// 	},
	// },
	// {
	// 	match: /[^]/,
	// 	serve: "404.html",
	// },
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
