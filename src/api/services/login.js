const pool = require("../../database");

exports.login = async (username, password) => {
    const sqlUsernameExists = 'SELECT * FROM "User" u WHERE u.email=$1';
    const inputUsernameExists = [username]
    const res = await pool.query(sqlUsernameExists, inputUsernameExists);
    if (res.rowCount > 0) {
        const sqlPassword = 'SELECT uc.password FROM "UserCredential" uc WHERE uc.id=$1;';
        const inputPassword = [res.rows[0].id];
        const resPassword = await pool.query(sqlPassword, inputPassword);
        if (resPassword.rowCount > 0 && resPassword.rows[0].password === password) return true;
        return false;
    }
    return false;
};