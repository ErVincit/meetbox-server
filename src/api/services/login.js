const pool = require("../../database");

exports.login = async (username, password) => {
	const sqlUsernameExists = 'SELECT * FROM "User" u WHERE u.email = $1';
	const res = await pool.query(sqlUsernameExists, [username]);
	if (res.rowCount > 0) {
		// Confrontare la password dell'utente tramite SQL
		const sqlPassword = 'SELECT uc.password FROM "UserCredential" uc WHERE uc.userid = $1;';
		const resPassword = await pool.query(sqlPassword, [res.rows[0].id]);
		if (resPassword.rowCount > 0 && resPassword.rows[0].password === password) return true;
		return false;
	}
	throw new Error("Email e/o password sono errati");
};

exports.registration = async (email, firstName, lastName, password) => {
	try {
		const exists = await pool.query('SELECT u.email FROM "User" u WHERE u.email = $1;', [email]);
		if (exists.rowCount > 0) throw new Error("Email già registrata");
		const res = await pool.query('INSERT INTO "User"(email, firstName, lastName) VALUES ($1, $2, $3) RETURNING *;', [email, firstName, lastName]);
		if (res.rowCount > 0) {
			const id = res.rows[0].id;
			// Hashare la password
			await pool.query('INSERT INTO "UserCredential"(userid, password) VALUES ($1, $2) RETURNING *;', [id, password]);
			return id;
		}
		throw new Error("Registazione fallita. Controlla i dati e riprova");
	} catch (err) {
		console.log("Error", err);
		throw new Error("Registazione fallita. Controlla i dati e riprova");
	}
};
