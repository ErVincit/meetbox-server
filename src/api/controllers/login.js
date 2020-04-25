const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const loginService = require("../services/login");

router.post("/", async (req, res, next) => {
	const token = req.session.token;
	if (token) res.sendStatus(200); // Already logged
	const { email, password } = req.body;
	const result = await loginService.login(email, password);
	if (result) {
		//Set a good cookie
		// req.session.token = jwt.sign({result}, );
		return res.sendStatus(200);
	}
	return res.sendStatus(401);
});

router.post("/validate", async (req, res, next) => {
	const token = req.session.token;
	if (token) res.sendStatus(200); // OK
	res.sendStatus(401);
});

router.post("/registration", async (req, res) => {
	const { email, firstName, lastName, password } = req.body;
	if (email || firstName || lastName || password) res.status(418);
	try {
		const result = await loginService.registration(email, firstName, lastName, password);
		res.send({ data: result }).status(200);
	} catch (err) {
		res.status(412).send({ error: "RegistrationError", message: err });
	}
});

module.exports = router;
