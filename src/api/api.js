const express = require("express");
const router = express.Router();

const login = require("./controllers/login");
router.use("/login", login);

const workgroup = require("./controllers/workgroup");
router.use("/workgroup", workgroup);

module.exports = router;
