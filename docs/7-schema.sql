-- Team WBS 스키마 (PostgreSQL 17)
-- 근거: docs/7-erd.md, docs/1-domain-definition.md

CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    email          VARCHAR(100) NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,
    name           VARCHAR(50) NOT NULL,
    role           VARCHAR(20) NOT NULL DEFAULT 'USER'
                   CHECK (role IN ('ADMIN', 'USER')),
    status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE', 'WITHDRAWN')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    withdrawn_at   TIMESTAMPTZ,
    token_version  INT NOT NULL DEFAULT 0
);

CREATE TABLE wbs (
    id            BIGSERIAL PRIMARY KEY,
    writer_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assignee_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title         VARCHAR(200) NOT NULL,
    content       TEXT,
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'TODO'
                  CHECK (status IN ('TODO', 'IN_PROGRESS', 'QA', 'RESOLVED', 'DONE')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

CREATE TABLE time_allocations (
    id         BIGSERIAL PRIMARY KEY,
    wbs_id     BIGINT NOT NULL REFERENCES wbs(id) ON DELETE CASCADE,
    work_date  DATE NOT NULL,
    hours      SMALLINT NOT NULL CHECK (hours BETWEEN 1 AND 8),
    UNIQUE (wbs_id, work_date)
);

-- 권한 필터링(본인 글 여부) / 내 WBS관리 탭 조회 대응
CREATE INDEX idx_wbs_writer ON wbs (writer_id);
CREATE INDEX idx_wbs_assignee ON wbs (assignee_id);

-- 캘린더 조회(5주치) 1초 이내 응답 대응
CREATE INDEX idx_wbs_date_range ON wbs (start_date, end_date);
CREATE INDEX idx_time_allocations_wbs_date ON time_allocations (wbs_id, work_date);

-- 회원별 일자 합계(8시간 초과 경고, daily-sum 조회) 대응 — 날짜로 먼저 필터 후 wbs join
CREATE INDEX idx_time_allocations_date ON time_allocations (work_date);

-- wbs.updated_at 자동 갱신 (앱에서 매 UPDATE마다 명시할 필요 없도록)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wbs_updated_at
    BEFORE UPDATE ON wbs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
