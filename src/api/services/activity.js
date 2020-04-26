const pool = require("../../database");

exports.createSection = async (title, workgroupId, userId) => {
	const client = await pool.connect();
	// Check if user is a member of the workgroup
	const exists = await client.query(
		'SELECT wg.* FROM "UserWorkGroup" uwg, "WorkGroup" wg WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2',
		[userId, workgroupId]
	);
	if (exists.rowCount == 0) throw new Error("Non è possibile creare una sezione in un workgroup di cui non fai parte");
	// Create section
	const results = await client.query('INSERT INTO "Section" (title, workgroup) VALUES ($1, $2) RETURNING *', [title, workgroupId]);
	client.release();
	return results.rows[0];
};

exports.deleteSection = async (sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	// Check if user is a member of the workgroup
	const exists = await client.query(
		'SELECT wg.* FROM "UserWorkGroup" uwg, "WorkGroup" wg WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2',
		[userId, workgroupId]
	);
	if (exists.rowCount == 0) throw new Error("Non è possibile eliminare una sezione in un workgroup di cui non fai parte");
	// Delete all task of that section
	const results = await client.query('DELETE FROM "Task" WHERE section = $1', [sectionId]);
	// Delete the section
	await client.query('DELETE FROM "Section" WHERE id = $1', [sectionId]);
	client.release();
	return results.rows;
};

exports.changeSectionTitle = async (newTitle, sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	// Check preconditions
	const exists = await client.query(
		'SELECT * FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND s.id = $3',
		[userId, workgroupId, sectionId]
	);
	if (exists.rowCount == 0)
		throw new Error(
			"Operazione fallita. Potresti aver richiesto di modificare un gruppo di lavoro o sezione inesistente oppure di risorse di cui non hai l'accesso"
		);
	// Change title
	const result = await client.query('UPDATE "Section" SET title = $1 WHERE id = $2 RETURNING *', [newTitle, sectionId]);
	client.release();
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

exports.createTask = async (sectionId, workgroupId, userId, title, description) => {
	const client = await pool.connect();
	// Check preconditions
	const exists = await client.query(
		'SELECT * FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND s.id = $3',
		[userId, workgroupId, sectionId]
	);
	if (exists.rowCount == 0)
		throw new Error(
			"Operazione fallita. Potresti aver richiesto di inserire un gruppo di lavoro o sezione inesistente oppure di risorse di cui non hai l'accesso"
		);
	// Create the task
	const results = await client.query(
		'INSERT INTO "Task" (title, description, section, owner) VALUES ($1, $2, $3, $4) RETURNING id, title, description',
		[title, description, sectionId, userId]
	);
	client.release();
	return results.rows[0];
};

exports.deleteTask = async (taskId, sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	// Check preconditions
	const exists = await client.query(
		`SELECT *
		FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s, "Task" t
		WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND s.id = $3 AND t.section = s.id AND t.id = $4`,
		[userId, workgroupId, sectionId, taskId]
	);
	if (exists.rowCount == 0)
		throw new Error(
			"Operazione fallita. Potresti aver richiesto di inserire un gruppo di lavoro, sezione e/o task inesistente oppure di risorse di cui non hai l'accesso"
		);
	// Delete the task
	const results = await client.query('DELETE FROM "Task" WHERE id = $1 AND section = $2 RETURNING id, title, description', [taskId, sectionId]);
	client.release();
	return results.rows[0];
};

exports.getAllTasks = async (sectionId, workgroupId, userId) => {
	// Get all the tasks of the user
	const results = await pool.query(
		'SELECT t.* FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s, "Task" t WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND t.section = s.id AND s.id = $3',
		[userId, workgroupId, sectionId]
	);
	return results.rows;
};
