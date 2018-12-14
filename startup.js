/** Placeholder for role startup **/
'use strict';
//Set up constants
const People = require('./People');
const HIGHT_ALERT_LIMIT = 40;
const TEST_SENDING = ['cl055729'];

// Set up Variables
let managers = [];
let warningAssociates = []
let kcArray = []
let emplArray = [];
let sendHighAlertEmail = true;
let caleb = new People('cl055729','caleb.logan@cerner.com','Logan,Caleb','zach.stokes@cerner.com','zs042300');
let warningEmaiMessage = `<p>Hi,
<br><br>
As stated on the <a href='https://wiki.cerner.com/x/xAROZ'>Team Expectations Wiki</a> site, \"a minimum of 3 test cases are to be run each day.\"  Your metrics are showing that 3 Testing Assignment JIRAs were not closed today.Please send documentation to your lead before 12pm tomorrow providing justification to help bolster this metric.  If a Testing Assignment was delayed that otherwise would have counted, please provide the testing summary provided in JIRA stating the number of steps failed, how many steps are remaining, and the issue(s) that were found.
<br>
If a previous conversation was conducted with your lead exempting your from this expectation please forward that communication as your justification.
<br>
Regards,<p>
<br>
Will send to 
`;






//setInterval(function () {

// Set up libraies for connection to database
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
//Set up lib for email server
var nodemailer = require('nodemailer');

let queryJSON = new Array();
let dwQueryJSON = [];
//Set up variables for sending mail
let userId = 'cl055729';  //employee id for Outlook. ex 'cl055729'
let pass = '********!';    // outlook password (in string form)
let name = "Caleb Logan";  // name of the person sending the email
let email = "caleb.logan@cerner.com"; //email a

let sumTime = 0;
let sumStealMe = 0;
let sumInProgress = 0;
let mailMessage;
let mailTo = '';
let date = new Date();

let transporter = nodemailer.createTransport({

	host: '*****************',
	port: 587,
	requireTLS: true,
	tls: {
		ciphers: 'SSLv3',
		rejectUnauthorized: false
	},
	auth: {
		user: userId + '************',
		pass: pass
	},
}); // connects to cernsers Email server
let mailOptions = {
	from: ' \"' + name + '\" <' + email + '>',
	to: 'caleb.logan@cerner.com',
	bcc: 'caleb.logan@cerner.com',
	subject: 'Testing'
}

let config = {
	server: '****************************',
	Database: '***********',
	userName: '*********',
	password: '******',
	options: { encrypt: true, database: '*********' }
}; //Sets up the connection to the jiradb3 database
let DWConfig = {
	server: '*********************************',
	Database: '**********',
	userName: '********',
	password: '*******',
	options: { encrypt: true, database: '**************' }
}
// the query you want to execute
	let query = `Select
j.id
,concat('CITQA-', J.issuenum) AS 'Jira#'
, ST_ME.pname AS 'Status'
, j.TIMEESTIMATE / 3600 AS 'Time Estimate'
, j.assignee As 'Assignee'

,closed.pname As 'isClosed'

From jiraissue J
FULL OUTER JOIN(SELECT ID, pname FROM issuestatus WHERE pname IN('Steal me', 'In Progress')) AS ST_ME on ST_ME.id = j.IssueStatus
FULL OUTER JOIN(SELECT ID, pname FROM issuestatus WHERE pname IN('Closed')) AS closed on closed.id = j.IssueStatus
Join issuetype i on i.ID = j.issuetype



Where
 ((ST_ME.pname IS NOT NULL) OR (closed.pname is not null and CONVERT(varchar,j.RESOLUTIONDATE , 1) = CONVERT(varchar,DATEADD(day, -1, getDate()) , 1)))
AND j.SUMMARY != 'Log the Work' AND j.PROJECT = 19400 AND i.id = 14502;


`
let DWQuery =`SELECT DISTINCT 
H.ASSOC_OPER_ID AS 'Associate ID'
,H.ASSOC_NAME AS 'Associate Name'
,H.MGR_OPER_ID AS 'Manager ID'
,H.MGR_NAME AS 'Manager Name'
,H.PERS_EMAIL_ADDR AS 'Email'
,HH.PERS_EMAIL_ADDR AS 'Manager Email'
,H.ASSOC_ROLE AS 'Asociate Role'

FROM JIRA_Issue_Data JD
RIGHT OUTER JOIN Associate_History H ON h.ASSOC_OPER_ID = JD.assignee
Join Associate_History hh ON hh.ASSOC_OPER_ID = h.MGR_OPER_ID
JOIN Department_History DH on H.W_DEPT_ID = dh.W_DEPT_ID
WHERE H.[Active Ind] = 1  AND DH.[Active Ind] = 1 AND H.ASSOC_STATUS = 'Active' 
AND JD.project_name = 'ClientWorks Quality Assurance Team' AND DH.ORG_NAME = 'ClientWorks' AND DH.BUS_UNIT_CODE = 'CLIENtQA' AND H.ASSOC_ROLE LIKE '%Test%';
`

var DWConnection = new Connection(DWConfig);
DWConnection.on('connect', (err) => {
	if(err) {
		console.log(err);
	} else {
		managers.length =0;
		emplArray.length = 0;
		kcArray.lenght = 0;
		setEmployees();
		console.log("DWconnection made");
	}
})







function executeStatement(connection) {
	let request = new Request(query, function (err) {
		if (err) {
			console.log(err);
		}
	});

	request.on('row', function (columns) { //reads each row of the query into a json object
		let rowObject = {};
		columns.forEach(function (column) {
			rowObject[String(column.metadata.colName)] = column.value;
		});
		queryJSON.push(rowObject);

	});



	request.on('done', function (cnt) {						//returns number of rows queried
		console.log(cnt + ' rows Returned');
	});
	request.on('doneProc', function (cnt) {
		if (cnt) {
			console.log(cnt + ' rows Returned doneProc');
			sendTheMail;

		}
	});
	request.on('doneInProc', function (cnt) {
		if (cnt) {
			console.log(cnt + ' rows Returned doneInProc');
			sumAllTime(queryJSON);
			handleEmails();
			sendTheMail(mailMessage);
		}

	});
	request.on('requestCompleted', function () {

		connection.close();
	});
	connection.execSql(request);//executes the sql query

}

function handleEmails() {

	mailMessage = "Steal Me: " + Math.floor(sumStealMe) + "<br>In Progress: " + Math.floor(sumInProgress) + '<br>Total Time: ' + Math.floor(sumTime) + "<br>" + setLines();

}
function setLines() {
	let people = [];
	let peoplePrint = [];
	people = emplArray.filter((item) => (item['numClosed'] + item['numDelayed']) < 3);
	people.forEach(function (item) {
		//console.log('<span style="color:red">' + item.print() + '</span>');
		peoplePrint.push('<span style="color:red">' + item.print() + '</span>');
	});
	return peoplePrint.join('<br><br>');
}

	function sendTheMail() {
		mailOptions.html = '<h1>The script looped at ' + date.getDate() + ' at ' + date.getHours() + ' hrs</h1><br>';
	kcArray.forEach((i) => mailOptions.html += '<br>' + i.print() + '<br>'); //sets the email messae to an html string
	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.log(error);
		}
		else {
			console.log('Message Sent: ' + info.response);
		}
	});
	if ((date.getDay() != 0 && date.getDay != 6) && (date.getHours() >= 7 && date.getHours() <= 15)) {  // Runs Monday - Friday from 7AM to 3PM
		if (sumStealMe > HIGHT_ALERT_LIMIT && sendHighAlertEmail) {
			mailTo = setMailTo(TEST_SENDING);
			let highAlertMailOptions = {
				from: ' \"' + name + '\" <' + email + '>',
				to: mailTo,
				bcc: 'caleb.logan@cerner.com',
				subject: 'Testing High Alert',
				html: highAlertMessage() ,
			}

			transporter.sendMail(highAlertMailOptions, function (error, info) {
				if (error) {
					console.log(error);
				}
				else {
					console.log('Message Sent: ' + info.response);
				}
			});
			sendHighAlertEmail = false;
		}
		else if (sumStealMe < HIGHT_ALERT_LIMIT && !(sendHighAlertEmail)) {
			sendHighAlertEmail = true;
		}
	}
		if ((date.getDay() != 0 && date.getDay != 6) /*&& date.getHours() == 0*/) {
		getWarningAssociates()
		if (warningAssociates.length > 0) {
			sendWarnignEmails();
		}
	}
}

function sumAllTime(json) {
	let status, user, person, index;
	console.log("starting sumAllTime")
	json.forEach(function (row) {
		status = row['Status'];
		if (row['Assignee'] != null) {
			user = row['Assignee'];
		if (emplArray.includes(user)) {
			person = locateKCPerson(user);
			person.print();
		}

		//console.log(person.userName);
		if (status == "In Progress") {
			sumInProgress += row['Time Estimate'];
			//console.log(person['userName']);
			if (emplArray.includes(user)) {
				person['numInProgress'] += 1;
			}
		} else if (status == "Steal Me") {
			sumStealMe += row['Time Estimate'];
			if (emplArray.includes(user)) {
				person['numStealMe'] += 1;
			}
		} else {
			sumTime += row['Time Estimate'];
		}
		if (emplArray.includes(user)) {
			if (row['isClosed'] == 'Closed') {
				person['numClosed'] += 1;
			}
			if (row['Delayed'] == 'On Hold') {
				person['numDelayed'] += 1;
			}
		}
		//emplArray.splice(index, 1, person);
	}});
	sumTime += sumStealMe + sumInProgress;
	

	
}
function setMailTo(sendToArray) {
	let person;
	let to ='';
	sendToArray.forEach(function (item) {
		person = locatePerson(item);
		to += person['email'] + ",";
	});
	return to;
}
function locateKCPerson(userId) {
	return kcArray.find(function (person) {
		if (person['userName'] == userId) {
			return person;

		}
	});
}


function highAlertMessage() {
	return `
<h1 style="color:red;text-align:center;">Testing Queue at High Alert</h1>
<br>
<br>
<p style="color:red;text-align:center;">The Steal Me Queue is curently at <span style="color:black;font-weight:bold;">` + Math.round(sumStealMe) + `</span>.`;
}
function getWarningAssociates() {
	warningAssociates = kcArray.filter(function (item) {


		if (item.getTotalClosedOrDelayed() != 0 && item.getTotalClosedOrDelayed() < 3)  {


			return true;
		}
	});
	//warningAssociates.forEach((item) => item.print());
}
function sendWarnignEmails() {
	let warningMailOptions = {};
	let leadMailOptions = {};
	let leadMail;
	warningAssociates.forEach(function (item) {
		//console.log(item.print());
		if (!(managers.includes(item['userName']))) {
			if (item['mgr'] != '') {
				leadMail = item['mgrEmail'];
			}
			warningMailOptions.subject = 'Daily Testing Expectation Justification Needed';
			warningMailOptions.to = setMailTo(TEST_SENDING);
			warningMailOptions.bcc = setMailTo(TEST_SENDING);
			warningMailOptions.from = email;
			warningMailOptions.html = warningEmaiMessage + item.print() + '<br>Lead Mail: ' + leadMail;
		
		transporter.sendMail(warningMailOptions, function (error, info) {
			if (error) {
				console.log(error);
			}
			else {
				console.log('Message Sent: ' + info.response);
			}
			});
		}
	});
		
}

//}, 3600000);

function locatePerson(userId) {
	return kcArray.find(function (person) {
		if (person['userName'] == userId) {
			return person;

		}
	});
}
function setEmployees() {
	console.log('Start setEmployees')
	let dwRequest = new Request(DWQuery, function (err) {
		if (err) {
			console.log(err);
		}
		else 
		console.log("dwRequest connected");
	});

	dwRequest.on('row', function (columns) { //reads each row of the query into a json object
		console.log("Start dwRequest.on 'row'")
		let rowObject = {};
		columns.forEach(function (column) {
			rowObject[String(column.metadata.colName)] = column.value;
		});
		dwQueryJSON.push(rowObject);

	});



	dwRequest.on('done', function (cnt) {						//returns number of rows queried
		console.log(cnt + ' rows Returned');
	});
	dwRequest.on('doneProc', function (cnt) {
		if (cnt) {
			console.log("doneProc")

		}
	});
	dwRequest.on('doneInProc', function (cnt) {
		if (cnt) {
			console.log(cnt + ' rows Returned doneInProc');
			//console.log(JSON.stringify(dwQueryJSON));
			setManagers(dwQueryJSON);
			setKCEmployees(dwQueryJSON);
			var connection = new Connection(config); //Establishes connection to the database
			connection.on('connect', function (err) {
				// If no error, then good to proceed.
				if (err) {
					console.log(err);
				}
				else {
					//kcArray.forEach(function (item) { item.clear() });
					executeStatement(connection);
				}
			});
			
		}

	});
	dwRequest.on('requestCompleted', function () {

		DWConnection.close();
		console.log("request complete");
	});
	DWConnection.execSql(dwRequest);//executes the sql query

}
function setManagers(JSONobj) {
	console.log('Start set Manager');
	JSONobj.forEach(function (empl) {
		if (!(managers.includes(empl['Manager ID'].toLowerCase()))){
			managers.push(empl['Manager ID'].toLowerCase());
			console.log(empl['Manager ID']);
		}else {
		emplArray.push(empl['Associate ID'].toLowerCase());
		} 
		
	});emplArray.push(caleb['userName']);
}

function setKCEmployees(json) {
	let userName, userEmail, name, mgrEmail,mgrUserName
	console.log('Start setKCEmployees');
	json.forEach((empl) => {
		if(!(managers.includes(empl['Associate ID']))) {
			userName = empl['Associate ID'].toLowerCase();
			userEmail = empl['Email'];
			name = empl['Associate Name'];
			mgrEmail = empl['Manager Email'];
			mgrUserName = empl['Manager ID'].toLowerCase();
			kcArray.push(new People(userName, userEmail, name, mgrEmail,mgrUserName));
		} 
	});kcArray.push(caleb);
	kcArray.forEach((i) => console.log(i['name']));
	console.log("starting emplArray");
	emplArray.forEach((i) => console.log(i));
}