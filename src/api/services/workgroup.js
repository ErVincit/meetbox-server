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
	if (results.rowCount == 0) throw new Error("Il workgroup con id " + workgroupId + " non esiste oppure non è associato all'utente " + userId);
	return results.rows[0];
};

exports.createWorkgroup = async (userId, name, image) => {
	const client = await pool.connect();
	const result = await client.query('INSERT INTO "WorkGroup"(name, image, owner) VALUES ($1, $2, $3) RETURNING *', [name, image, userId]);
	if (result.rowCount == 1) {
		const workgroupId = result.rows[0].id;
		await client.query('INSERT INTO "UserWorkGroup" VALUES ($1, $2)', [userId, workgroupId]);
		return result.rows[0];
	}
	client.release();
	throw new Error("Creazione del workgroup fallita");
};

exports.deleteWorkgroup = async (userId, workgroupId) => {
	const client = await pool.connect();
	const workgroup = await this.getWorkgroup(userId, workgroupId);
	if (workgroup.owner !== userId) throw new Error("Solo il proprietario del workgroup può eliminarlo");
	await client.query('DELETE FROM "UserWorkGroup" WHERE userid = $1 AND workgroup = $2', [userId, workgroupId]);
	const results = await client.query('DELETE FROM "WorkGroup" WHERE id = $1 RETURNING *', [workgroupId]);
	client.release();
	return results.rows[0];
};

exports.addMember = async (userId, workgroupId, memberId) => {
	const workgroup = await this.getWorkgroup(userId, workgroupId);
	if (workgroup.owner !== userId) throw new Error("Solo il proprietario del workgroup può aggiungere un membro");
	await pool.query('INSERT INTO "UserWorkGroup" VALUES ($1, $2)', [memberId, workgroupId]);
};

exports.removeMember = async (userId, workgroupId, memberId) => {
	const workgroup = await this.getWorkgroup(userId, workgroupId);
	if (workgroup.owner !== userId) throw new Error("Solo il proprietario del workgroup può aggiungere un membro");
	await pool.query('DELETE FROM "UserWorkGroup" WHERE userid = $1 AND workgroup = $2', [memberId, workgroupId]);
};

exports.getAllMembers = async (userId, workgroupId) => {
	const result = await pool.query(
		'SELECT u.id, u.email, u.firstname, u.lastname FROM "UserWorkGroup" uwg, "User" u WHERE uwg.userid = u.id AND uwg.workgroup = $1',
		[workgroupId]
	);
	const userFound = result.rows.find((user) => user.id === userId);
	if (!userFound) throw new Error("L'utente " + userId + " non fa parte dei membri del workgroup");
	return result.rows;
};
