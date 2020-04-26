const express = require("express");
const router = express.Router({ mergeParams: true });

const activityService = require("../services/activity");

router.post("/section", async (req, res) => {
	try {
		const { idWorkgroup } = req.params;
		const { title } = req.body;
		if (!title) throw new Error("E' necessario aggiungere un titolo per creare una sezione");
		const section = await activityService.createSection(title, idWorkgroup, req.currentUser);
		res.json({ data: section });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

router.delete("/section/:idSection", async (req, res) => {
	try {
		const { idWorkgroup, idSection } = req.params;
		const section = await activityService.deleteSection(idSection, idWorkgroup, req.currentUser);
		res.json({ data: section });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

router.put("/section/:idSection", async (req, res) => {
	try {
		const { idWorkgroup, idSection } = req.params;
		const { title } = req.body;
		const section = await activityService.changeSectionTitle(title, idSection, idWorkgroup, req.currentUser);
		res.json({ data: section });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

router.get("/section", async (req, res) => {
	try {
		const { idWorkgroup } = req.params;
		const sections = await activityService.getAllSections(idWorkgroup, req.currentUser);
		res.json({ data: sections });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

module.exports = router;
