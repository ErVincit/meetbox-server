// Route: /api/calendar/*
const express = require("express");
const app = express();

const calendarService = require("../services/calendar");

app.post("/event", async (req, res) => {
  const idWorkgroup = 1;
  const { title, description, timestampBegin, timestampEnd } = req.body;
  if (title.length < 2)
    return res.status(500).send({
      error: "ParamsError",
      message: "The name parameter's length is less than 2",
    });
  const datenow = new Date();
  const dateBegin = new Date(timestampBegin);
  const dateEnd = new Date(timestampEnd);
  if (dateBegin < datenow)
    return res.status(500).send({
      error: "ParamsError",
      message: "The start date precedes the actual date",
    });
  if (dateEnd < dateBegin)
    return res.status(500).send({
      error: "ParamsError",
      message: "The end date precedes the start date",
    });
  const id = await calendarService.createEvent(
    title,
    description,
    timestampBegin,
    timestampEnd,
    idWorkgroup
  );
  return res.send({ id, title, description, timestampBegin, timestampEnd });
});

module.exports = app;
