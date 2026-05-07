import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { AuthModal } from './components/AuthModal';
import { OrderForm } from './components/OrderForm';
import { SizeChart } from './components/SizeChart';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import type { Profile } from './lib/types';

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((module) => ({ default: module.AdminDashboard })),
);

function currentRoute() {
  const hash = window.location.hash.replace('#', '');
  if (hash === '/admin') return 'admin';
  if (window.location.pathname.endsWith('/admin')) return 'admin';
  return 'parent';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [route, setRoute] = useState(currentRoute());
  const [showAuth, setShowAuth] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const handleRoute = () => setRoute(currentRoute());
    window.addEventListener('hashchange', handleRoute);
    return () => window.removeEventListener('hashchange', handleRoute);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setShowAuth(!data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setShowAuth(!nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!supabase || !session?.user) {
        setProfile(null);
        return;
      }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (error) {
        setStatus(error.message);
        return;
      }
      if (!data) {
        const fallback = {
          id: session.user.id,
          email: session.user.email ?? '',
          parent_name: String(session.user.user_metadata.parent_name ?? ''),
          student_name: String(session.user.user_metadata.student_name ?? ''),
          class_group: String(session.user.user_metadata.class_group ?? ''),
          role: 'parent' as const,
        };
        await supabase.from('profiles').insert(fallback);
        setProfile(fallback);
        return;
      }
      setProfile(data as Profile);
    }
    void loadProfile();
  }, [session?.user?.id]);

  const isAdminRoute = route === 'admin';
  const userLabel = useMemo(() => profile?.parent_name || session?.user.email || 'Vizitator', [profile, session]);
  const isAuthenticated = Boolean(session);
  const canAccessAdmin = profile?.role === 'admin';

  if (!isAuthenticated) {
    return (
      <div className="auth-only-shell">
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href={`${import.meta.env.BASE_URL}`}>
          <span className="brand-mark">
            <img src={`${import.meta.env.BASE_URL}kg-logo.png`} alt="King George" />
          </span>
          <span>
            <strong>King George Uniforme</strong>
            <small>Comenzi scolare 2026-2027</small>
          </span>
        </a>
        <nav>
          <a className={!isAdminRoute ? 'active' : ''} href={`${import.meta.env.BASE_URL}`}>
            Formular
          </a>
          {canAccessAdmin && (
            <a className={isAdminRoute ? 'active' : ''} href="#/admin">
              <ShieldCheck size={16} />
              Admin
            </a>
          )}
        </nav>
        <div className="user-box">
          <span>{userLabel}</span>
          {session ? (
            <button
              className="icon-button"
              title="Iesi din cont"
              onClick={async () => {
                await supabase?.auth.signOut();
                setProfile(null);
              }}
            >
              <LogOut size={17} />
            </button>
          ) : (
            <button className="secondary-button" onClick={() => setShowAuth(true)}>
              Autentificare
            </button>
          )}
        </div>
      </header>

      {!hasSupabaseConfig && (
        <div className="global-notice">Aplicatia este in modul de configurare. Adauga cheile Supabase pentru autentificare si salvare.</div>
      )}

      {status && <div className="global-notice error">{status}</div>}

      <main className={isAdminRoute ? 'main admin-main' : 'main'}>
        {isAdminRoute ? (
          <Suspense fallback={<section className="panel admin-panel">Se incarca admin...</section>}>
            <AdminDashboard profile={profile} />
          </Suspense>
        ) : (
          <>
            <OrderForm profile={profile} />
            <aside className="side-column">
              <SizeChart />
              <section className="panel notes-panel">
                <h2>Conditii comanda</h2>
                <ol>
                  <li>Formularul este completat si semnat de Beneficiar/Parinte.</li>
                  <li>
                    <strong>Comanda se plaseaza pentru anul scolar 2026-2027 cel tarziu pana pe </strong>
                    <strong className="deadline">30 mai 2026.</strong>
                  </li>
                  <li>
                    <strong>Plata se va efectua integral in avans la data comenzii.</strong>
                  </li>
                  <li>
                    Nu pot fi returnate produse confectionate la cerere, prototip unic reprezentativ al unei institutii personalizat cu
                    inscrisurile acesteia.
                  </li>
                  <li>Prestatorul nu isi asuma o masura gresit comunicata de catre Beneficiar, conform comanda trimisa.</li>
                  <li>NU realizam inlocuiri, retusuri si modificari. Masurile sunt standard.</li>
                  <li>
                    Comanda se va realiza in urma probarii mostrelor la secretariatul institutiei sau in baza tabelului standard de masuri
                    (vezi pagina 2).
                  </li>
                  <li>Rugam sa urmariti in tabel la ce dimensiuni se incadreaza copilul dumneavoastra.</li>
                  <li>Daca OSCILATI intre doua masuri va recomandam sa alegeti masura mai mare.</li>
                  <li>
                    Recomandam, de asemenea, sa comandati cu o masura mai mare daca comanda se va plasa in vara pentru luna septembrie
                    pentru ciclul primar unde copiii sunt in crestere.
                  </li>
                </ol>
              </section>
            </aside>
          </>
        )}
      </main>

      {showAuth && !session && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
