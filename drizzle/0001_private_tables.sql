-- Custom username sessions are enforced by the server, not Supabase Auth.
-- Deny all browser Data API access. The server uses the owner connection.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON users, sessions, login_limits, tasks, categories, activity FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON users, sessions, login_limits, tasks, categories, activity FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON users, sessions, login_limits, tasks, categories, activity FROM authenticated;
  END IF;
END $$;
