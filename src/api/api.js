const express = require("express");
const app = express();

const login = require("./controllers/login");
app.use("/login", login);

const calendar = require("./controllers/calendar");
app.use("/calendar", calendar);

module.exports = app;
