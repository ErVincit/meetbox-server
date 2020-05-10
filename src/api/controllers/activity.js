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
		section.tasks = [];
		section.members = [];
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

// Edit section
router.put("/section/:idSection/edit", async (req, res) => {
	try {
		const { idWorkgroup, idSection } = req.params;
		const { title, index } = req.body;
		const section = await activityService.editSection(idSection, idWorkgroup, req.currentUser, title, index);
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
		const { title, description, label, members } = req.body;
		if (!title) throw new Error("E' necessario aggiungere un titolo per creare un'attività");
		const task = await activityService.createTask(idSection, idWorkgroup, req.currentUser, title, description, label, members);
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

// Edit task
router.put("/section/:idSection/task/:idTask/edit", async (req, res) => {
	try {
		const { idWorkgroup, idSection, idTask } = req.params;
		const { title, description, label, deadline, section, index, completed, members } = req.body;
		const tasks = await activityService.editTask(
			idTask,
			idSection,
			idWorkgroup,
			req.currentUser,
			title,
			description,
			label,
			deadline,
			section,
			index,
			completed,
			members
		);
		res.json({ data: tasks });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Create label
router.post("/label", async (req, res) => {
	try {
		const { idWorkgroup } = req.params;
		const { name, color } = req.body;
		if (!color) throw new Error("E' necessario aggiungere un colore per creare una label");
		const label = await activityService.createLabel(idWorkgroup, req.currentUser, name, color);
		res.json({ data: label });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Delete label
router.delete("/label/:idLabel", async (req, res) => {
	try {
		const { idWorkgroup, idLabel } = req.params;
		const label = await activityService.deleteLabel(idLabel, idWorkgroup, req.currentUser);
		res.json({ data: label });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Get all labels
router.get("/label", async (req, res) => {
	try {
		const { idWorkgroup } = req.params;
		const label = await activityService.getAllLabels(idWorkgroup, req.currentUser);
		res.json({ data: label });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Edit label
router.put("/label/:idLabel/edit", async (req, res) => {
	try {
		const { idWorkgroup, idLabel } = req.params;
		const { name, color } = req.body;
		const label = await activityService.editLabel(idLabel, idWorkgroup, req.currentUser, name, color);
		res.json({ data: label });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

module.exports = router;
