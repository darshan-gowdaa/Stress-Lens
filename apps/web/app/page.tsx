'use client';
import { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import ToastContainer, { toast } from './components/Toast';
import StressGauge, { stressIconUrl } from './components/StressGauge';
import { submitCheckin, getAINudge } from './lib/api';
import { motion } from 'framer-motion';

const COURSES = [
  'Computer Science', 'Mathematics', 'Physics', 'Chemistry',
  'Biology', 'History', 'Economics', 'Psychology',
  'Engineering', 'Literature', 'Business', 'Law',
];

const DEPARTMENTS = [
  'Science', 'Arts', 'Commerce', 'Engineering',
  'Law', 'Management', 'Education', 'Medicine',
];

const MOOD_TAGS = [
  '#anxious', '#overwhelmed', '#tired', '#hopeful',
  '#calm', '#frustrated', '#focused', '#lonely',
  '#motivated', '#confused', '#excited', '#burnt-out',
];

// maps tag to a supportive resource hint shown in nudge
const TAG_RESOURCES: Record<string, string> = {
  '#anxious': 'breathing exercises',
  '#overwhelmed': 'task prioritization',
  '#tired': 'sleep hygiene tips',
  '#hopeful': 'gratitude journaling',
  '#lonely': 'campus community events',
  '#burnt-out': 'rest and recovery strategies',
};

type SubmitState = 'idle' | 'loading' | 'success';

export default function CheckinPage() {
  const [stressLevel, setStressLevel] = useState(5);
  const [text, setText] = useState('');
  const [course, setCourse] = useState('');
  const [department, setDepartment] = useState('');
  const [sleepHours, setSleepHours] = useState<number | ''>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [aiNudge, setAiNudge] = useState<string | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("Please share what's on your mind before submitting.");
      return;
    }

    setSubmitState('loading');
    setAiNudge(null);
    try {
      await submitCheckin({
        stress_level: stressLevel,
        text: text.trim(),
        tags: selectedTags,
        ...(course && { course }),
        ...(department && { dept: department }),
        ...(sleepHours !== '' && { sleep_hours: Number(sleepHours) }),
      });
      setSubmitState('success');
      toast.success('Submitted anonymously. Thank you for sharing.');

      // fetch AI nudge in background — non-blocking, best-effort
      setNudgeLoading(true);
      const category = stressLevel <= 3 ? 'Low' : stressLevel <= 7 ? 'Medium' : 'High';
      getAINudge(stressLevel, selectedTags, category)
        .then(res => { if (res.nudge) setAiNudge(res.nudge); })
        .catch(() => {})
        .finally(() => setNudgeLoading(false));

      // reset form after 5s so user can read nudge
      setTimeout(() => {
        setSubmitState('idle');
        setText('');
        setSelectedTags([]);
        setStressLevel(5);
        setCourse('');
        setDepartment('');
        setSleepHours('');
        setAiNudge(null);
      }, 5000);
    } catch (err) {
      setSubmitState('idle');
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      toast.error(msg);
    }
  };

  const charCount = text.length;
  const charLimit = 2000;
  // word count shown as a pacing helper to encourage detailed responses
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <>
      <Navbar currentPath="checkin" />
      <ToastContainer />

      <main className="flex-1 px-4 py-10 sm:py-16">
        <div className="max-w-3xl mx-auto">
          {/* header */}
          <div className="text-center mb-10 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-on-surface)] mb-2">
              How are you feeling?
            </h1>
            <p className="text-[var(--color-on-surface-variant)] text-base">
              Check in anonymously. Your responses help us support you better.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
            aria-label="Stress check-in form"
          >
            {/* stress slider card */}
            <section
              className="clay p-6 animate-fade-in-up"
              style={{ animationDelay: '60ms' }}
              aria-labelledby="stress-label"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 id="stress-label" className="font-semibold text-[var(--color-on-surface)] text-lg">
                    Stress Level
                  </h2>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                    Drag to set your current stress level
                  </p>
                </div>
                <StressGauge level={stressLevel} size="md" showLabel />
              </div>

              {/* emoji tick markers */}
              <div className="flex justify-between text-base mb-1 px-1 select-none" aria-hidden="true">
                {Array.from({ length: 10 }).map((_, i) => {
                  const level = i + 1;
                  const active = stressLevel === level;
                  return (
                    <motion.div
                      key={level}
                      onClick={() => setStressLevel(level)}
                      className="cursor-pointer"
                      animate={{
                        scale: active ? 1.5 : 1,
                        opacity: active ? 1 : 0.35,
                      }}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <img src={stressIconUrl(level)} alt={`Level ${level}`} className="w-6 h-6 object-contain pointer-events-none" />
                    </motion.div>
                  );
                })}
              </div>

              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={stressLevel}
                onChange={e => setStressLevel(parseInt(e.target.value))}
                aria-label={`Stress level: ${stressLevel} out of 10`}
                aria-valuemin={1}
                aria-valuemax={10}
                aria-valuenow={stressLevel}
                className="w-full mt-2 cursor-pointer"
              />

              <div className="flex justify-between text-xs text-[var(--color-on-surface-variant)] mt-1 px-1" aria-hidden="true">
                <span>1 – Calm</span>
                <span>5 – Moderate</span>
                <span>10 – Critical</span>
              </div>
            </section>

            {/* textarea card */}
            <section
              className="clay p-6 animate-fade-in-up"
              style={{ animationDelay: '120ms' }}
              aria-labelledby="text-label"
            >
              <label
                id="text-label"
                htmlFor="checkin-text"
                className="block font-semibold text-[var(--color-on-surface)] text-lg mb-1"
              >
                What's on your mind?
              </label>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-3">
                Share whatever feels relevant — coursework, personal challenges, campus life.
              </p>
              <textarea
                id="checkin-text"
                value={text}
                onChange={e => setText(e.target.value.slice(0, charLimit))}
                placeholder="Today I'm feeling stressed because..."
                rows={5}
                required
                aria-required="true"
                aria-describedby="char-count"
                className="resize-none"
              />
              <div className="flex justify-between items-center mt-1.5">
                {/* word count pacing helper — encourages richer responses */}
                <span className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                  {wordCount > 0 && `${wordCount} word${wordCount !== 1 ? 's' : ''}`}
                  {wordCount >= 20 && wordCount < 50 && ' · good detail'}
                  {wordCount >= 50 && ' · very detailed ✓'}
                </span>
                <div
                  id="char-count"
                  className="text-xs tabular-nums"
                  style={{ color: charCount > charLimit * 0.9 ? 'var(--color-error)' : 'var(--color-on-surface-variant)' }}
                  aria-live="polite"
                >
                  {charCount}/{charLimit}
                </div>
              </div>
            </section>

            {/* mood tags */}
            <section
              className="clay p-6 animate-fade-in-up"
              style={{ animationDelay: '180ms' }}
              aria-labelledby="tags-label"
            >
              <h2 id="tags-label" className="font-semibold text-[var(--color-on-surface)] text-lg mb-1">
                Mood Tags
                <span className="text-[var(--color-on-surface-variant)] font-normal text-sm ml-2">optional</span>
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-4">
                Select tags that resonate with how you're feeling right now.
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Mood tag selection">
                {MOOD_TAGS.map(tag => {
                  const active = selectedTags.includes(tag);
                  const resource = TAG_RESOURCES[tag];
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={active}
                      title={resource ? `Tip: ${resource}` : undefined}
                      className={`
                        px-3 py-1.5 rounded-[var(--radius-full)] text-sm font-medium
                        border transition-all duration-150
                        ${active
                          ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
                          : 'bg-transparent text-[var(--color-on-surface-variant)] border-[var(--color-outline)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                        }
                      `}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {/* show resource hints for selected tags */}
              {selectedTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5" aria-live="polite">
                  {selectedTags.filter(t => TAG_RESOURCES[t]).map(t => (
                    <span key={t} className="text-xs px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center gap-1">
                      <i className="ri-lightbulb-flash-line"></i> {TAG_RESOURCES[t]}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* optional fields */}
            <section
              className="clay p-6 animate-fade-in-up"
              style={{ animationDelay: '240ms' }}
              aria-labelledby="optional-label"
            >
              <h2 id="optional-label" className="font-semibold text-[var(--color-on-surface)] text-lg mb-1">
                About You
                <span className="text-[var(--color-on-surface-variant)] font-normal text-sm ml-2">optional</span>
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-4">
                Helps us understand stress patterns across different groups.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="course" className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1.5">
                    Course
                  </label>
                  <select
                    id="course"
                    value={course}
                    onChange={e => setCourse(e.target.value)}
                    aria-label="Select your course"
                  >
                    <option value="">Select course…</option>
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1.5">
                    Department
                  </label>
                  <select
                    id="department"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    aria-label="Select your department"
                  >
                    <option value="">Select department…</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="sleepHours" className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1.5">
                    Sleep (Hours)
                  </label>
                  <input
                    type="number"
                    id="sleepHours"
                    min="0"
                    max="24"
                    value={sleepHours}
                    onChange={e => setSleepHours(e.target.value === '' ? '' : Number(e.target.value))}
                    aria-label="Hours of sleep last night"
                    placeholder="e.g. 7"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-outline)] bg-transparent px-3 py-2 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>
            </section>

            {/* privacy notice */}
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] text-sm animate-fade-in-up"
              style={{ animationDelay: '300ms' }}
              role="note"
              aria-label="Privacy information"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>
                <strong>Your privacy is protected.</strong> All submissions are anonymized using k-anonymity.
                No personally identifiable information is stored or linked to your response.
              </p>
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={submitState !== 'idle'}
              aria-label={
                submitState === 'loading' ? 'Submitting…' :
                submitState === 'success' ? 'Submitted successfully' :
                'Submit check-in anonymously'
              }
              className={`
                md:col-span-2 relative w-full py-4 rounded-[var(--radius-full)] font-semibold text-base
                transition-all duration-200 animate-fade-in-up
                flex items-center justify-center gap-2
                ${submitState === 'success'
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'clay-btn disabled:opacity-70 disabled:cursor-not-allowed'
                }
              `}
              style={{ animationDelay: '360ms' }}
            >
              {submitState === 'loading' && (
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                </svg>
              )}
              {submitState === 'success' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {submitState === 'idle' && 'Submit Anonymously'}
              {submitState === 'loading' && 'Submitting…'}
              {submitState === 'success' && 'Submitted!'}
            </button>
          </form>

          {/* AI nudge card — shown after successful submission */}
          {submitState === 'success' && (
            <div
              className="md:col-span-2 mt-4 p-5 rounded-[var(--radius-xl)] border border-[var(--color-primary-container)] bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] animate-fade-in-up"
              aria-live="polite"
              aria-label="Personalised wellbeing tip"
            >
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-sparkling-2-line text-lg"></i>
                <span className="text-sm font-semibold">A thought for you</span>
                {nudgeLoading && (
                  <svg className="animate-spin ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              {nudgeLoading && !aiNudge && (
                <div className="h-4 w-3/4 rounded bg-[var(--color-primary)] opacity-20 animate-pulse" />
              )}
              {aiNudge && <p className="text-sm leading-relaxed">{aiNudge}</p>}
              {!nudgeLoading && !aiNudge && (
                <p className="text-sm leading-relaxed opacity-70">
                  Remember: reaching out for support is always a sign of strength. <i className="ri-heart-pulse-line align-middle"></i>
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
