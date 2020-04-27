const express = require("express");
const router = express.Router({ mergeParams: true });

const activityService = require("../services/activity");

// Create section
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

// Delete section
router.delete("/section/:idSection", async (req, res) => {
	try {
		const { idWorkgroup, idSection } = req.params;
		const section = await activityService.deleteSection(idSection, idWorkgroup, req.currentUser);
		res.json({ data: section });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Change section title
router.put("/section/:idSection", async (req, res) => {
	try {
		const { idWorkgroup, idSection } = req.params;
		const { title } = req.body;
		if (!title) throw new Error("E' necessario aggiungere un titolo per cambiare il titolo di una sezione");
		const section = await activityService.changeSectionTitle(title, idSection, idWorkgroup, req.currentUser);
		res.json({ data: section });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Get all sections
router.get("/section", async (req, res) => {
	try {
		const { idWorkgroup } = req.params;
		const sections = await activityService.getAllSections(idWorkgroup, req.currentUser);
		res.json({ data: sections });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Create task
router.post("/section/:idSection/task", async (req, res) => {
	try {
		const { idWorkgroup, idSection } = req.params;
		const { title, description } = req.body;
		if (!title) throw new Error("E' necessario aggiungere un titolo per creare un'attività");
		if (!description) throw new Error("E' necessario aggiungere una descrizione per creare un'attività");
		const task = await activityService.createTask(idSection, idWorkgroup, req.currentUser, title, description);
		res.json({ data: task });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Delete task
router.delete("/section/:idSection/task/:idTask", async (req, res) => {
	try {
		const { idWorkgroup, idSection, idTask } = req.params;
		const task = await activityService.deleteTask(idTask, idSection, idWorkgroup, req.currentUser);
		res.json({ data: task });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Get all the tasks
router.get("/section/:idSection/task", async (req, res) => {
	try {
		const { idWorkgroup, idSection } = req.params;
		const tasks = await activityService.getAllTasks(idSection, idWorkgroup, req.currentUser);
		res.json({ data: tasks });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

module.exports = router;
