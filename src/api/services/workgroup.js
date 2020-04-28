const pool = require("../../database");

exports.getAllWorkgroups = async (userId) => {
	const results = await pool.query('SELECT wg.* FROM "UserWorkGroup" uwg, "WorkGroup" wg WHERE uwg.userid = $1 AND uwg.workgroup = wg.id', [
		userId,
	]);
	return results.rows;
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
		const workgroupId = result.rows[0].id;
		await client.query('INSERT INTO "UserWorkGroup" VALUES ($1, $2)', [userId, workgroupId]);
		client.release();
		return result.rows[0];
	} catch (err) {
		client.release();
		throw new Error(err.message);
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
		await client.query('DELETE FROM "UserWorkGroup" WHERE workgroup = $1', [workgroupId]);
		// Delete the workgroup
		const results = await client.query('DELETE FROM "WorkGroup" WHERE id = $1 RETURNING *', [workgroupId]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.addMember = async (userId, workgroupId, memberId) => {
	// Get the workgroup
	const workgroup = await this.getWorkgroup(userId, workgroupId);
	// Check if the user is the owner of the workgroup
	if (workgroup.owner !== userId) throw new Error("Solo il proprietario del workgroup può aggiungere un membro");
	// Add the new member
	await pool.query('INSERT INTO "UserWorkGroup" VALUES ($1, $2)', [memberId, workgroupId]);
};

exports.removeMember = async (userId, workgroupId, memberId) => {
	// Get the workgroup
	const workgroup = await this.getWorkgroup(userId, workgroupId);
	// Check if the user is the owner of the workgroup
	if (workgroup.owner !== userId) throw new Error("Solo il proprietario del workgroup può rimuovere un membro");
	// Delete the member
	await pool.query('DELETE FROM "UserWorkGroup" WHERE userid = $1 AND workgroup = $2', [memberId, workgroupId]);
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
