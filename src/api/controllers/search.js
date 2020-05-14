const express = require("express");
const router = express.Router({ mergeParams: true });

const pool = require("../../database");

router.post("/", async (req, res) => {
	const { value } = req.body;
	const results = await pool.query(`SELECT * FROM "User" WHERE email ILIKE $1 LIMIT 5`, [value + "%"]);
	res.send({ data: results.rows });
});

module.exports = router;
