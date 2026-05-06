import { FormEvent, useState } from 'react';
import { LockKeyhole, Mail, UserPlus } from 'lucide-react';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

type AuthModalProps = {
  onClose?: () => void;
};

export function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [parentName, setParentName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!supabase) {
      setMessage('Configureaza Supabase in public/config.js pentru conturi reale si salvare in baza de date.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose?.();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            parent_name: parentName,
            student_name: studentName,
            class_group: classGroup,
          },
        },
      });
      if (error) throw error;

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          parent_name: parentName,
          student_name: studentName,
          class_group: classGroup,
          role: 'parent',
        });
      }

      setMessage(data.session ? 'Cont creat. Formularul este pregatit.' : 'Cont creat. Verifica emailul daca Supabase cere confirmare.');
      if (data.session) onClose?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Autentificarea a esuat.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="auth-modal" onSubmit={submit}>
        <div className="modal-icon">
          {mode === 'register' ? <UserPlus size={22} /> : <LockKeyhole size={22} />}
        </div>
        <h2>{mode === 'register' ? 'Creeaza cont parinte' : 'Autentificare parinte'}</h2>
        <p>
          {mode === 'register'
            ? 'Introdu datele elevului si ale reprezentantului legal pentru comanda.'
            : 'Intra in cont pentru a continua formularul de comanda.'}
        </p>

        {!hasSupabaseConfig && (
          <div className="notice warning">
            Aplicatia nu este conectata inca la baza de date. Completeaza `public/config.js` cu datele Supabase sau foloseste
            temporar modul local pentru test PDF.
          </div>
        )}

        <label>
          Email
          <span className="input-with-icon">
            <Mail size={16} />
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </span>
        </label>
        <label>
          Parola
          <input type="password" value={password} minLength={6} onChange={(event) => setPassword(event.target.value)} required />
        </label>

        {mode === 'register' && (
          <>
            <label>
              Nume si prenume elev
              <input value={studentName} onChange={(event) => setStudentName(event.target.value)} required />
            </label>
            <label>
              Clasa/Grupa (an scolar 2025-2026)
              <input value={classGroup} onChange={(event) => setClassGroup(event.target.value)} required />
            </label>
            <label>
              Parinte / Reprezentant legal
              <input value={parentName} onChange={(event) => setParentName(event.target.value)} required />
            </label>
          </>
        )}

        {message && <div className="notice">{message}</div>}

        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? 'Se proceseaza...' : mode === 'register' ? 'Creeaza cont' : 'Intra in cont'}
        </button>
        {!hasSupabaseConfig && (
          <button className="secondary-button full-button" type="button" onClick={onClose}>
            Continua local
          </button>
        )}
        <button className="text-button" type="button" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
          {mode === 'register' ? 'Am deja cont' : 'Creeaza cont nou'}
        </button>
      </form>
    </div>
  );
}
