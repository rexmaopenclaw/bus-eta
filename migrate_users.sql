-- Migrate existing users from local busapp.db (bcrypt hashes preserved)
INSERT OR IGNORE INTO users (id, email, password, created_at) VALUES
  (1, 'test@test.com', '$2a$10$pm1DZH25dK2mIV/VC6YdT.sNDF0rV8JeQeJf1scbw2dvz/ceE3n.2', '2026-08-05 18:30:18'),
  (2, 'test2@test.com', '$2a$10$i1XhYlr3BGmrOB3804JCOuPk7fuTT9IPWqyNYroJA3q0R3cGwCdLu', '2026-08-05 18:30:35'),
  (3, 'rex.chma@gmail.com', '$2a$10$DUloqKR/nsJRpHltKaFkDOYQaTpIoab8czCwJ17hbMQrmWYpRCscO', '2026-08-05 18:59:07');
