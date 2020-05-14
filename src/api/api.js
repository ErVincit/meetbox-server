const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");

const login = require("./controllers/login");
router.use("/login", login);

router.use(async (req, res, next) => {
	const token = req.session.token;
	if (!token) return res.sendStatus(401);
	try {
		const value = await jwt.decode(token, process.env.JWT_SECRET);
		req.currentUser = value.iduser;
		return next();
	} catch (err) {
		console.log(err);
		return res.status(400).send({ err });
	}
});

const workgroup = require("./controllers/workgroup");
router.use("/workgroup", workgroup);

const search = require("./controllers/search");
router.use("/search", search);

module.exports = router;
