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
	return results.rows;
};
