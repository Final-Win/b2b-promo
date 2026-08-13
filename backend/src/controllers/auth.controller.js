const bcrypt = require('bcrypt');
const usersDb = require('../db/users.db');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { EMAIL_REGEX } = require('../utils/constants');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  maxAge: 14 * 24 * 60 * 60 * 1000,
};

function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

async function signup(req, res, next) {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name || !EMAIL_REGEX.test(email)) {
      return next({ status: 400, code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' });
    }

    const existing = await usersDb.findByEmail(email);
    if (existing) {
      return next({ status: 400, code: 'DUPLICATE_EMAIL', message: '이미 가입된 이메일입니다' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await usersDb.createUser({ email, hashedPassword, name });
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const unauthorized = { status: 401, code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 올바르지 않습니다' };

    if (!email || !password) {
      return next(unauthorized);
    }

    const user = await usersDb.findByEmail(email);
    if (!user || user.status === 'WITHDRAWN') {
      return next(unauthorized);
    }

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) {
      return next(unauthorized);
    }

    const access_token = signAccessToken({ id: user.id, role: user.role });
    const refresh_token = signRefreshToken({ id: user.id, token_version: user.token_version });

    res.cookie('refresh_token', refresh_token, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ access_token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const unauthorized = { status: 401, code: 'UNAUTHORIZED', message: '인증이 필요합니다' };
    const token = req.cookies && req.cookies.refresh_token;
    if (!token) {
      return next(unauthorized);
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (err) {
      return next(unauthorized);
    }

    const user = await usersDb.findById(payload.id);
    if (!user || user.token_version !== payload.token_version) {
      return next(unauthorized);
    }

    const access_token = signAccessToken({ id: user.id, role: user.role });
    res.status(200).json({ access_token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await usersDb.incrementTokenVersion(req.user.id);
    res.clearCookie('refresh_token');
    res.status(200).end();
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await usersDb.findById(req.user.id);
    if (!user) {
      return next({ status: 401, code: 'UNAUTHORIZED', message: '인증이 필요합니다' });
    }
    res.status(200).json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
}

async function withdraw(req, res, next) {
  try {
    await usersDb.setWithdrawn(req.user.id);
    res.clearCookie('refresh_token');
    res.status(200).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, refresh, logout, me, withdraw };
