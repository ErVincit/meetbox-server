const pool = require("../../database");
const workgroupService = require("../services/workgroup");

exports.createEvent = async (
  title,
  description,
  timestampBegin,
  timestampEnd,
  idWorkgroup,
  userId
) => {
  if (!title)
    throw new Error("E' necessario aggiungere un titolo per creare un evento");
  if (!timestampBegin)
    throw new Error(
      "E' necessario aggiungere una data d'inizio per creare un evento"
    );
  if (!timestampEnd)
    throw new Error(
      "E' necessario aggiungere una data di fine per creare un evento"
    );
  if (title.length < 2)
    throw new Error("La lunghezza del nome inserito è inferiore a 2 caratteri");
  const datenow = new Date();
  const dateBegin = new Date(timestampBegin);
  const dateEnd = new Date(timestampEnd);
  if (dateBegin < datenow)
    throw new Error("La data d'inizio inserita è precedente alla data attuale");
  if (dateEnd < dateBegin)
    throw new Error("La data di fine inserita è precedente alla data d'inizio");
  const client = await pool.connect();
  try {
    await workgroupService.checkWorkgroupMembers([userId], idWorkgroup, userId);
    const results = await client.query(
      'INSERT INTO "Event"(title, "timestampBegin", "timestampEnd", workgroup, owner) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [title, dateBegin, dateEnd, idWorkgroup, userId]
    );
    const idEvent = results.rows[0].id;
    await client.query('INSERT INTO "UserEvent"(userid,event) VALUES ($1,$2)', [
      userId,
      idEvent,
    ]);
    if (description)
      await client.query('UPDATE "Event" SET description = $1 WHERE id = $2', [
        description,
        idEvent,
      ]);
    const getRes = await client.query('SELECT * FROM "Event" WHERE id = $1', [
      idEvent,
    ]);
    if (getRes.rowCount > 0) {
      const event = getRes.rows[0];
      const members = await this.getAllMembers(event.id, event.owner);
      event.members = members;
      client.release();
      return event;
    }
    else {
      client.release();
      return {};
    }
  } catch (err) {
    client.release();
    throw err;
  }
};

exports.deleteEvent = async (userId, eventId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM "UserEvent" WHERE userid = $1 and event = $2',
      [userId, eventId]
    );
    if (result.rowCount == 0)
      throw new Error("Non hai i permessi per modificare questo evento");
    await client.query('DELETE FROM "UserEvent" WHERE event = $1', [eventId]);
    const results = await client.query(
      'DELETE FROM "Event" WHERE id = $1 RETURNING *',
      [eventId]
    );
    client.release();
    return results.rows[0];
  } catch (err) {
    client.release();
    throw err;
  }
};

exports.updateEvent = async (
  idWorkgroup,
  userId,
  idEvent,
  title,
  description,
  timestampBegin,
  timestampEnd,
  members
) => {
  const client = await pool.connect();
  try {
    //check if the user is in the event
    const results = await pool.query(
      'SELECT * FROM "UserEvent" WHERE userid = $1 and event = $2',
      [userId, idEvent]
    );
    const resOwner = await pool.query(
      'SELECT * FROM "Event" WHERE id = $1 and owner = $2',
      [idEvent, userId]
    );
    if (results.rowCount == 0 && resOwner.rowCount == 0)
      throw new Error("Non hai i permessi per modificare questo evento");
    // check title length
    if (title) {
      if (title.length < 2)
        throw new Error(
          "il nuovo nome inserito è di lunghezza inferiore a 2 caratteri"
        );
    }
    // if i have new timestampBegin and new timestampEnd: check if new timestamp Begin < new timestampEnd
    let dateBegin;
    let dateEnd;
    if (timestampEnd && timestampBegin) {
      dateBegin = new Date(timestampBegin);
      dateEnd = new Date(timestampEnd);
      if (dateEnd < dateBegin)
        throw new Error(
          "La data di fine inserita è precedente alla data d'inizio"
        );
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
      dateBegin = new Date(timestampBegin);
      if (dateBegin < datenow)
        throw new Error(
          "La nuova data d'inizio inserita è precedente alla data attuale"
        );
      if (prevTimestampEnd) {
        const prevDateEnd = new Date(prevTimestampEnd);
        if (dateBegin > prevDateEnd)
          throw new Error(
            "La nuova data d'inizio inserita è successiva alla data di fine dell'evento"
          );
      }
    }
    //if new timestampEnd but not timestampBegin: check if prevtimestampBegin < newtimestampEnd
    if (timestampEnd && !timestampBegin) {
      dateEnd = new Date(timestampEnd);
      const prevDateBegin = new Date(prevTimestampBegin);
      if (dateEnd < prevDateBegin)
        throw new Error(
          "La nuova data di fine è precedente alla data d'inizio dell'evento"
        );
    }
    //check if member/members is/are in relation with that idWorkGroup in UserWorkGroup (so if they are allowed)
    if (members) {
      if (
        !(await workgroupService.checkWorkgroupMembers(
          members,
          idWorkgroup,
          userId
        ))
      )
        throw new Error(
          "Alcuni membri non possono essere aggiunti perchè non appartenenti a questo workgroup"
        );
    }
    if (title)
      await client.query('UPDATE "Event" SET title = $1 WHERE id = $2', [
        title,
        idEvent,
      ]);
    if (description)
      await client.query('UPDATE "Event" SET description = $1 WHERE id = $2', [
        description,
        idEvent,
      ]);
    if (timestampBegin)
      await client.query(
        'UPDATE "Event" SET "timestampBegin" = $1 WHERE id = $2',
        [dateBegin, idEvent]
      );
    if (timestampEnd)
      await client.query(
        'UPDATE "Event" SET "timestampEnd" = $1 WHERE id = $2',
        [dateEnd, idEvent]
      );
    if (members) {
      await client.query('DELETE FROM "UserEvent" WHERE event = $1', [idEvent]);
      for (const member of members)
        await client.query(
          'INSERT INTO "UserEvent" (userid, event) VALUES ($1,$2)',
          [member, idEvent]
        );
    }
    const getRes = await client.query('SELECT * FROM "Event" WHERE id = $1', [
      idEvent,
    ]);
    if (getRes.rowCount > 0) {
      const event = getRes.rows[0];
      const members = await this.getAllMembers(event.id, event.owner);
      event.members = members;
      client.release();
      return event;
    }
    else {
      client.release();
      return {};
    }
  } catch (err) {
    client.release();
    throw err;
  }
};

exports.getEvents = async (idWorkgroup, userId, from, to) => {
  const client = await pool.connect();
  try {
    let result;
    let data = [];
    if (from && !to) {
      result = await client.query(
        'SELECT * FROM "Event" WHERE workgroup = $1 AND "timestampBegin" >= $2',
        [idWorkgroup, new Date(from)]
      );
      for (const event of result.rows) {
        const members = await this.getAllMembers(event.id, event.owner);
        data.push({ ...event, members });
      }
    } else if (to && !from) {
      result = await client.query(
        'SELECT * FROM "Event" WHERE workgroup = $1 AND "timestampBegin" <= $2',
        [idWorkgroup, new Date(to)]
      );
      for (const event of result.rows) {
        const members = await this.getAllMembers(event.id);
        data.push({ ...event, members });
      }
    } else if (to && from) {
      result = await client.query(
        'SELECT * FROM "Event" WHERE workgroup = $1 AND "timestampBegin" >= $2 AND "timestampBegin" <= $3',
        [idWorkgroup, new Date(from), new Date(to)]
      );
      for (const event of result.rows) {
        const members = await this.getAllMembers(event.id);
        data.push({ ...event, members });
      }
    } else {
      result = await client.query(
        'SELECT * FROM "Event" WHERE workgroup = $1',
        [idWorkgroup]
      );
      for (const event of result.rows) {
        const members = await this.getAllMembers(event.id);
        data.push({ ...event, members });
      }
    }
    client.release();
    return data;
  } catch (err) {
    client.release();
    throw err;
  }
};

exports.getAllMembers = async (idEvent, ownerId) => {
  const client = await pool.connect();
  const members = await client.query(
    'SELECT u.* FROM "UserEvent" ue, "User" u WHERE u.id = ue.userid AND event = $1',
    [idEvent]
  );
  if (ownerId && !this.userPresent(members.rows, ownerId)) {
    const owner = await client.query('SELECT * FROM "User" WHERE id = $1', [
      ownerId,
    ]);
    if (owner.rowCount > 0) members.rows.push(owner.rows[0]);
  }
  client.release();
  return members.rows;
};


exports.userPresent = (members, ownerId) => {
  for (let i = 0; i < members.length; i++) 
    if (members[i].id == ownerId) return true;
  return false;
}