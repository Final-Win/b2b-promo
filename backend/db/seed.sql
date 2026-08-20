-- Team WBS 시드 데이터
-- 근거: docs/8-plan.md DB-2
-- 반복 실행 가능(ON CONFLICT / NOT EXISTS 가드). 모든 계정 비밀번호: password123

-- ① 관리자 계정 1건
INSERT INTO users (email, password, name, role)
VALUES ('admin@teamwbs.local', '$2b$10$wA6VCRzcmuD/0MxlgjDhL.pCP3E78nwGb8WG3GjOzuEiam.qBDZSq', '관리자', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- ② 일반 회원 3건
INSERT INTO users (email, password, name)
VALUES
  ('alice@teamwbs.local', '$2b$10$wA6VCRzcmuD/0MxlgjDhL.pCP3E78nwGb8WG3GjOzuEiam.qBDZSq', '앨리스'),
  ('bob@teamwbs.local',   '$2b$10$wA6VCRzcmuD/0MxlgjDhL.pCP3E78nwGb8WG3GjOzuEiam.qBDZSq', '밥'),
  ('carol@teamwbs.local', '$2b$10$wA6VCRzcmuD/0MxlgjDhL.pCP3E78nwGb8WG3GjOzuEiam.qBDZSq', '캐롤')
ON CONFLICT (email) DO NOTHING;

-- ③ 데모용 WBS 1건(캘린더 화면에 예시 막대 하나만 노출)
-- QA-1 성능 검증(5주 조회 1초 이내, 200건 기준)이 필요할 때는 이 범위(1)를
-- 임시로 늘려서 별도로 검증하고, 검증 후 다시 1로 되돌린다.
INSERT INTO wbs (writer_id, assignee_id, title, content, start_date, end_date, status)
SELECT
  w_user.id,
  a_user.id,
  'seed WBS #' || s.n,
  'DB-2 데모용 시드 데이터',
  (CURRENT_DATE - 28 + ((s.n * 3) % 56)),
  (CURRENT_DATE - 28 + ((s.n * 3) % 56)) + (1 + (s.n % 3)),
  (ARRAY['TODO', 'IN_PROGRESS', 'QA', 'RESOLVED', 'DONE'])[1 + (s.n % 5)]
FROM generate_series(1, 1) AS s(n)
JOIN LATERAL (
  SELECT id FROM users WHERE role = 'USER' ORDER BY id OFFSET (s.n % 3) LIMIT 1
) AS w_user ON true
JOIN LATERAL (
  SELECT id FROM users WHERE role = 'USER' ORDER BY id OFFSET ((s.n + 1) % 3) LIMIT 1
) AS a_user ON true
WHERE NOT EXISTS (
  SELECT 1 FROM wbs WHERE title = 'seed WBS #' || s.n
);

INSERT INTO time_allocations (wbs_id, work_date, hours)
SELECT w.id, gs.work_date, 1 + (w.id % 4)
FROM wbs w
CROSS JOIN LATERAL generate_series(w.start_date, w.end_date, interval '1 day') AS gs(work_date)
WHERE w.title LIKE 'seed WBS #%'
ON CONFLICT (wbs_id, work_date) DO NOTHING;
