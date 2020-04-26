const pool = require("../../database");

exports.createSection = async (title, workgroupId, userId) => {
	// Check if user is a member of the workgroup
	const exists = await pool.query(
		'SELECT wg.* FROM "UserWorkGroup" uwg, "WorkGroup" wg WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2',
		[userId, workgroupId]
	);
	if (exists.rowCount == 0) throw new Error("Non è possibile creare una sezione in un workgroup di cui non fai parte");
	// Create section
	const results = await pool.query('INSERT INTO "Section" (title, workgroup) VALUES ($1, $2) RETURNING *', [title, workgroupId]);
	return results.rows[0];
};

exports.deleteSection = async (sectionId, workgroupId, userId) => {
	// Check if user is a member of the workgroup
	const exists = await pool.query(
		'SELECT wg.* FROM "UserWorkGroup" uwg, "WorkGroup" wg WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2',
		[userId, workgroupId]
	);
	if (exists.rowCount == 0) throw new Error("Non è possibile eliminare una sezione in un workgroup di cui non fai parte");
	// Delete all task of that section
	const results = await pool.query('DELETE FROM "Task" WHERE section = $1', [sectionId]);
	// Delete the section
	await pool.query('DELETE FROM "Section" WHERE id = $1', [sectionId]);
	return results.rows;
};

exports.changeSectionTitle = async (newTitle, sectionId, workgroupId, userId) => {
	// Check preconditions
	const exists = await pool.query(
		'SELECT * FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND s.id = $3',
		[userId, workgroupId, sectionId]
	);
	if (exists.rowCount == 0)
		throw new Error(
			"Operazione fallita. Potresti aver richiesto di modificare un gruppo di lavoro o sezione insesistente oppure di risorse di cui non hai accesso"
		);
	// Change title
	const result = await pool.query('UPDATE "Section" SET title = $1 WHERE id = $2 RETURNING *', [newTitle, sectionId]);
	return result.rows[0];
};

exports.getAllSections = async (workgroupId, userId) => {
	// Get all the sections of the user
	const results = await pool.query(
		'SELECT s.* FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id',
		[userId, workgroupId]
	);
	return results.rows;
};
