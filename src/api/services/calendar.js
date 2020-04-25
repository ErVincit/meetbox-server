const pool = require("../../database");

exports.createEvent = async (
  title,
  description,
  timestampBegin,
  timestampEnd,
  idWorkgroup
) => {
  const client = await pool.connect();
  const results = await client.query(
    'INSERT INTO "Event"(title, "timestampBegin", workgroup) VALUES ($1, $2, $3) RETURNING id',
    [title, timestampBegin, idWorkgroup]
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
