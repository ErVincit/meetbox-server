// Route: /api/calendar/*
const express = require("express");
const app = express.Router({ mergeParams: true });

const calendarService = require("../services/calendar");
const pool = require("../../database");

app.post("/event", async (req, res) => {
  const workgroup = parseInt(req.params.idWorkgroup);
  const { title, description, timestampBegin, timestampEnd } = req.body;
  if (title.length < 2)
    return res.status(500).send({
      error: "ParamsError",
      message: "The name parameter's length is less than 2",
    });
  const datenow = new Date();
  const dateBegin = new Date(timestampBegin);
  if (dateBegin < datenow)
    return res.status(500).send({
      error: "ParamsError",
      message: "The start date precedes the actual date",
    });
  if (timestampEnd) {
    const dateEnd = new Date(timestampEnd);
    if (dateEnd < dateBegin)
      return res.status(500).send({
        error: "ParamsError",
        message: "The end date precedes the start date",
      });
  }
  const id = await calendarService.createEvent(
    title,
    description,
    timestampBegin,
    timestampEnd,
    workgroup,
    req.currentUser
  );
  return res.send({
    id,
    title,
    description,
    timestampBegin,
    timestampEnd,
    workgroup,
  });
});

app.delete("/event/:idEvent", async (req, res) => {
  const idEvent = req.params.idEvent;
  const userId = req.currentUser;
  const results = await pool.query('SELECT owner FROM "Event" WHERE id = $1', [
    idEvent,
  ]);
  const ownerEvent = results.rows[0].owner;
  if (userId != ownerEvent)
    return res.status(500).send({
      message: "Only the owner can modify the event",
    });
  const event = await calendarService.deleteEvent(userId, idEvent);
  return res.json({ data: event });
});
module.exports = app;
