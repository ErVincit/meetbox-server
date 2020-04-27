const pool = require("../../database");

exports.createEvent = async (
  title,
  description,
  timestampBegin,
  timestampEnd,
  idWorkgroup,
  userId
) => {
  const client = await pool.connect();
  const results = await client.query(
    'INSERT INTO "Event"(title, "timestampBegin", workgroup, owner) VALUES ($1, $2, $3, $4) RETURNING id',
    [title, timestampBegin, idWorkgroup, userId]
  );
  const idEvent = results.rows[0].id;
  await client.query('INSERT INTO "UserEvent" VALUES ($1,$2)', [
    userId,
    idEvent,
  ]);
  if (description)
    await client.query('UPDATE "Event" SET description = $1 WHERE id = $2', [
      description,
      idEvent,
    ]);
  if (timestampEnd)
    await client.query(
      'UPDATE "Event" SET "timestampEnd" = $1 WHERE id = $2;',
      [timestampEnd, idEvent]
    );
  client.release();
  return idEvent;
};

exports.deleteEvent = async (userId, eventId) => {
  const client = await pool.connect();
  await client.query('DELETE FROM "UserEvent" WHERE event = $1', [eventId]);
  const results = await client.query(
    'DELETE FROM "Event" WHERE id = $1 RETURNING *',
    [eventId]
  );
  client.release();
  return results.rows[0];
};

exports.updateEvent = async (
  idEvent,
  title,
  description,
  timestampBegin,
  timestampEnd,
  members
) => {
  const client = await pool.connect();
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
      [timestampBegin, idEvent]
    );
  if (timestampEnd)
    await client.query('UPDATE "Event" SET "timestampEnd" = $1 WHERE id = $2', [
      timestampEnd,
      idEvent,
    ]);
  if (members) {
    await client.query('DELETE FROM "UserEvent" WHERE event = $1', [idEvent]);
    for (const member of members)
      await client.query(
        'INSERT INTO "UserEvent" (userid, event) VALUES ($1,$2)',
        [userId, idEvent]
      );
  }
};
