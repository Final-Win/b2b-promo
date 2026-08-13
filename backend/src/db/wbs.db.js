const pool = require('./pool');

const SELECT_WITH_NAMES = `
  SELECT wbs.id, wbs.writer_id, wbs.assignee_id, wbs.title, wbs.content,
         wbs.start_date, wbs.end_date, wbs.status,
         w.name AS writer_name, w.status AS writer_status,
         a.name AS assignee_name, a.status AS assignee_status
  FROM wbs
  JOIN users w ON w.id = wbs.writer_id
  JOIN users a ON a.id = wbs.assignee_id
`;

async function findRaw(id) {
  const { rows } = await pool.query('SELECT * FROM wbs WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findWithNames(id) {
  const { rows } = await pool.query(`${SELECT_WITH_NAMES} WHERE wbs.id = $1`, [id]);
  return rows[0] || null;
}

async function listByRange(from, to, status) {
  const params = [from, to];
  let where = 'WHERE wbs.start_date <= $2 AND wbs.end_date >= $1';
  if (status) {
    params.push(status);
    where += ` AND wbs.status = $${params.length}`;
  }
  const { rows } = await pool.query(`${SELECT_WITH_NAMES} ${where}`, params);
  return rows;
}

async function listMine(writerId, status) {
  const params = [writerId];
  let where = 'WHERE wbs.writer_id = $1';
  if (status) {
    params.push(status);
    where += ` AND wbs.status = $${params.length}`;
  }
  const { rows } = await pool.query(`${SELECT_WITH_NAMES} ${where}`, params);
  return rows;
}

async function insert(client, { writerId, assigneeId, title, content, startDate, endDate }) {
  const { rows } = await client.query(
    `INSERT INTO wbs (writer_id, assignee_id, title, content, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [writerId, assigneeId, title, content, startDate, endDate]
  );
  return rows[0].id;
}

async function update(client, { id, assigneeId, title, content, startDate, endDate, status }) {
  await client.query(
    `UPDATE wbs
     SET assignee_id = $2, title = $3, content = $4, start_date = $5, end_date = $6, status = $7, updated_at = now()
     WHERE id = $1`,
    [id, assigneeId, title, content, startDate, endDate, status]
  );
}

async function deleteById(id) {
  await pool.query('DELETE FROM wbs WHERE id = $1', [id]);
}

module.exports = { findRaw, findWithNames, listByRange, listMine, insert, update, deleteById };
