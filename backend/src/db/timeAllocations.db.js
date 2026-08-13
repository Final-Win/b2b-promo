const pool = require('./pool');

async function listByWbsId(wbsId) {
  const { rows } = await pool.query(
    'SELECT work_date, hours FROM time_allocations WHERE wbs_id = $1 ORDER BY work_date',
    [wbsId]
  );
  return rows;
}

async function listByWbsIds(wbsIds) {
  const { rows } = await pool.query(
    `SELECT wbs_id, work_date, hours FROM time_allocations
     WHERE wbs_id = ANY($1::bigint[]) ORDER BY wbs_id, work_date`,
    [wbsIds]
  );
  return rows;
}

async function deleteByWbsId(client, wbsId) {
  await client.query('DELETE FROM time_allocations WHERE wbs_id = $1', [wbsId]);
}

async function insertMany(client, wbsId, allocations) {
  if (!allocations || allocations.length === 0) {
    return;
  }
  for (const allocation of allocations) {
    await client.query(
      'INSERT INTO time_allocations (wbs_id, work_date, hours) VALUES ($1, $2, $3)',
      [wbsId, allocation.work_date, allocation.hours]
    );
  }
}

module.exports = { listByWbsId, listByWbsIds, deleteByWbsId, insertMany };
