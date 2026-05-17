'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { DEFAULT_CURRICULUM } from '@/lib/curriculum';
import type { PublicBatch } from '@/lib/registration';
import './public.css';

function formatBatchDate(value: string | null) {
  if (!value) return 'Dates coming soon';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function formatMoney(amount: number, currency: string) {
  if (!amount) return 'Price TBA';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [batches, setBatches] = useState<PublicBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [hasScrolled, setHasScrolled] = useState(false);

  const navItems = [
    { id: 'program', label: 'Program' },
    { id: 'fit', label: 'Fit' },
    { id: 'curriculum', label: 'Curriculum' },
    { id: 'mentors', label: 'Mentors' },
    { id: 'batches', label: 'Cohorts' },
  ];

  function handleNavClick(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${sectionId}`);
    }
    setActiveSection(sectionId);
  }

  useEffect(() => {
    fetch('/api/register/batches')
      .then((res) => res.json())
      .then((payload) => setBatches(payload.batches || []))
      .catch((error) => console.error('Failed to fetch public batches:', error))
      .finally(() => setLoadingBatches(false));
  }, []);

  useEffect(() => {
    function scrollToHashSection() {
      const sectionId = window.location.hash.replace('#', '');
      if (!sectionId) return;
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ block: 'start' });
        setActiveSection(sectionId);
      }
    }

    function updateActiveSection() {
      const scrollPosition = window.scrollY + window.innerHeight * 0.45;
      setHasScrolled(window.scrollY > 24);
      const currentSection = navItems
        .map((item) => document.getElementById(item.id))
        .filter((section): section is HTMLElement => Boolean(section))
        .reverse()
        .find((section) => section.offsetTop <= scrollPosition);

      if (currentSection?.id) {
        setActiveSection(currentSection.id);
      }
    }

    updateActiveSection();
    window.setTimeout(scrollToHashSection, 80);
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('hashchange', scrollToHashSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('hashchange', scrollToHashSection);
    };
  }, []);

  const curriculumWeeks = useMemo(() => {
    return Array.from({ length: 8 }, (_, index) => {
      const week = index + 1;
      const sessions = DEFAULT_CURRICULUM.filter((item) => item.week === week);
      const categories = Array.from(new Set(sessions.map((item) => item.category).filter((category) => category !== 'Orientation')));
      const focus = categories.length ? categories.join(' + ') : 'Orientation';
      return {
        week,
        focus,
        saturday: sessions.find((session) => session.day === 'Saturday'),
        sunday: sessions.find((session) => session.day === 'Sunday'),
      };
    });
  }, []);

  if (isLoading) {
    return (
      <div className="public-loading">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <main className="public-page">
      <nav className={`public-nav ${hasScrolled ? 'is-compact' : ''}`}>
        <div className="public-nav-inner">
          <a className="public-brand" href="#overview" aria-label="Ace Club home">
            <span className="public-brand-title">Ace Club</span>
            <span className="public-brand-subtitle">by The Admit Co.</span>
          </a>
          <div className="public-nav-actions">
            <div className="public-nav-links" aria-label="Landing page sections">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={activeSection === item.id ? 'is-active' : ''}
                  onClick={(event) => {
                    event.preventDefault();
                    handleNavClick(item.id);
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
            <a
              className="nav-register"
              href="#batches"
              onClick={(event) => {
                event.preventDefault();
                handleNavClick('batches');
              }}
            >
              Apply
            </a>
            <button
              className="btn btn-secondary btn-sm nav-login"
              onClick={() => router.push(user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login')}
            >
              {user ? (user.role === 'admin' ? 'Admin' : 'Dashboard') : 'Login'}
            </button>
          </div>
        </div>
      </nav>
      <div className="public-shell">
        <section id="overview" className="public-hero">
          <div className="public-hero-copy">
            <span className="public-eyebrow">The Admit Co. presents</span>
            <h1>
              Focused GMAT prep
              <span>for students ready to build momentum.</span>
            </h1>
            <p>
              Small cohorts. Weekly accountability. Personal intervention when your prep slips.
            </p>
            <div className="public-actions">
              <a
                className="btn btn-primary btn-lg"
                href="#batches"
                onClick={(event) => {
                  event.preventDefault();
                  handleNavClick('batches');
                }}
              >
                Apply for a cohort
              </a>
              <a
                className="btn btn-secondary btn-lg"
                href="#program"
                onClick={(event) => {
                  event.preventDefault();
                  handleNavClick('program');
                }}
              >
                See how Ace Club works
              </a>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-system-map" aria-label="Ace Club prep operating system graphic">
              <svg viewBox="0 0 520 420" role="img" aria-labelledby="system-map-title">
                <title id="system-map-title">Preparation system map with sessions, practice, review, and intervention checkpoints</title>
                <path className="map-path" d="M72 250 C120 100, 242 110, 260 210 S390 330, 452 168" />
                <path className="map-path map-path-soft" d="M92 300 C190 360, 310 350, 428 260" />
                <g className="map-node map-node-strong" transform="translate(74 250)">
                  <circle r="22" />
                  <text y="5">01</text>
                </g>
                <g className="map-node" transform="translate(182 142)">
                  <circle r="18" />
                  <text y="5">02</text>
                </g>
                <g className="map-node" transform="translate(272 218)">
                  <circle r="22" />
                  <text y="5">03</text>
                </g>
                <g className="map-node" transform="translate(392 302)">
                  <circle r="18" />
                  <text y="5">04</text>
                </g>
                <g className="map-node map-node-strong" transform="translate(452 168)">
                  <circle r="24" />
                  <text y="5">05</text>
                </g>
                <text className="map-label" x="54" y="346">Live</text>
                <text className="map-label" x="188" y="84">practice</text>
                <text className="map-label" x="300" y="204">review</text>
                <text className="map-label" x="358" y="360">mock</text>
                <text className="map-label" x="394" y="108">intervention</text>
              </svg>
            </div>
            <div className="hero-proof-line" aria-label="Ace Club highlights">
              <span>8 students max</span>
              <span>Weekly accountability</span>
              <span>Clear weekly plan</span>
            </div>
          </div>
        </section>

        <section id="program" className="public-section program-section">
          <div className="public-section-heading">
            <div>
              <span className="public-eyebrow">Program</span>
              <h2>You do not have to decide what to study next.</h2>
            </div>
            <p>Every week turns into a daily plan inside the portal, with progress visible to you and your mentor.</p>
          </div>
          <div className="rhythm-graphic" aria-label="Weekly operating rhythm">
            <div className="rhythm-line" />
            <div className="rhythm-step">
              <span>SAT/SUN</span>
              <strong>Live session</strong>
            </div>
            <div className="rhythm-step">
              <span>MON-FRI</span>
              <strong>Daily portal plan</strong>
            </div>
            <div className="rhythm-step">
              <span>WHEN NEEDED</span>
              <strong>4 personal sessions</strong>
            </div>
          </div>
          <div className="program-grid">
            <div className="program-item">
              <span>01</span>
              <strong>Weekend live sessions</strong>
              <p>Small-group classes set the direction for the week.</p>
            </div>
            <div className="program-item">
              <span>02</span>
              <strong>Daily plan in the portal</strong>
              <p>Your worksheet targets, attempts, and gaps stay visible.</p>
            </div>
            <div className="program-item">
              <span>03</span>
              <strong>4 flexible 1:1 sessions</strong>
              <p>Use them for catch-up, mock analysis, or momentum drops.</p>
            </div>
          </div>
        </section>

        <section id="fit" className="public-section fit-section public-snap-section">
          <div className="public-section-heading">
            <div>
              <span className="public-eyebrow">Best fit</span>
              <h2>You might need this if one of these feels true.</h2>
            </div>
            <p>Most students come in with one specific bottleneck, not every problem at once.</p>
          </div>
          <div className="fit-panel">
            <div className="fit-list">
              <strong>Good signal</strong>
              <span>You have prepared for CAT, GRE, or GMAT before.</span>
              <span>You know you are capable, but consistency keeps slipping.</span>
              <span>Quant, Verbal, or DI is clearly holding you back.</span>
              <span>You need a daily plan instead of deciding what to study.</span>
              <span>You want mentor visibility, not just more material.</span>
            </div>
            <div className="fit-list fit-list-muted">
              <strong>Less ideal if</strong>
              <span>You only want recorded lessons.</span>
              <span>You prefer studying completely independently.</span>
              <span>You need first-principles coaching from zero.</span>
            </div>
          </div>
        </section>

        <section id="curriculum" className="public-section curriculum-section">
          <div className="public-section-heading">
            <div>
              <span className="public-eyebrow">Curriculum</span>
              <h2>A fixed 8-week curriculum, followed by test readiness.</h2>
            </div>
            <p>Plan for the GMAT around week 12; some students may need longer depending on starting point and consistency.</p>
          </div>
          <div className="curriculum-model" aria-label="Ace Club learning model">
            <div>
              <span>01</span>
              <strong>Pre-read</strong>
            </div>
            <div>
              <span>02</span>
              <strong>Live session</strong>
            </div>
            <div>
              <span>03</span>
              <strong>Worksheet</strong>
            </div>
            <div>
              <span>04</span>
              <strong>Review</strong>
            </div>
          </div>
          <div className="curriculum-table" aria-label="Ace Club 8-week curriculum">
            <div className="curriculum-table-head">
              <span>Week</span>
              <span>Saturday</span>
              <span>Sunday</span>
            </div>
            <div className="curriculum-table-body">
              {curriculumWeeks.map((week) => (
                <div
                  key={week.week}
                  className="curriculum-table-row"
                >
                  <div>
                    <span>Week {week.week}</span>
                    <strong>{week.focus}</strong>
                  </div>
                  <p>{week.saturday?.title || 'TBA'}</p>
                  <p>{week.sunday?.title || 'TBA'}</p>
                </div>
              ))}
            </div>
          </div>
          <a
            className="curriculum-sample-link"
            href="https://www.notion.so/Samples-to-Share-32ae9744253f80ee96e1e239fcce77c3?source=copy_link"
            target="_blank"
            rel="noreferrer"
          >
            View sample prep page
          </a>
        </section>

        <section id="mentors" className="public-section about-section">
          <div className="about-copy">
            <span className="public-eyebrow">Mentors</span>
            <h2>Three operators behind one tiny GMAT club.</h2>
            <p>
              Ace Club is run by mentors from The Admit Co. Built for students who need sharper feedback,
              structure, and accountability.
            </p>
            <p className="about-scope">Quant, Verbal, DI, mock strategy, and study planning.</p>
            <div className="about-actions">
              <a className="btn btn-primary" href="https://wa.me/917689992562" target="_blank" rel="noreferrer">
                WhatsApp us
              </a>
              <a className="btn btn-secondary" href="https://calendar.app.google/snra3b7Bzfd6Yutd7" target="_blank" rel="noreferrer">
                Book a call
              </a>
            </div>
          </div>
          <div className="mentor-system" aria-label="Mentor coverage system">
            <div className="mentor-line" />
            <article className="mentor-node">
              <span>IS</span>
              <strong>Ishan</strong>
              <p>Quant + planning</p>
            </article>
            <article className="mentor-node">
              <span>UJ</span>
              <strong>Unnati</strong>
              <p>DI + tracking</p>
            </article>
            <article className="mentor-node">
              <span>TT</span>
              <strong>Tanya</strong>
              <p>Verbal + reasoning</p>
            </article>
          </div>
        </section>

        <section id="batches" className="public-section">
          <div className="public-section-heading">
            <div>
              <span className="public-eyebrow">Upcoming cohorts</span>
              <h2 style={{ marginBottom: 0 }}>Apply for a small monthly cohort.</h2>
            </div>
            <p>Each batch is capped at 8 students. Payment confirms your seat.</p>
          </div>

          {loadingBatches ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="spinner" />
            </div>
          ) : batches.length > 0 ? (
            <div className="batch-grid">
              {batches.map((batch) => (
                <article key={batch.id} className="batch-card">
                  <h3>{batch.name}</h3>
                  <p className="batch-meta">Starts {formatBatchDate(batch.starts_at)}</p>
                  {batch.public_note && <p className="batch-meta">{batch.public_note}</p>}
                  <div className="seat-meter" aria-label={`${batch.seats_taken} seats filled out of ${batch.capacity}`}>
                    {Array.from({ length: batch.capacity }, (_, index) => (
                      <span key={index} className={index < batch.seats_taken ? 'is-filled' : ''} />
                    ))}
                  </div>
                  <div className="seat-line">{batch.seats_available} of {batch.capacity} seats available</div>
                  <div className="batch-price">{formatMoney(batch.price_amount, batch.currency)}</div>
                  <button
                    className="btn btn-primary"
                    onClick={() => router.push(`/register?course=${batch.id}`)}
                    disabled={batch.seats_available <= 0}
                  >
                    {batch.seats_available > 0 ? 'Apply' : 'Batch full'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 32 }}>
              <h3 className="empty-state-title">New batches opening soon</h3>
              <p className="empty-state-text">The next Ace Club cohorts will appear here once registration opens.</p>
            </div>
          )}
          <div className="cohort-flow">
            <span>Apply</span>
            <span>Short call</span>
            <span>Join cohort</span>
          </div>
        </section>

        <section className="final-cta public-snap-section">
          <svg className="final-map" viewBox="0 0 700 280" aria-hidden="true">
            <path d="M38 204 C158 84, 254 250, 350 140 S530 52, 652 156" />
            <circle cx="38" cy="204" r="7" />
            <circle cx="350" cy="140" r="7" />
            <circle cx="652" cy="156" r="7" />
          </svg>
          <h2>If you already know the basics, we will help you build consistency.</h2>
          <a
            className="btn btn-primary btn-lg"
            href="#batches"
            onClick={(event) => {
              event.preventDefault();
              handleNavClick('batches');
            }}
          >
            Apply for next cohort
          </a>
        </section>
      </div>
    </main>
  );
}
