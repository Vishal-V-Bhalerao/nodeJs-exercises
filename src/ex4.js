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
	string: ["UserData",],
});

main().catch(console.error);


// ************************************

var SQL3;

async function main() {
	if (!args.UserData) {
		error("Missing '--UserData=..'");
		return;
	}

	/**
	* define some SQLite3 database helpers
	* opening the data database, opening in memory, creating database file with
	* all the basic things needed for sql lite
	*/
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

	var userData = args.UserData;
	var content = Math.trunc(Math.random() * 1E9);
	var userDataID = await InsertOrLookUp(userData)
	if (userDataID) {
		var contentID = await insertContent(userDataID)
		if (contentID) {
			await printALlData()
			console.log('Success ..!')
			return
		}
	}
	error('Oops..! something went wrong')
	// ************************************************************************
	// TODO: insert values and print all records

	/**
	 * To insert User data into database.
	 * @param { user data string received from command line arg } userData 
	 * @returns  id of the inserted row
	 */
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
	/**
	 * To insert content data with  user data id associated  with it
	 * @param {User data ID to be inserted in content table} userDataID 
	 * @returns  id of the inserted row
	 */
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
	/**
	 * To Print all data into command line in table format
	 */
	async function printALlData() {
		// returns array of values
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
		)
		if (result && result.length > 0) {
			console.table(result)
		}
	}
	error("Oops!");
}
function error(err) {
	if (err) {
		console.error(err.toString());
		console.log("");
	}
}
