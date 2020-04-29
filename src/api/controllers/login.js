const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const loginService = require("../services/login");

router.post("/", async (req, res, next) => {
	const token = req.session.token;
	if (token) return res.status(200).send({msg: 'Sei gia stato loggato. In un implementazione futura sarai ridirezionato alla homepage.'}); // Already logged
	const { email, password } = req.body;
	try {
		const user = await loginService.login(email, password);
		const iduser = user.id;
		req.session.token = jwt.sign({iduser}, process.env.JWT_SECRET); //Da aggiungere per farlo scadere -> , {expiresIn: 60*x} -> dove x sono i minuti
		return res.status(200).send({data: user});
	} catch (err) {
		return res.sendStatus(401);
	}
});

router.get("/validate", async (req, res, next) => {
	const token = req.session.token;
	if (token) return res.sendStatus(200);
	return res.sendStatus(401);
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
