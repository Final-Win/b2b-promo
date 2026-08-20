const timeAllocationsDb = require('../db/timeAllocations.db');

async function dailySum(req, res, next) {
  try {
    const { user_id, from, to } = req.query;
    if (!user_id || !from || !to) {
      return next({ status: 400, code: 'VALIDATION_ERROR', message: 'user_id/from/to가 필요합니다' });
    }

    const result = await timeAllocationsDb.sumByAssignee(user_id, from, to);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { dailySum };
