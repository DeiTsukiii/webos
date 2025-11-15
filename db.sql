CREATE TABLE IF NOT EXISTS filesystem (
    id SERIAL PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    parent_path TEXT NOT NULL,
    type CHAR(1) NOT NULL,
    perms TEXT DEFAULT '-rw-r--r--',
    content TEXT,
    creator TEXT NOT NULL DEFAULT 'root',
    last_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (user_type IN ('admin', 'user'))
);

INSERT INTO filesystem (path, parent_path, type, perms, creator, last_update) VALUES
  ('/', 'none', 'd', 'rwxrwxr-x', 'root', NOW()),
  ('/home', '/', 'd', 'rwxrwxr-x', 'root', NOW()),
  ('/bin', '/', 'd', 'rwxrwxr-x', 'root', NOW()),
  ('/bin/ls', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/cd', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/pwd', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/cat', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/echo', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/clear', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/whoami', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/date', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/touch', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/mkdir', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/rm', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/help', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/chmod', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/cp', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/passwd', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/grep', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/wc', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/export', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/curl', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/neofetch', '/bin', '-', 'rwxr-x--x', 'root', NOW()),
  ('/bin/mv', '/bin', '-', 'rwxr-x--x', 'root', NOW());