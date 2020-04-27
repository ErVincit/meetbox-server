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
  if (description)
    await client.query('UPDATE "Event" SET description = $1 WHERE id = $2', [
      description,
      idEvent,
    ]);
  if (timestampEnd)
    await client.query(
      'UPDATE "Event" SET "timestampEnd" = $1 WHERE id = $2 ',
      [timestampEnd, idEvent]
    );
  client.release();
  return idEvent;
};

exports.deleteEvent = async (userId, eventId) => {
  const client = await pool.connect();
  await client.query(
    'DELETE FROM "UserEvent" WHERE userid = $1 AND event = $2',
    [userId, eventId]
  );
  const results = await client.query(
    'DELETE FROM "Event" WHERE id = $1 RETURNING *',
    [eventId]
  );
  client.release();
  return results.rows[0];
};
