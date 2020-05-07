// Route: /api/calendar/*
const express = require("express");
const app = express.Router({ mergeParams: true });

const calendarService = require("../services/calendar");
const pool = require("../../database");

app.post("/event", async (req, res) => {
  try {
    const idWorkgroup = req.params.idWorkgroup;
    const { title, description, timestampBegin, timestampEnd } = req.body;
    const id = await calendarService.createEvent(
      title,
      description,
      timestampBegin,
      timestampEnd,
      idWorkgroup,
      req.currentUser
    );
    res.send({
      id,
      title,
      description,
      timestampBegin,
      timestampEnd,
      idWorkgroup,
    });
  } catch (err) {
    res.send({ error: err.name, message: err.message });
  }
});

app.delete("/event/:idEvent", async (req, res) => {
  try {
    const idEvent = req.params.idEvent;
    const userId = req.currentUser;
    const event = await calendarService.deleteEvent(userId, idEvent);
    return res.json({ data: event });
  } catch (err) {
    res.send({ error: err.name, message: err.message });
  }
});

app.put("/event/:idEvent", async (req, res) => {
  try {
    const { idWorkgroup, idEvent } = req.params;
    const {
      title,
      description,
      timestampBegin,
      timestampEnd,
      members,
    } = req.body;
    const userId = req.currentUser;
    const modifiedEvent = await calendarService.updateEvent(
      idWorkgroup,
      userId,
      idEvent,
      title,
      description,
      timestampBegin,
      timestampEnd,
      members
    );
    res.send({data: modifiedEvent}).status(200);
  } catch (err) {
    res.send({ error: err.name, message: err.message }).status(400);
  }
});

app.get("/events", async (req, res) => {
  try {
    const idWorkgroup = req.params.idWorkgroup;
    const { from, to } = req.query;
    const events = await calendarService.getEvents(idWorkgroup, from, to);
    return res.json({ data: events });
  } catch (err) {
    res.send({ error: err.name, message: err.message });
  }
});

module.exports = app;
