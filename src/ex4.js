#!/usr/bin/env node

"use strict";

var util = require("util");
var path = require("path");
var fs = require("fs");

var sqlite3 = require("sqlite3");
// require("console.table");


// ************************************

const DB_PATH = path.join(__dirname, "my.db");
const DB_SQL_PATH = path.join(__dirname, "mydb.sql");

var args = require("minimist")(process.argv.slice(2), {
	string: ["other",],
});

main().catch(console.error);


// ************************************

var SQL3;

async function main() {
	if (!args.other) {
		error("Missing '--other=..'");
		return;
	}

	// define some SQLite3 database helpers
	// opening the data database, opening in memory, creating database file with
	// all the basic things needed for sql lite
	var myDB = new sqlite3.Database(DB_PATH);
	// creating helper functions
	SQL3 = {
		// for insert, update, delete row
		run(...args) {
			return new Promise(function c(resolve, reject) {
				myDB.run(...args, function onResult(err) {
					if (err) reject(err);
					else resolve(this);
				});
			});
		},
		// converting callback based functions to promises for cleaner interface
		// to get single row
		get: util.promisify(myDB.get.bind(myDB)),
		// to get multiple rows
		all: util.promisify(myDB.all.bind(myDB)),
		// to execute commands
		exec: util.promisify(myDB.exec.bind(myDB)),
	};
	// SQL mydb.sql has queries to create tables if not created before
	var initSQL = fs.readFileSync(DB_SQL_PATH, "utf-8");
	// TODO: initialize the DB structure
	// asynchronous operation, creating Content and UserData tables
	await SQL3.exec(initSQL)

	var userData = args.other;
	var content = Math.trunc(Math.random() * 1E9);
	var userDataID = InsertOrLookUp()
	if (userDataID) {
		await insertContent(userDataID)
	}
	// ***********

	// TODO: insert values and print all records
	async function InsertOrLookUp(userData) {
		// lookup to find presence of same data
		var result = await SQL3.get(
			`
			SELECT 
				id
			FROM
				UserData
			WHERE 
				Data = ?
			`,
			userData
		)
		if (result && result.id) {
			return result.id
		}
		// if data not present add data into table
		else {
			result = await SQL3.run(
				`
				INSERT INTO
					UserData (data)
				VALUES
					(?)
				`,
				userData
			)
			if (result && result.lastID) {
				return result.lastID
			}
		};
	}
	async function insertContent(userDataID) {
		var result = await SQL3.run(
			`
			INSERT INTO
				Content (userDataID, data)
			VALUES
				(?, ?)
			`,
			userDataID, content
		)
		if (result && result.lastID) {
			return result.lastID
		}
	}
	async function printALlData() {
		var result = await SQL3.get(
			`
			SELECT 
				id as index
				data as UserData
				data as 
			FROM
				UserData
			WHERE 
				Data = ?
			`,
			userData
		)
	}
	error("Oops!");
}

function error(err) {
	if (err) {
		console.error(err.toString());
		console.log("");
	}
}
