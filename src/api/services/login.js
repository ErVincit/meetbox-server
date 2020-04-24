const pool = require("../../database");

exports.login = async (username, password) => {
    const sqlUsernameExists = 'SELECT * FROM "User" u WHERE u.email=$1';
    const inputUsernameExists = [username]
    const res = await pool.query(sqlUsernameExists, inputUsernameExists);
    if (res.rowCount > 0) {
        const sqlPassword = 'SELECT uc.password FROM "UserCredential" uc WHERE uc.userid=$1;';
        const inputPassword = [res.rows[0].id];
        const resPassword = await pool.query(sqlPassword, inputPassword);
        if (resPassword.rowCount > 0 && resPassword.rows[0].password === password) return true;
        return false;
    }
    return false;
};

exports.registration = async (email, firstName, lastName, password) => {
    try {
        const exists = await pool.query('SELECT u.email FROM "User" u WHERE u.email=$1;', [email]);
        if (exists.rowCount > 0) return -2;
        const res = await pool.query('INSERT INTO "User"(email, firstName, lastName) VALUES ($1, $2, $3) RETURNING *;', [email, firstName, lastName]);
        console.log(res.rows)
        if (res.rowCount > 0) {
            const id = res.rows[0].id;
            await pool.query('INSERT INTO "UserCredential"(userid, password) VALUES ($1, $2) RETURNING *;', [id, password]);
            return id;
        }
        return -1;
    } catch (err) {
        console.log("Error", err)
        return -1;
    }
}