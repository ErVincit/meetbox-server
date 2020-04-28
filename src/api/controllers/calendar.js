// Route: /api/calendar/*
const express = require("express");
const app = express.Router({ mergeParams: true });

const calendarService = require("../services/calendar");
const workgroupService = require("../services/workgroup");
const pool = require("../../database");
app.post("/event", async (req, res) => {
  const workgroup = parseInt(req.params.idWorkgroup);
  const { title, description, timestampBegin, timestampEnd } = req.body;
  if (title.length < 2)
    return res.status(500).send({
      error: "ParamsError",
      message: "La lunghezza del nome inserito è inferiore a 2 caratteri",
    });
  const datenow = new Date();
  const dateBegin = new Date(timestampBegin);
  if (dateBegin < datenow)
    return res.status(500).send({
      error: "ParamsError",
      message: "La data d'inizio inserita è precedente alla data attuale",
    });
  if (timestampEnd) {
    const dateEnd = new Date(timestampEnd);
    if (dateEnd < dateBegin)
      return res.status(500).send({
        error: "ParamsError",
        message: "La data di fine inserita è precedente alla data d'inizio",
      });
  }
  const id = await calendarService.createEvent(
    title,
    description,
    dateBegin,
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
  const results = await pool.query(
    'SELECT * FROM "UserEvent" WHERE userid = $1 and event = $2',
    [userId, idEvent]
  );
  if (results.rowCount == 0)
    return res.status(500).send({
      message: "Non hai i permessi per modificare questo evento",
    });
  const event = await calendarService.deleteEvent(userId, idEvent);
  return res.json({ data: event });
});

app.put("/event/:idEvent", async (req, res) => {
  const { idWorkgroup, idEvent } = req.params;
  const {
    title,
    description,
    timestampBegin,
    timestampEnd,
    members,
  } = req.body;
  const userId = req.currentUser;
  const client = await pool.connect();
  //check if the user is in the event
  const results = await pool.query(
    'SELECT * FROM "UserEvent" WHERE userid = $1 and event = $2',
    [userId, idEvent]
  );
  if (results.rowCount == 0)
    return res.status(500).send({
      message: "Non hai i permessi per modificare questo evento",
    });
  // check title length
  if (title) {
    if (title.length < 2)
      return res.status(500).send({
        error: "ParamsError",
        message:
          "il nuovo nome inserito è di lunghezza inferiore a 2 caratteri",
      });
  }
  // if i have new timestampBegin and new timestampEnd: check if new timestamp Begin < new timestampEnd
  if (timestampEnd && timestampBegin) {
    const dateBegin = new Date(timestampBegin);
    const dateEnd = new Date(timestampEnd);
    if (dateEnd < dateBegin) {
      return res.status(500).send({
        error: "ParamsError",
        message: "La data di fine inserita è precedente alla data d'inizio",
      });
    }
  }
  //get the previous data related to that idEvent
  const previousVersion = await client.query(
    'SELECT "timestampBegin","timestampEnd" FROM "Event" WHERE id = $1',
    [idEvent]
  );
  const prevTimestampBegin = previousVersion.rows[0].timestampBegin;
  const prevTimestampEnd = previousVersion.rows[0].timestampEnd;
  //if new timestampBegin but not timestampEnd: check if newtimestampBegin < prevtimestampEnd and if > datenow
  if (timestampBegin && !timestampEnd) {
    const datenow = new Date();
    const dateBegin = new Date(timestampBegin);
    if (dateBegin < datenow)
      return res.status(500).send({
        error: "ParamsError",
        message:
          "La nuova data d'inizio inserita è precedente alla data attuale",
      });
    if (prevTimestampEnd) {
      const prevDateEnd = new Date(prevTimestampEnd);
      if (dateBegin > prevDateEnd)
        return res.status(500).send({
          error: "ParamsError",
          message:
            "La nuova data d'inizio inserita è precedente alla data di fine dell'evento",
        });
    }
  }
  //if new timestampEnd but not timestampBegin: check if prevtimestampBegin < newtimestampEnd
  if (timestampEnd && !timestampBegin) {
    const dateEnd = new Date(timestampEnd);
    const prevDateBegin = new Date(prevTimestampBegin);
    if (dateEnd < prevDateBegin)
      return res.status(500).send({
        error: "ParamsError",
        message:
          "La nuova data di fine è precedente alla data d'inizio dell'evento",
      });
  }
  //check if member/members is/are in relation with that idWorkGroup in UserWorkGroup (so if they are allowed)
  if (members) {
    if (!(await workgroupService.checkIfMembersInWorkgroup()))
      throw new Error(
        "Alcuni membri non possono essere aggiunti perchè non appartenenti a questo workgroup"
      );
  }
  await calendarService.updateEvent(
    idEvent,
    title,
    description,
    timestampBegin,
    timestampEnd,
    members
  );
  res.sendStatus(200);
});

module.exports = app;
