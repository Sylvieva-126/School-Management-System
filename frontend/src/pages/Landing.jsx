import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiUserCheck, FiBookOpen, FiDollarSign, FiCalendar,
  FiFileText, FiShield, FiLock, FiEyeOff, FiClipboard, FiArrowRight,
  FiCheckCircle, FiSun, FiMoon
} from 'react-icons/fi';

// Fade-up-on-scroll wrapper — reveals children when they enter the viewport.
// IntersectionObserver: no scroll listeners, no perf cost. Sticks after reveal.
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`
    }}>
      {children}
    </div>
  );
}

// Landing-specific theme toggle — styled for the navy nav (visible in both themes).
// Same localStorage key as the portal, so a visitor's choice carries into the app.
function LandingThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setDark(next);
  };

  return (
    <button onClick={toggle} aria-label="Toggle theme"
            style={{
              width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#F2F6FA', fontSize: 16
            }}>
      {dark ? <FiSun /> : <FiMoon />}
    </button>
  );
}

export default function Landing() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ============ NAV ============ */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.1rem 2rem', background: 'var(--sidebar)', color: '#F2F6FA'
      }}>
        <div style={{ fontWeight: 700, fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.1rem' }}>
          School<span style={{ color: 'var(--accent)' }}>Suite</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LandingThemeToggle />
          <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}>
            Log in
          </Link>
        </div>
      </nav>

      {/* ============ 1. HERO (navy band) — staggered entrance ============ */}
      <header style={{
        background: 'var(--sidebar)', color: '#F2F6FA',
        padding: '4.5rem 2rem 4rem', textAlign: 'center'
      }}>
        <Reveal>
          <div className="section-label" style={{ color: 'var(--accent)', marginBottom: '0.9rem' }}>
            School Management Platform
          </div>
        </Reveal>
        <Reveal delay={120}>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.15,
            maxWidth: '720px', margin: '0 auto 1.1rem', color: '#FFFFFF'
          }}>
            Run your entire school from one portal.
          </h1>
        </Reveal>
        <Reveal delay={240}>
          <p style={{
            maxWidth: '560px', margin: '0 auto 2rem',
            color: 'rgba(242,246,250,0.75)', fontSize: '1.05rem'
          }}>
            Admission, fees, attendance, timetable and results —
            with parents notified automatically at every step.
          </p>
        </Reveal>
        <Reveal delay={360}>
          <Link to="/login" className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                         textDecoration: 'none', padding: '0.75rem 1.6rem', fontSize: '1rem' }}>
            Log in to your portal <FiArrowRight />
          </Link>
        </Reveal>
        <Reveal delay={480}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '2.5rem' }}>
            {['Administrators', 'Teachers', 'Students', 'Parents'].map(r => (
              <span key={r} style={{
                border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999,
                padding: '0.35rem 1rem', fontSize: '0.85rem', color: 'rgba(242,246,250,0.85)'
              }}>{r}</span>
            ))}
          </div>
        </Reveal>
      </header>

      {/* ============ 2. FEATURES (3×2 grid) ============ */}
      <section style={{ maxWidth: '1050px', margin: '0 auto', padding: '3.5rem 1.5rem' }}>
        <Reveal>
          <h2 className="section-label" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            What the platform handles
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.1rem' }}>
            {[
              { icon: <FiUsers />, title: 'Admissions & records',
                body: 'Auto-generated admission numbers, parent accounts, and first-day invoices — in one step.' },
              { icon: <FiDollarSign />, title: 'Fees & debtors',
                body: 'Immutable fee structures per class and term. Payments tracked, balances live, debtors list with reminders.' },
              { icon: <FiCalendar />, title: 'Attendance & alerts',
                body: 'Class teachers mark daily attendance. Parents are notified automatically when a child is absent.' },
              { icon: <FiBookOpen />, title: 'Timetable & exams',
                body: 'Clash-free scheduling and exam records, scoped to each teacher\u2019s own subjects and classes.' },
              { icon: <FiFileText />, title: 'Report card pipeline',
                body: 'Teachers upload, administrators review and publish, families download — role-checked end to end.' },
              { icon: <FiClipboard />, title: 'Sessions & terms',
                body: 'Three terms per session. Closing a term locks attendance and exams while fees stay open.' },
            ].map(f => (
              <div key={f.title} className="card" style={{ marginBottom: 0 }}>
                <div style={{ color: 'var(--primary)', marginBottom: '0.55rem', display: 'flex' }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.02rem', marginBottom: '0.4rem' }}>{f.title}</h3>
                <p className="text-muted" style={{ fontSize: '0.88rem', marginBottom: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ 3. PIPELINE (4 steps) ============ */}
      <section style={{ background: 'var(--surface-2)', padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Reveal>
            <h2 className="section-label" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              The report card pipeline
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
              {[
                { step: '1', who: 'Teacher', what: 'Uploads the report card' },
                { step: '2', who: 'Administrator', what: 'Reviews and publishes' },
                { step: '3', who: 'System', what: 'Notifies student and parents' },
                { step: '4', who: 'Family', what: 'Downloads from the portal' },
              ].map((s, i) => (
                <div key={s.step} style={{ position: 'relative', textAlign: 'center', padding: '1rem 0.5rem' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: 'var(--primary)', color: 'var(--primary-text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, margin: '0 auto 0.7rem'
                  }}>{s.step}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.who}</div>
                  <div className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>{s.what}</div>
                  {i < 3 && (
                    <FiArrowRight style={{
                      position: 'absolute', right: '-0.6rem', top: '2rem',
                      color: 'var(--text-muted)'
                    }} />
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 4. TRUST ============ */}
      <section style={{ maxWidth: '1050px', margin: '0 auto', padding: '3.5rem 1.5rem' }}>
        <Reveal>
          <h2 className="section-label" style={{ textAlign: 'center', marginBottom: '0.4rem' }}>
            Security & accountability
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '0 auto 2rem', maxWidth: '520px' }}>
            Built for records schools have to trust.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.1rem' }}>
            {[
              { icon: <FiLock />, title: 'Hashed passwords', body: 'Bcrypt with a per-user salt. Administrators never see or set passwords.' },
              { icon: <FiShield />, title: 'Role & ownership checks', body: 'Every request is authorized server-side — role first, then row-level ownership.' },
              { icon: <FiEyeOff />, title: 'Brute-force lockout', body: 'Five failed sign-ins lock an account for fifteen minutes.' },
              { icon: <FiCheckCircle />, title: 'Immutable audit trail', body: 'Every significant action recorded — who, what, when, from where. Never editable.' },
            ].map(t => (
              <div key={t.title} className="card" style={{ marginBottom: 0 }}>
                <div style={{ color: 'var(--primary)', marginBottom: '0.55rem', display: 'flex' }}>{t.icon}</div>
                <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.02rem', marginBottom: '0.4rem' }}>{t.title}</h3>
                <p className="text-muted" style={{ fontSize: '0.88rem', marginBottom: 0 }}>{t.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ 5. HOW IT WORKS ============ */}
      <section style={{ background: 'var(--surface-2)', padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Reveal>
            <h2 className="section-label" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              Deploying for a school
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                { step: '01', title: 'Deploy & seed', body: 'The platform is installed and a super admin account is provisioned.' },
                { step: '02', title: 'Build the school', body: 'Sessions, terms, classes, subjects, fees and the timetable — all from the admin portal.' },
                { step: '03', title: 'Admit & activate', body: 'Students and staff are admitted and receive one-time links to set their own passwords.' },
              ].map(s => (
                <div key={s.step} className="card" style={{ marginBottom: 0 }}>
                  <div style={{
                    fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.6rem',
                    fontWeight: 700, color: 'var(--primary)', marginBottom: '0.3rem'
                  }}>{s.step}</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{s.title}</div>
                  <p className="text-muted" style={{ fontSize: '0.86rem', marginBottom: 0 }}>{s.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{
        background: 'var(--sidebar)', color: 'rgba(242,246,250,0.7)',
        padding: '2rem', textAlign: 'center', fontSize: '0.85rem'
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <Link to="/login" style={{ color: 'var(--accent)' }}>Log in to your portal</Link>
        </div>
        <div>
          School Management System · React project · Sylvieva
        </div>
      </footer>
    </div>
  );
}