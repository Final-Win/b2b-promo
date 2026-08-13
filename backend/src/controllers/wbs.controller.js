const { withTransaction } = require('../db/tx');
const wbsDb = require('../db/wbs.db');
const timeAllocationsDb = require('../db/timeAllocations.db');
const { WBS_STATUSES } = require('../utils/constants');

function validateBody(body) {
  const { assignee_id, title, content, start_date, end_date, time_allocations } = body || {};

  // content는 nullable(값 존재 여부를 검증하지 않음)
  if (!assignee_id || !title || !start_date || !end_date || !Array.isArray(time_allocations)) {
    return '입력값이 올바르지 않습니다';
  }

  const start = new Date(start_date);
  const end = new Date(end_date);
  if (end < start) {
    return 'end_date는 start_date 이후여야 합니다';
  }

  if (time_allocations) {
    for (const allocation of time_allocations) {
      const workDate = new Date(allocation.work_date);
      if (workDate < start || workDate > end) {
        return 'time_allocations의 work_date는 start_date~end_date 범위 내여야 합니다';
      }
    }
  }

  return null;
}

async function list(req, res, next) {
  try {
    const { from, to, mine, status } = req.query;

    let items;
    if (mine === 'true') {
      items = await wbsDb.listMine(req.user.id, status);
    } else {
      if (!from || !to) {
        return next({ status: 400, code: 'VALIDATION_ERROR', message: 'from/to 또는 mine이 필요합니다' });
      }
      items = await wbsDb.listByRange(from, to, status);
    }

    const ids = items.map((item) => item.id);
    const allocations = ids.length > 0 ? await timeAllocationsDb.listByWbsIds(ids) : [];
    const grouped = {};
    for (const allocation of allocations) {
      if (!grouped[allocation.wbs_id]) {
        grouped[allocation.wbs_id] = [];
      }
      grouped[allocation.wbs_id].push({ work_date: allocation.work_date, hours: allocation.hours });
    }

    const result = items.map((item) => ({ ...item, time_allocations: grouped[item.id] || [] }));
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const wbs = await wbsDb.findWithNames(req.params.id);
    if (!wbs) {
      return next({ status: 404, code: 'NOT_FOUND', message: '존재하지 않는 WBS입니다' });
    }
    const time_allocations = await timeAllocationsDb.listByWbsId(req.params.id);
    res.status(200).json({ ...wbs, time_allocations });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const error = validateBody(req.body);
    if (error) {
      return next({ status: 400, code: 'VALIDATION_ERROR', message: error });
    }

    const { assignee_id, title, content, start_date, end_date, time_allocations } = req.body;

    const id = await withTransaction(async (client) => {
      const newId = await wbsDb.insert(client, {
        writerId: req.user.id,
        assigneeId: assignee_id,
        title,
        content,
        startDate: start_date,
        endDate: end_date,
      });
      await timeAllocationsDb.insertMany(client, newId, time_allocations);
      return newId;
    });

    const wbs = await wbsDb.findWithNames(id);
    const allocations = await timeAllocationsDb.listByWbsId(id);
    res.status(200).json({ ...wbs, time_allocations: allocations });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const existing = await wbsDb.findRaw(req.params.id);
    if (!existing) {
      return next({ status: 404, code: 'NOT_FOUND', message: '존재하지 않는 WBS입니다' });
    }
    if (existing.writer_id !== req.user.id) {
      return next({ status: 403, code: 'FORBIDDEN', message: '권한이 없습니다' });
    }

    const error = validateBody(req.body);
    if (error) {
      return next({ status: 400, code: 'VALIDATION_ERROR', message: error });
    }

    const { assignee_id, title, content, start_date, end_date, status, time_allocations } = req.body;
    if (!WBS_STATUSES.includes(status)) {
      return next({ status: 400, code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' });
    }

    const id = req.params.id;
    await withTransaction(async (client) => {
      await wbsDb.update(client, {
        id,
        assigneeId: assignee_id,
        title,
        content,
        startDate: start_date,
        endDate: end_date,
        status,
      });
      await timeAllocationsDb.deleteByWbsId(client, id);
      await timeAllocationsDb.insertMany(client, id, time_allocations);
    });

    const wbs = await wbsDb.findWithNames(id);
    const allocations = await timeAllocationsDb.listByWbsId(id);
    res.status(200).json({ ...wbs, time_allocations: allocations });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const existing = await wbsDb.findRaw(req.params.id);
    if (!existing) {
      return next({ status: 404, code: 'NOT_FOUND', message: '존재하지 않는 WBS입니다' });
    }
    if (existing.writer_id !== req.user.id) {
      return next({ status: 403, code: 'FORBIDDEN', message: '권한이 없습니다' });
    }

    await wbsDb.deleteById(req.params.id);
    res.status(200).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
