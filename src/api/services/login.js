const pool = require("../../database");
const crypto = require("crypto");

exports.login = async (username, password) => {
	const sqlUsernameExists = 'SELECT * FROM "User" u WHERE u.email = $1';
	const res = await pool.query(sqlUsernameExists, [username]);
	if (res.rowCount > 0) {
		// Confrontare la password dell'utente tramite SQL
		const id = res.rows[0].id;
		const resPassword = await pool.query('SELECT uc.password FROM "UserCredential" uc WHERE uc.userid = $1;', [id]);
		if (resPassword.rowCount > 0 && resPassword.rows[0].password === this.hashing(password)) return res.rows[0];
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
			await pool.query('INSERT INTO "UserCredential"(userid, password) VALUES ($1, $2) RETURNING *;', [id, this.hashing(password)]);
			return id;
		}
		throw new Error("Registazione fallita. Controlla i dati e riprova");
	} catch (err) {
		console.log("Error", err);
		throw new Error("Registazione fallita. Controlla i dati e riprova");
	}
};

exports.getUser = async (userId) => {
	const results = await pool.query('SELECT * FROM "User" WHERE id = $1;', [userId]);
	return results.rows[0];
};

exports.hashing = (password) => {
	const hash = crypto.createHash("sha512");
	hash.update(password);
	return hash.digest("hex");
};
