const pool = require("../../database");

const workgroupService = require("./workgroup");

exports.createSection = async (title, workgroupId, userId) => {
	const client = await pool.connect();
	try {
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
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.deleteSection = async (sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check if user is a member of the workgroup
		const exists = await client.query(
			'SELECT wg.* FROM "UserWorkGroup" uwg, "WorkGroup" wg WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2',
			[userId, workgroupId]
		);
		if (exists.rowCount == 0) throw new Error("Non è possibile eliminare una sezione in un workgroup di cui non fai parte");
		// Delete all the tasks of that section
		const results = await client.query('DELETE FROM "Task" WHERE section = $1 RETURNING *', [sectionId]);
		// Delete the section
		await client.query('DELETE FROM "Section" WHERE id = $1', [sectionId]);
		client.release();
		return results.rows;
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.changeSectionTitle = async (newTitle, sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
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
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.getAllSections = async (workgroupId, userId) => {
	// Get all the sections of the user
	const results = await pool.query(
		'SELECT s.* FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id',
		[userId, workgroupId]
	);
	const data = [];
	for (const section of results.rows) {
		const tasks = await this.getAllTasks(section.id, workgroupId, userId);
		data.push({ ...section, tasks });
	}
	return data;
};

exports.createTask = async (sectionId, workgroupId, userId, title, description) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			'SELECT * FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND s.id = $3',
			[userId, workgroupId, sectionId]
		);
		if (exists.rowCount == 0)
			throw new Error(
				"Operazione fallita. Potresti aver richiesto di inserire un gruppo di lavoro o sezione inesistente oppure di risorse di cui non hai l'accesso"
			);
		// Get the last index
		const result = await client.query('SELECT MAX(index) as max FROM "Task" WHERE section = $1', [sectionId]);
		const index = result.rowCount == 0 ? 0 : result.rows[0].max + 1;
		// Create the task
		const results = await client.query(
			'INSERT INTO "Task" (title, description, section, index, owner, completed) VALUES ($1, $2, $3, $4, $5, false) RETURNING *',
			[title, description, sectionId, index, userId]
		);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.deleteTask = async (taskId, sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
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
		// Delete all the members of the task
		await client.query('DELETE FROM "UserTask" WHERE task = $1', [taskId]);
		// Delete the task
		const results = await client.query('DELETE FROM "Task" WHERE id = $1 AND section = $2 RETURNING *', [taskId, sectionId]);
		const index = results.rows[0].index;
		// Shift the index for all the next tasks
		await client.query('UPDATE "Task" SET index = index - 1 WHERE index > $1 AND section = $2', [index, sectionId]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.getAllTasks = async (sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			'SELECT * FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND s.id = $3',
			[userId, workgroupId, sectionId]
		);
		if (exists.rowCount == 0)
			throw new Error(
				"Operazione fallita. Potresti aver richiesto di mostrare un gruppo di lavoro o sezione inesistente oppure di risorse di cui non hai l'accesso"
			);
		// Get all the tasks of the user
		const results = await client.query(
			'SELECT t.* FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s, "Task" t WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND t.section = s.id AND s.id = $3 ORDER BY t.index',
			[userId, workgroupId, sectionId]
		);
		// Get all the members of the tasks
		const data = [];
		for (const task of results.rows) {
			const members = await this.getAllMembers(task.id, sectionId, workgroupId, userId);
			data.push({ ...task, members });
		}
		// Get all the attachments of the tasks
		for (const task of data) task.attachments = await this.getAllAttachments(task.id, sectionId, workgroupId, userId);
		client.release();
		return data;
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.editTask = async (
	taskId,
	sectionId,
	workgroupId,
	userId,
	title,
	description,
	label,
	deadline,
	section,
	index,
	completed,
	members,
	attachments
) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s, "Task" t
		WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND s.id = $3 AND t.section = s.id AND t.id = $4`,
			[userId, workgroupId, sectionId, taskId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		let task;
		// Edit title
		if (title) {
			const results = await client.query('UPDATE "Task" SET title = $2 WHERE id = $1 RETURNING *', [taskId, title]);
			task = results.rows[0];
		}
		// Edit description
		if (description) {
			const results = await client.query('UPDATE "Task" SET description = $2 WHERE id = $1 RETURNING *', [taskId, description]);
			task = results.rows[0];
		}
		// Edit label
		if (label !== undefined) {
			// Check that the label is linked with the workgroup
			if (label !== null) {
				const result = await client.query('SELECT * FROM "Label" WHERE workgroup = $1 AND id = $2', [workgroupId, label]);
				if (result.rowCount == 0)
					throw new Error("Operazione fallita. L'etichetta che vorresti aggiungere non appartiene al gruppo di lavoro oppure non esiste");
			}
			const results = await client.query('UPDATE "Task" SET label = $2 WHERE id = $1 RETURNING *', [taskId, label]);
			task = results.rows[0];
		}
		// Edit deadline
		if (deadline !== undefined) {
			// Check if the deadline is in the future
			if (deadline !== null) {
				const date = new Date(deadline);
				const now = new Date();
				if (date <= now) throw new Error("La scadenza fornita è una data passata");
			}
			const results = await client.query('UPDATE "Task" SET deadline = $2 WHERE id = $1 RETURNING *', [taskId, deadline]);
			task = results.rows[0];
		}
		// Edit section
		if (section) {
			// Check if section is in the same workgroup
			const exists = await client.query('SELECT * FROM "Section" WHERE workgroup = $1 AND id = $2', [workgroupId, section]);
			if (exists.rowCount == 0)
				throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
			const results = await client.query('UPDATE "Task" SET section = $2 WHERE id = $1 RETURNING *', [taskId, section]);
			task = results.rows[0];
			sectionId = section;
		}
		// Edit index
		if (index) {
			// Check if index less than one
			if (index < 1) throw new Error("L'indice deve essere maggiore di 0");

			// Check if index greater than the max index value for the section
			const maxIndex = (await client.query('SELECT MAX(index) FROM "Task" WHERE section = $1', [sectionId])).rows[0];
			if (index > maxIndex) throw new Error("L'indice deve essere minore del massimo indice");

			// Shift the indexes between the target index and the source index
			const sourceIndex = exists.rows[0].index;
			if (sourceIndex > index)
				await client.query('UPDATE "Task" SET index = index + 1 WHERE section = $1 AND index >= $2 AND index < $3', [
					sectionId,
					index,
					sourceIndex,
				]);
			else if (sourceIndex < index)
				await client.query('UPDATE "Task" SET index = index - 1 WHERE section = $1 AND index <= $2 AND index > $3', [
					sectionId,
					index,
					sourceIndex,
				]);

			// Change the index of the task
			const results = await client.query('UPDATE "Task" SET index = $2 WHERE id = $1 RETURNING *', [taskId, index]);

			task = results.rows[0];
		}
		// Edit completed
		if (completed != undefined && completed != null) {
			const results = await client.query('UPDATE "Task" SET completed = $2 WHERE id = $1 RETURNING *', [taskId, completed]);
			task = results.rows[0];
		}
		// Edit members
		if (members) {
			if (!(await workgroupService.checkIfMembersInWorkgroup()))
				throw new Error("Ci sono dei membri forniti che non fanno parte del workgroup");
			// Delete old members
			await client.query('DELETE FROM "UserTask" WHERE task = $1', [taskId]);
			// Add new members
			for (const member of members) await client.query('INSERT INTO "UserTask" (userid, task) VALUES ($1, $2)', [member, taskId]);
		}
		// Edit attachments
		if (attachments) {
			// TODO: Edit attachments to implement
		}
		// Get the task if not modified
		if (!task) {
			const results = await client.query('SELECT * FROM "Task" WHERE id = $1', [taskId]);
			task = results.rows[0];
		}
		// Add members to the task object
		task.members = await this.getAllMembers(taskId, sectionId, workgroupId, userId);
		// Add attachments to the task object
		task.attachments = await this.getAllAttachments(taskId, sectionId, workgroupId, userId);
		client.release();
		return task;
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.createLabel = async (workgroupId, userId, name, color) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup" uwg, "WorkGroup" wg
		WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2`,
			[userId, workgroupId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		let results = await client.query('INSERT INTO "Label" (color, workgroup) VALUES ($1, $2) RETURNING *', [color, workgroupId]);
		const labelId = results.rows[0].id;
		if (name) results = await client.query('UPDATE "Label" SET name = $2 WHERE id = $1 RETURNING *', [labelId, name]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.deleteLabel = async (labelId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Label" l
		WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND l.workgroup = wg.id AND l.id = $3`,
			[userId, workgroupId, labelId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		const results = await client.query('DELETE FROM "Label" WHERE id = $1 RETURNING *', [labelId]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.getAllLabels = async (workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			'SELECT * FROM "UserWorkGroup" uwg, "WorkGroup" wg WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2',
			[userId, workgroupId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		// Get all the labels of the workgroup
		const results = await client.query('SELECT * FROM "Label" WHERE workgroup = $1', [workgroupId]);
		client.release();
		return results.rows;
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.editLabel = async (labelId, workgroupId, userId, name, color) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Label" l
		WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND l.workgroup = wg.id AND l.id = $3`,
			[userId, workgroupId, labelId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		let results;
		if (name) results = await client.query('UPDATE "Label" SET name = $2 WHERE id = $1 RETURNING *', [labelId, name]);
		if (color) results = await client.query('UPDATE "Label" SET color = $2 WHERE id = $1 RETURNING *', [labelId, color]);
		client.release();
		if (results) return results.rows[0];
		return {};
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.getAllMembers = async (taskId, sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s, "Task" t
		WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND s.id = $3 AND t.section = s.id AND t.id = $4`,
			[userId, workgroupId, sectionId, taskId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		const results = await client.query('SELECT u.* FROM "UserTask" ut, "User" u WHERE u.id = ut.userid AND task = $1', [taskId]);
		client.release();
		return results.rows;
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};

exports.getAllAttachments = async (taskId, sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup" uwg, "WorkGroup" wg, "Section" s, "Task" t
		WHERE uwg.userid = $1 AND uwg.workgroup = wg.id AND wg.id = $2 AND s.workgroup = wg.id AND s.id = $3 AND t.section = s.id AND t.id = $4`,
			[userId, workgroupId, sectionId, taskId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		const results = await client.query('SELECT * FROM "Document" ut WHERE task = $1', [taskId]);
		client.release();
		return results.rows;
	} catch (err) {
		client.release();
		throw new Error(err.message);
	}
};
