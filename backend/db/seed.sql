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

-- ③ 성능 검증용 WBS 200건 (오늘 기준 ±4주 범위에 분산) + 일자별 시간 할당
INSERT INTO wbs (writer_id, assignee_id, title, content, start_date, end_date, status)
SELECT
  w_user.id,
  a_user.id,
  'seed WBS #' || s.n,
  'DB-2 성능 검증용 시드 데이터',
  (CURRENT_DATE - 28 + ((s.n * 3) % 56)),
  (CURRENT_DATE - 28 + ((s.n * 3) % 56)) + (1 + (s.n % 3)),
  (ARRAY['TODO', 'IN_PROGRESS', 'QA', 'RESOLVED', 'DONE'])[1 + (s.n % 5)]
FROM generate_series(1, 200) AS s(n)
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
