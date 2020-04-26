const express = require("express");
const router = express.Router();

const workgroupService = require("../services/workgroup");

// Get all the workgroups
router.get("/", async (req, res) => {
	try {
		const userId = 1;
		const workgroups = await workgroupService.getAllWorkgroups(userId);
		res.json({ data: workgroups });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Create workgroup
router.post("/", async (req, res) => {
	try {
		const userId = 1;
		const { name, image } = req.body;
		const workgroup = await workgroupService.createWorkgroup(userId, name, image);
		res.json({ data: workgroup });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Get specific workgroup
router.get("/:idWorkgroup", async (req, res) => {
	try {
		const { idWorkgroup } = req.params;
		const userId = 1;
		const workgroup = await workgroupService.getWorkgroup(userId, idWorkgroup);
		res.json({ data: workgroup });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Delete workgroup
router.delete("/:idWorkgroup", async (req, res) => {
	try {
		const { idWorkgroup } = req.params;
		const userId = 1;
		const workgroup = await workgroupService.deleteWorkgroup(userId, idWorkgroup);
		res.json({ data: workgroup });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Add member to workgroup
router.put("/:idWorkgroup/member/:idMember", async (req, res) => {
	try {
		const { idWorkgroup, idMember } = req.params;
		const userId = 1;
		await workgroupService.addMember(userId, idWorkgroup, idMember);
		res.sendStatus(200);
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Delete member from workgroup
router.delete("/:idWorkgroup/member/:idMember", async (req, res) => {
	try {
		const { idWorkgroup, idMember } = req.params;
		const userId = 1;
		await workgroupService.removeMember(userId, idWorkgroup, idMember);
		res.sendStatus(200);
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

// Get all members of a workgroup
router.get("/:idWorkgroup/member", async (req, res) => {
	try {
		const { idWorkgroup } = req.params;
		const userId = 1;
		const members = await workgroupService.getAllMembers(userId, idWorkgroup);
		res.json({ data: members });
	} catch (err) {
		res.json({ error: err.name, message: err.message });
	}
});

const drive = require("./drive");
router.use("/:idWorkgroup/drive", drive);

const calendar = require("./calendar");
router.use("/:idWorkgroup/calendar", calendar);

const activity = require("./activity");
router.use("/:idWorkgroup/activity", activity);

module.exports = router;
