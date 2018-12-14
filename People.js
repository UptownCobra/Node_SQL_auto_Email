'use strict'

module.exports = class People {
	constructor(userName, userEmail, name, mgrEmail, mgrUserName) {
		this.mgr = mgrUserName;
		this.userName = userName;
		this.name = name;
		this.email = userEmail;
		this.mgrEmail = mgrEmail;
		this.numStealMe = 0;
		this.numInProgress = 0;
		this.numClosed = 0;
		this.numDelayed = 0;

	}
	
	print() {
		return "<br>Name: " + this.name +
		"<br>User Name: " + this.userName +
		"<br>Email: " + this.email +
			"<br>Lead: " + this.mgr +
			"<br>Lead Mail: " + this.mgrEmail +
			"<br>In Progress: " + this.numInProgress +
			"<br>Steal Me: " + this.numStealMe +
			"<br>Closed: " + this.numClosed +
			"<br>On Hold: " + this.numDelayed;
	}
	clear() {
		this.numStealMe = 0;
		this.numInProgress = 0;
		this.numClosed = 0;
		this.numDelayed = 0;
	}
	getTotalClosedOrDelayed() {
		return this.numClosed + this.numDelayed;
	}
}
