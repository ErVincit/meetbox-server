const pool = require("../../database");

const workgroupService = require("./workgroup");

exports.createSection = async (title, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check if the user is a member of the workgroup
		const exists = await client.query('SELECT * FROM "UserWorkGroup" uwg WHERE uwg.userid = $1 AND uwg.workgroup = $2', [userId, workgroupId]);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		// Find max index section
		const result = await client.query('SELECT MAX(index) as max FROM "Section" WHERE workgroup = $1', [workgroupId]);
		const max = result.rows[0].max;
		const index = max !== null ? max + 1 : 0;
		// Create section
		const results = await client.query('INSERT INTO "Section" (title, workgroup, index) VALUES ($1, $2, $3) RETURNING *', [
			title,
			workgroupId,
			index,
		]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.deleteSection = async (sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check if user is a member of the workgroup
		const exists = await client.query('SELECT * FROM "UserWorkGroup" uwg WHERE uwg.userid = $1 AND uwg.workgroup = $2', [userId, workgroupId]);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		// Delete all the members of the task
		const result = await client.query('SELECT * FROM "Task" WHERE section = $1', [sectionId]);
		for (const task of result.rows) await client.query('DELETE FROM "UserTask" WHERE task = $1', [task.id]);
		// Delete all the tasks of the section
		await client.query('DELETE FROM "Task" WHERE section = $1', [sectionId]);
		// Delete the section
		const results = await client.query('DELETE FROM "Section" WHERE id = $1 RETURNING *', [sectionId]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.editSection = async (sectionId, workgroupId, userId, title, index) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			'SELECT s.* FROM "UserWorkGroup" uwg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND s.workgroup = uwg.workgroup AND s.id = $3',
			[userId, workgroupId, sectionId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		const section = exists.rows[0];
		let result;
		// Change title
		if (title) result = await client.query('UPDATE "Section" SET title = $1 WHERE id = $2 RETURNING *', [title, sectionId]);
		if (index !== undefined && index !== null) {
			// Check if index less than zero
			if (index < 0) throw new Error("L'indice della section deve essere positivo");

			// Check if index greater than the max index value for the section
			const maxIndex = (await client.query('SELECT MAX(index) as max FROM "Section" WHERE workgroup = $1', [workgroupId])).rows[0].max;
			if (index > maxIndex) throw new Error("L'indice della section deve essere minore del massimo indice");

			// Shift the indexes between the target index and the source index
			const sourceIndex = section.index;
			if (sourceIndex > index)
				await client.query('UPDATE "Section" SET index = index + 1 WHERE workgroup = $1 AND index >= $2 AND index < $3', [
					workgroupId,
					index,
					sourceIndex,
				]);
			else if (sourceIndex < index)
				await client.query('UPDATE "Section" SET index = index - 1 WHERE workgroup = $1 AND index <= $2 AND index > $3', [
					workgroupId,
					index,
					sourceIndex,
				]);

			// Change the index of the section
			result = await client.query('UPDATE "Section" SET index = $2 WHERE id = $1 RETURNING *', [sectionId, index]);
		}
		client.release();
		return result.rows[0];
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.getAllSections = async (workgroupId, userId) => {
	// Get all the sections of the user
	const results = await pool.query(
		'SELECT s.* FROM "UserWorkGroup" uwg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND s.workgroup = uwg.workgroup ORDER BY s.index',
		[userId, workgroupId]
	);
	const data = [];
	for (const section of results.rows) {
		const tasks = await this.getAllTasks(section.id, workgroupId, userId);
		data.push({ ...section, tasks });
	}
	return data;
};

exports.createTask = async (sectionId, workgroupId, userId, title, description, label, members) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			'SELECT * FROM "UserWorkGroup" uwg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND s.workgroup = uwg.workgroup AND s.id = $3',
			[userId, workgroupId, sectionId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		// Get the last index
		const result = await client.query('SELECT MAX(index) as max FROM "Task" WHERE section = $1', [sectionId]);
		const max = result.rows[0].max;
		const index = max !== null ? max + 1 : 0;
		// Create the task
		let results = await client.query('INSERT INTO "Task" (title, section, index, owner, completed) VALUES ($1, $2, $3, $4, false) RETURNING *', [
			title,
			sectionId,
			index,
			userId,
		]);
		let task = results.rows[0];
		// Add description
		if (description) {
			results = await client.query('UPDATE "Task" SET description = $1 WHERE id = $2 RETURNING *', [description, task.id]);
		}
		// Add label
		if (label) {
			// Check if the label is linked with the workgroup
			const result = await client.query('SELECT * FROM "Label" WHERE workgroup = $1 AND id = $2', [workgroupId, label]);
			if (result.rowCount == 0)
				throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
			const results = await client.query('UPDATE "Task" SET label = $2 WHERE id = $1 RETURNING *', [task.id, label]);
			task = results.rows[0];
		}
		// Add members
		if (members) {
			// Check preconditions
			if (!(await workgroupService.checkWorkgroupMembers(members, workgroupId, userId)))
				throw new Error("Ci sono dei membri forniti che non fanno parte del workgroup");
			for (const member of members) await client.query('INSERT INTO "UserTask" (userid, task) VALUES ($1, $2)', [member, task.id]);
			task.members = members;
		} else task.members = [];
		// Add attachments to the task object
		task.attachments = [];
		client.release();
		return task;
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.deleteTask = async (taskId, sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup" uwg, "Section" s, "Task" t
		WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND s.workgroup = uwg.workgroup AND s.id = $3 AND t.section = s.id AND t.id = $4`,
			[userId, workgroupId, sectionId, taskId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		// Delete all the members of the task
		await client.query('DELETE FROM "UserTask" WHERE task = $1', [taskId]);
		// Delete all the attachments of the task
		await client.query('DELETE FROM "Document" WHERE task = $1', [taskId]);
		// Delete the task
		const results = await client.query('DELETE FROM "Task" WHERE id = $1 AND section = $2 RETURNING *', [taskId, sectionId]);
		const index = results.rows[0].index;
		// Shift the index for all the next tasks
		await client.query('UPDATE "Task" SET index = index - 1 WHERE index > $1 AND section = $2', [index, sectionId]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.getAllTasks = async (sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			'SELECT * FROM "UserWorkGroup" uwg, "Section" s WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND s.workgroup = uwg.workgroup AND s.id = $3',
			[userId, workgroupId, sectionId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		// Get all the tasks of the user
		const results = await client.query('SELECT * FROM "Task" WHERE section = $1 ORDER BY index', [sectionId]);
		const data = results.rows;
		// Get all the members of the tasks
		for (const task of data) task.members = (await this.getAllMembers(task.id, sectionId, workgroupId, userId)).map((m) => m.id);
		// Get all the attachments of the tasks
		for (const task of data) task.attachments = await this.getAllAttachments(task.id, sectionId, workgroupId, userId);
		client.release();
		return data;
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.editTask = async (taskId, sectionId, workgroupId, userId, title, description, label, deadline, section, index, completed, members) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT * FROM "UserWorkGroup" uwg, "Section" s, "Task" t
			WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND s.workgroup = uwg.workgroup AND s.id = $3 AND t.section = s.id AND t.id = $4`,
			[userId, workgroupId, sectionId, taskId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		let task = exists.rows[0];
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
			// Check if the label is linked with the workgroup
			if (label !== null) {
				const result = await client.query('SELECT * FROM "Label" WHERE workgroup = $1 AND id = $2', [workgroupId, label]);
				if (result.rowCount == 0)
					throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
			}
			const results = await client.query('UPDATE "Task" SET label = $2 WHERE id = $1 RETURNING *', [taskId, label]);
			task = results.rows[0];
		}
		// Edit deadline
		if (deadline !== undefined) {
			let date;
			// Check if the deadline is in the future
			if (deadline !== null) {
				date = new Date(deadline);
				const now = new Date();
				if (date <= now) throw new Error("La scadenza fornita è una data passata");
			}
			const results = await client.query('UPDATE "Task" SET deadline = $2 WHERE id = $1 RETURNING *', [taskId, date]);
			task = results.rows[0];
		}
		// Edit section
		if (section) {
			// Check if section is in the same workgroup
			const exists = await client.query('SELECT * FROM "Section" WHERE workgroup = $1 AND id = $2', [workgroupId, section]);
			if (exists.rowCount == 0)
				throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
			const maxResult = await client.query('SELECT MAX(index) as max FROM "Task" WHERE section = $1', [section]);
			const max = maxResult.rows[0].max;
			const maxNewSectionIndex = max !== null && max !== undefined ? max + 1 : "0";
			const results = await client.query('UPDATE "Task" SET section = $2, index = $3 WHERE id = $1 RETURNING *', [
				taskId,
				section,
				maxNewSectionIndex,
			]);
			// Shift all the indexes after the task index
			await client.query('UPDATE "Task" SET index = index - 1 WHERE section = $1 AND index > $2', [sectionId, task.index]);
			task = results.rows[0];
			sectionId = section;
		}
		// Edit index
		if (index !== undefined && index !== null) {
			// Check if index less than zero
			if (index < 0) throw new Error("L'indice del task deve essere positivo");

			// Check if index greater than the max index value for the section
			const maxIndex = (await client.query('SELECT MAX(index) as max FROM "Task" WHERE section = $1', [sectionId])).rows[0].max;
			if (index > maxIndex) throw new Error("L'indice del task deve essere minore del massimo indice");

			// Shift the indexes between the target index and the source index
			const sourceIndex = task.index;
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
		if (completed !== undefined && completed !== null) {
			const results = await client.query('UPDATE "Task" SET completed = $2 WHERE id = $1 RETURNING *', [taskId, completed]);
			task = results.rows[0];
		}
		// Edit members
		if (members) {
			if (!(await workgroupService.checkWorkgroupMembers(members, workgroupId, userId)))
				throw new Error("Ci sono dei membri forniti che non fanno parte del workgroup");
			// Delete old members
			await client.query('DELETE FROM "UserTask" WHERE task = $1', [taskId]);
			// Add new members
			for (const member of members) await client.query('INSERT INTO "UserTask" (userid, task) VALUES ($1, $2)', [member, taskId]);
		}
		// Get the task if not modified
		if (!task) {
			const results = await client.query('SELECT * FROM "Task" WHERE id = $1', [taskId]);
			task = results.rows[0];
		}
		// Add members to the task object
		task.members = (await this.getAllMembers(taskId, sectionId, workgroupId, userId)).map((m) => m.id);
		// Add attachments to the task object
		task.attachments = await this.getAllAttachments(taskId, sectionId, workgroupId, userId);
		client.release();
		return task;
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.createLabel = async (workgroupId, userId, name, color) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup"
		WHERE userid = $1 AND workgroup = $2`,
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
		throw err;
	}
};

exports.deleteLabel = async (labelId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup" uwg, "Label" l
		WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND l.workgroup = uwg.workgroup AND l.id = $3`,
			[userId, workgroupId, labelId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		// Remove all the FK in Task
		await client.query('UPDATE "Task" SET label = NULL WHERE label = $1', [labelId]);
		// Delete the label
		const results = await client.query('DELETE FROM "Label" WHERE id = $1 RETURNING *', [labelId]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.getAllLabels = async (workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query('SELECT * FROM "UserWorkGroup" uwg WHERE uwg.userid = $1 AND uwg.workgroup = $2', [userId, workgroupId]);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		// Get all the labels of the workgroup
		const results = await client.query('SELECT * FROM "Label" WHERE workgroup = $1', [workgroupId]);
		client.release();
		return results.rows;
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.editLabel = async (labelId, workgroupId, userId, name, color) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT * FROM "UserWorkGroup" uwg, "Label" l
			WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND l.workgroup = uwg.workgroup AND l.id = $3`,
			[userId, workgroupId, labelId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		let results;
		if (name) results = await client.query('UPDATE "Label" SET name = $2 WHERE id = $1 RETURNING *', [labelId, name]);
		if (color) results = await client.query('UPDATE "Label" SET color = $2 WHERE id = $1 RETURNING *', [labelId, color]);
		if (!results) results = await client.query('SELECT * FROM "Label" WHERE id = $1', [labelId]);
		client.release();
		return results.rows[0];
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.getAllMembers = async (taskId, sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup" uwg, "Section" s, "Task" t
		WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND s.workgroup = uwg.workgroup AND s.id = $3 AND t.section = s.id AND t.id = $4`,
			[userId, workgroupId, sectionId, taskId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		const results = await client.query('SELECT u.* FROM "UserTask" ut, "User" u WHERE u.id = ut.userid AND task = $1', [taskId]);
		client.release();
		return results.rows;
	} catch (err) {
		client.release();
		throw err;
	}
};

exports.getAllAttachments = async (taskId, sectionId, workgroupId, userId) => {
	const client = await pool.connect();
	try {
		// Check preconditions
		const exists = await client.query(
			`SELECT *
		FROM "UserWorkGroup" uwg, "Section" s, "Task" t
		WHERE uwg.userid = $1 AND uwg.workgroup = $2 AND s.workgroup = uwg.workgroup AND s.id = $3 AND t.section = s.id AND t.id = $4`,
			[userId, workgroupId, sectionId, taskId]
		);
		if (exists.rowCount == 0)
			throw new Error("Operazione fallita. Potresti aver richiesto di accedere ad una risorsa inesistene o di cui non hai l'accesso");
		const results = await client.query('SELECT * FROM "Document" WHERE task = $1', [taskId]);
		client.release();
		return results.rows;
	} catch (err) {
		client.release();
		throw err;
	}
};
