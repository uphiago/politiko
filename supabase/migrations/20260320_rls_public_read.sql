-- Enable RLS on all tables
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestacoes_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_log ENABLE ROW LEVEL SECURITY;

-- Public read access for anonymous users (used by frontend via anon key)
CREATE POLICY IF NOT EXISTS anon_read ON partidos          FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS anon_read ON prestacoes_contas FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS anon_read ON receitas          FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS anon_read ON despesas          FOR SELECT TO anon USING (true);
