const express = require("express");
const router = express.Router();

const workgroupService = require("../services/workgroup");

// Get all the workgroups
router.get("/", async (req, res) => {
	const userId = 1;
	const workgroups = await workgroupService.getAllWorkgroups(userId);
	res.json({ data: workgroups });
});

// Get specific workgroup
router.get("/:idWorkgroup", async (req, res) => {
	const { idWorkgroup } = req.params;
	const userId = 1;
	const workgroup = await workgroupService.getWorkgroup(userId, idWorkgroup);
	res.json({ data: workgroup });
});

const drive = require("./drive");
router.use("/:idWorkgroup/drive", drive);

const calendar = require("./calendar");
router.use("/:idWorkgroup/calendar", calendar);

const activity = require("./activity");
router.use("/:idWorkgroup/activity", activity);

module.exports = router;
