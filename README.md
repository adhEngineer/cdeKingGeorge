# King George Uniforme

Aplicatie web pentru comenzile de uniforme scolare 2025-2026.

## Dezvoltare locala

1. Instaleaza dependintele:

```bash
npm install
```

2. Creeaza `.env` dupa `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

3. Ruleaza aplicatia:

```bash
npm run dev
```

## Supabase

1. Creeaza un proiect Supabase.
2. Ruleaza SQL-ul din `supabase/schema.sql`.
3. In Authentication, activeaza email + password. Pentru flux rapid fara confirmare, dezactiveaza temporar email confirmations sau configureaza redirect URL catre GitHub Pages.
4. Creeaza primul admin:

```sql
update public.profiles
set role = 'admin'
where email = 'adresa-ta@email.ro';
```

## GitHub Pages

Adauga in repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Pentru deploy fara GitHub Actions, ruleaza `npm run build`, apoi seteaza GitHub Pages la `Deploy from a branch`, branch `main`, folder `/docs`.

Pentru deploy automat, adauga un GitHub Actions workflow care ruleaza `npm ci` si `npm run build`, apoi publica folderul `docs` pe GitHub Pages. Daca folosesti un Personal Access Token pentru push, acesta trebuie sa aiba scope `workflow` ca sa poata urca fisiere in `.github/workflows`.

Aplicatia admin este disponibila la `#/admin`.
