const pool = require('./pool');

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  // 비밀번호 해시가 필요 없는 조회(me, refresh)에만 쓰이므로 password는 제외한다.
  const { rows } = await pool.query(
    'SELECT id, email, name, role, status, token_version FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function createUser({ email, hashedPassword, name }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, role`,
    [email, hashedPassword, name]
  );
  return rows[0];
}

async function incrementTokenVersion(id) {
  await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [id]);
}

async function setWithdrawn(id) {
  await pool.query(
    `UPDATE users
     SET status = 'WITHDRAWN', withdrawn_at = now(), token_version = token_version + 1
     WHERE id = $1`,
    [id]
  );
}

async function listUsers() {
  const { rows } = await pool.query('SELECT id, name, status FROM users');
  return rows;
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  incrementTokenVersion,
  setWithdrawn,
  listUsers,
};
