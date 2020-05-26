const pool = require("../../database");

const activityService = require("./activity");

exports.getAllWorkgroups = async (userId) => {
	const results = await pool.query('SELECT wg.* FROM "UserWorkGroup" uwg, "WorkGroup" wg WHERE uwg.userid = $1 AND uwg.workgroup = wg.id', [
		userId,
	]);
	const data = [];
	// Add workgroup members
	for (const workgroup of results.rows) {
		const members = await this.getAllMembers(userId, workgroup.id);
		data.push({ ...workgroup, members });
	}
	// Add labels
	for (const workgroup of data) {
		workgroup.labels = await activityService.getAllLabels(workgroup.id, userId);
	}
	return data;
};

exports.editWorkgroup = async (userId, workgroupId, name, image) => {
	const client = await pool.connect();
	try {
		if (!this.checkWorkgroupMembers([userId], workgroupId, userId))
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		let workgroup;
		if (name) {
			const result = await client.query('UPDATE "WorkGroup" SET name = $1 WHERE id = $2 RETURNING *', [name, workgroupId]);
			workgroup = result.rows[0];
		}
		if (image) {
			const result = await client.query('UPDATE "WorkGroup" SET image = $1 WHERE id = $2 RETURNING *', [image, workgroupId]);
			workgroup = result.rows[0];
		}
		// Add workgroup members
		workgroup.members = await this.getAllMembers(userId, workgroup.id);
		// Add labels
		workgroup.labels = await activityService.getAllLabels(workgroup.id, userId);
		client.release();
		return workgroup;
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.getWorkgroup = async (userId, workgroupId) => {
	const results = await pool.query(
		'SELECT wg.* FROM "UserWorkGroup" uwg, "WorkGroup" wg WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2',
		[userId, workgroupId]
	);
	if (results.rowCount == 0)
		throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
	return results.rows[0];
};

exports.createWorkgroup = async (userId, name, image) => {
	const client = await pool.connect();
	try {
		const result = await client.query('INSERT INTO "WorkGroup"(name, image, owner) VALUES ($1, $2, $3) RETURNING *', [name, image, userId]);
		const workgroup = result.rows[0];
		await client.query('INSERT INTO "UserWorkGroup" VALUES ($1, $2)', [userId, workgroup.id]);
		// Add workgroup members
		workgroup.members = await this.getAllMembers(userId, workgroup.id);
		// Add labels
		workgroup.labels = await activityService.getAllLabels(workgroup.id, userId);
		client.release();
		return workgroup;
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.deleteWorkgroup = async (userId, workgroupId) => {
	const client = await pool.connect();
	try {
		// Get the workgroup
		const workgroup = await this.getWorkgroup(userId, workgroupId);
		// Check if the user is the owner of the workgroup
		if (workgroup.owner !== userId) throw new Error("Solo il proprietario del workgroup può eliminarlo");
		// Delete all members of the workgroup
		const members = await client.query('SELECT userid FROM "UserWorkGroup" WHERE workgroup = $1', [workgroupId]);
		for (const member of members) await this.removeMember(userId, workgroupId, member.id);
		// Delete the workgroup
		const results = await client.query('DELETE FROM "WorkGroup" WHERE id = $1 RETURNING *', [workgroupId]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.addMember = async (userId, workgroupId, memberId) => {
	const client = await pool.connect();
	try {
		// Get the workgroup
		const workgroup = await this.getWorkgroup(userId, workgroupId);
		// Check if the user is the owner of the workgroup
		if (workgroup.owner !== userId) throw new Error("Solo il proprietario del workgroup può aggiungere un membro");
		// Add the new member
		await client.query('INSERT INTO "UserWorkGroup" VALUES ($1, $2)', [memberId, workgroupId]);
		// Return the member added
		const results = await client.query('SELECT * FROM "User" WHERE id = $1', [memberId]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.removeMember = async (userId, workgroupId, memberId) => {
	const documentService = require("./document");
	const activityService = require("./activity");
	const calendarService = require("./calendar");

	// Get the workgroup
	const workgroup = await this.getWorkgroup(userId, workgroupId);
	// Check if the user can remove a member of the workgroup
	if (workgroup.owner !== userId && userId !== memberId) throw new Error("Solo il proprietario del workgroup può rimuovere questo membro");
	const client = await pool.connect();
	try {
		// Delete all the documents where the deleted user is the owner
		const docsResult = await client.query('SELECT id FROM "Document" WHERE owner = $1 AND workgroup = $2', [memberId, workgroupId]);
		for (const doc of docsResult.rows) await documentService.delete(userId, doc.id, workgroupId);

		// Delete the user from the document shared with the user
		const userDocResult = await client.query(
			'SELECT d.id FROM "Document" d, "UserDocument" ud WHERE ud.document = d.id AND d.workgroup = $2 AND ud.userid = $1',
			[memberId, workgroupId]
		);
		for (const userDoc of userDocResult.rows)
			await client.query('DELETE FROM "UserDocument" WHERE document = $1 AND userid = $2', [userDoc.id, memberId]);

		// Delete all the tasks where the deleted user is the owner
		const tasksResult = await client.query(
			'SELECT t.id, t.section FROM "Task" t, "Section" s WHERE t.section = s.id AND s.workgroup = $2 AND t.owner = $1',
			[memberId, workgroupId]
		);
		for (const task of tasksResult.rows) await activityService.deleteTask(task.id, task.section, workgroupId, userId);
		// Delete the user from the tasks assigned to the user
		const userTasksResult = await client.query(
			'SELECT t.id FROM "Task" t, "Section" s, "UserTask" ut WHERE ut.task = t.id AND t.section = s.id AND s.workgroup = $2 AND ut.userid = $1',
			[memberId, workgroupId]
		);
		for (const userTask of userTasksResult.rows)
			await client.query('DELETE FROM "UserTask" WHERE task = $1 AND userid = $2', [userTask.id, memberId]);

		// Delete all the events where the deleted user is the owner
		const eventsResult = await client.query('SELECT id FROM "Event" WHERE owner = $1 AND workgroup = $2', [memberId, workgroupId]);
		for (const event of eventsResult.rows) await calendarService.deleteEvent(memberId, event.id);
		// Delete the user from the events where the user was invited
		const userEventsResult = await client.query(
			'SELECT e.id FROM "Event" e, "UserEvent" ue WHERE ue.event = e.id AND ue.userid = $1 AND e.workgroup = $2',
			[memberId, workgroupId]
		);
		for (const userEvent of userEventsResult.rows)
			await client.query('DELETE FROM "UserEvent" WHERE event = $1 AND userid = $2', [userEvent.id, memberId]);

		// Delete the member
		const result = await client.query('DELETE FROM "UserWorkGroup" WHERE userid = $1 AND workgroup = $2 RETURNING *', [memberId, workgroupId]);
		const member = result.rows[0];
		client.release();
		return member;
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.getAllMembers = async (userId, workgroupId) => {
	// Get all members
	const result = await pool.query('SELECT u.* FROM "UserWorkGroup" uwg, "User" u WHERE uwg.userid = u.id AND uwg.workgroup = $1', [workgroupId]);
	// Check if the user is a member
	const userFound = result.rows.find((user) => user.id === userId);
	if (!userFound) throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
	return result.rows;
};

// Check if the members with the given ids are in the workgroup
exports.checkWorkgroupMembers = async (membersIdToCheck, workgroupId, userId) => {
	// Get all members
	const workgroupMembers = await this.getAllMembers(userId, workgroupId);
	// Map the members to their id
	const membersId = workgroupMembers.map((member) => member.id);
	// Check if all the members are in the workgroup
	for (const member of membersIdToCheck) if (!membersId.includes(member)) return false;
	return true;
};
