'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import ToastContainer, { toast } from './Toast';
import StressGauge, { stressIconUrl, stressColor, stressGlowColor } from './StressGauge';
import { submitCheckin, getAINudge } from '../lib/api';
import { estimateCheckinSentiment } from '../lib/sentimentEstimator';
import {
  CHRIST_DEPARTMENTS,
  MOOD_TAG_CATEGORIES,
  ALL_MOOD_TAGS,
  getSleepQualityInfo,
  CRISIS_RESOURCES,
} from '../lib/checkinData';

type SubmitState = 'idle' | 'loading' | 'success';

interface CheckinViewProps {
  currentPath?: 'checkin' | 'dashboard' | 'notebook';
}

const PRESETS = [
  { label: 'Low', level: 2, desc: 'Calm & Balanced', icon: 'ri-leaf-line', color: '#22c55e' },
  { label: 'Moderate', level: 5, desc: 'Manageable Pressure', icon: 'ri-scales-3-line', color: '#f59e0b' },
  { label: 'High', level: 7, desc: 'Elevated Tension', icon: 'ri-fire-line', color: '#f97316' },
  { label: 'Critical', level: 9, desc: 'Overwhelmed', icon: 'ri-alarm-warning-line', color: '#ef4444' },
];

export default function CheckinView({ currentPath = 'checkin' }: CheckinViewProps) {
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [text, setText] = useState<string>('');
  const [course, setCourse] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [courseSearch, setCourseSearch] = useState<string>('');
  const [sleepHours, setSleepHours] = useState<number | ''>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTagCategory, setActiveTagCategory] = useState<string>('All');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [aiNudge, setAiNudge] = useState<string | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState<boolean>(false);
  const [tipCopied, setTipCopied] = useState<boolean>(false);
  const [showCrisisAccordion, setShowCrisisAccordion] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(12);

  // Live sentiment estimation computed from client-side text
  const liveSentiment = useMemo(() => estimateCheckinSentiment(text), [text]);

  // Sleep quality assessment
  const sleepInfo = useMemo(() => getSleepQualityInfo(sleepHours), [sleepHours]);

  // Tag advice lookup
  const activeTagDetails = useMemo(() => {
    return selectedTags
      .map(tag => ALL_MOOD_TAGS.find(t => t.tag === tag))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [selectedTags]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  // Filtered courses based on search and department
  const filteredCourses = useMemo(() => {
    let list: { course: string; dept: string; icon: string }[] = [];

    CHRIST_DEPARTMENTS.forEach(deptGroup => {
      if (!department || department === deptGroup.name) {
        deptGroup.courses.forEach(c => {
          list.push({ course: c, dept: deptGroup.name, icon: deptGroup.icon });
        });
      }
    });

    if (courseSearch.trim()) {
      const q = courseSearch.toLowerCase();
      list = list.filter(item =>
        item.course.toLowerCase().includes(q) || item.dept.toLowerCase().includes(q)
      );
    }
    return list;
  }, [department, courseSearch]);

  const handleDepartmentChange = (deptName: string) => {
    setDepartment(deptName);
    // If current selected course does not belong to this department, clear course
    if (deptName) {
      const deptGroup = CHRIST_DEPARTMENTS.find(d => d.name === deptName);
      if (deptGroup && course && !deptGroup.courses.includes(course)) {
        setCourse('');
      }
    }
  };

  const handleCourseChange = (selectedCourse: string) => {
    setCourse(selectedCourse);
    if (selectedCourse) {
      // Auto-assign matching department
      const parentDept = CHRIST_DEPARTMENTS.find(d => d.courses.includes(selectedCourse));
      if (parentDept) {
        setDepartment(parentDept.name);
      }
    }
  };

  // Reset form handler
  const handleReset = useCallback(() => {
    setSubmitState('idle');
    setText('');
    setSelectedTags([]);
    setStressLevel(5);
    setCourse('');
    setDepartment('');
    setCourseSearch('');
    setSleepHours('');
    setAiNudge(null);
    setTipCopied(false);
    setShowCrisisAccordion(false);
    setCountdown(12);
  }, []);

  // Countdown timer when submitted
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (submitState === 'success') {
      setCountdown(12);
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleReset();
            return 12;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [submitState, handleReset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("Please share what's on your mind before submitting.");
      return;
    }

    setSubmitState('loading');
    setAiNudge(null);
    setTipCopied(false);

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

      // Auto expand crisis hotline if high stress
      if (stressLevel >= 8) {
        setShowCrisisAccordion(true);
      }

      // Fetch AI nudge in background
      setNudgeLoading(true);
      const category = stressLevel <= 3 ? 'Low' : stressLevel <= 7 ? 'Medium' : 'High';
      getAINudge(stressLevel, selectedTags, category)
        .then(res => {
          if (res.nudge) setAiNudge(res.nudge);
        })
        .catch(() => {
          // graceful fallback
          setAiNudge('Take a moment to step back and breathe. Your health and wellbeing always come first.');
        })
        .finally(() => setNudgeLoading(false));
    } catch (err) {
      setSubmitState('idle');
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      toast.error(msg);
    }
  };

  const copyTipToClipboard = async (tipText: string) => {
    try {
      await navigator.clipboard.writeText(tipText);
      setTipCopied(true);
      toast.success('Tip copied to clipboard!');
      setTimeout(() => setTipCopied(false), 2500);
    } catch {
      toast.error('Unable to copy to clipboard.');
    }
  };

  const charCount = text.length;
  const charLimit = 2000;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const currentColor = stressColor(stressLevel);
  const currentGlow = stressGlowColor(stressLevel);

  return (
    <>
      <Navbar currentPath={currentPath} />
      <ToastContainer />

      <main className="flex-1 px-4 py-8 sm:py-10 bg-[var(--color-background)]">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] text-xs font-semibold">
              <i className="ri-shield-user-line text-sm"></i>
              Christ University Anonymous Wellness Check-in
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-on-surface)] tracking-tight">
              How are you feeling today?
            </h1>
            <p className="text-[var(--color-on-surface-variant)] text-sm sm:text-base max-w-xl mx-auto">
              Check in anonymously. Help the university understand student stress levels and access supportive wellbeing insights.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
            aria-label="Student stress check-in form"
          >
            {/* 1. Interactive Stress Gauge Slider Card */}
            <section
              className="clay p-6 sm:p-7 relative overflow-hidden transition-all duration-300"
              style={{
                boxShadow: `0 8px 30px ${currentGlow}, inset 0 0 1px rgba(255,255,255,0.2)`,
              }}
              aria-labelledby="stress-slider-heading"
            >
              {/* Dynamic top colored indicator bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5 transition-colors duration-300"
                style={{ backgroundColor: currentColor }}
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div>
                  <h2
                    id="stress-slider-heading"
                    className="font-bold text-[var(--color-on-surface)] text-xl flex items-center gap-2"
                  >
                    <i className="ri-dashboard-3-line text-[var(--color-primary)]"></i>
                    Stress Intensity
                  </h2>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                    Drag the slider, choose a preset, or click any emoji to set your current level.
                  </p>
                </div>
                <StressGauge level={stressLevel} size="md" showLabel glow />
              </div>

              {/* Quick Preset Buttons */}
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6"
                role="group"
                aria-label="Stress presets"
              >
                {PRESETS.map(p => {
                  const isPresetActive =
                    (p.level === 2 && stressLevel <= 3) ||
                    (p.level === 5 && stressLevel >= 4 && stressLevel <= 6) ||
                    (p.level === 7 && stressLevel >= 7 && stressLevel <= 8) ||
                    (p.level === 9 && stressLevel >= 9);

                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setStressLevel(p.level)}
                      aria-pressed={isPresetActive}
                      className={`
                        p-2.5 rounded-[var(--radius-lg)] border text-left transition-all duration-200 cursor-pointer
                        flex items-center gap-2.5
                        ${isPresetActive
                          ? 'border-transparent text-white shadow-md scale-[1.02]'
                          : 'border-[var(--color-outline)]/40 bg-[var(--color-surface-variant)]/40 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]'
                        }
                      `}
                      style={{
                        backgroundColor: isPresetActive ? p.color : undefined,
                      }}
                    >
                      <i className={`${p.icon} text-lg shrink-0`}></i>
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight truncate">{p.label}</div>
                        <div className="text-[10px] opacity-85 truncate">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Emoji Tick Markers (1 to 10) */}
              <div
                className="flex justify-between items-center px-1 mb-2 select-none"
                aria-hidden="true"
              >
                {Array.from({ length: 10 }).map((_, i) => {
                  const level = i + 1;
                  const active = stressLevel === level;
                  return (
                    <motion.button
                      key={level}
                      type="button"
                      onClick={() => setStressLevel(level)}
                      className="p-1 rounded-full relative cursor-pointer focus:outline-none"
                      animate={{
                        scale: active ? 1.4 : 0.95,
                        opacity: active ? 1 : 0.45,
                      }}
                      whileHover={{ scale: 1.3, opacity: 0.9 }}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                      title={`Set stress level ${level}`}
                    >
                      <img
                        src={stressIconUrl(level)}
                        alt={`Level ${level}`}
                        className="w-7 h-7 object-contain pointer-events-none drop-shadow-xs"
                      />
                      {active && (
                        <motion.div
                          layoutId="active-marker-dot"
                          className="w-1.5 h-1.5 rounded-full mx-auto mt-1"
                          style={{ backgroundColor: currentColor }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Slider Input */}
              <div className="px-1">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={stressLevel}
                  onChange={e => setStressLevel(parseInt(e.target.value, 10))}
                  aria-label={`Stress level: ${stressLevel} out of 10`}
                  aria-valuemin={1}
                  aria-valuemax={10}
                  aria-valuenow={stressLevel}
                  className="w-full mt-2 cursor-pointer h-2.5 rounded-lg"
                />
              </div>

              <div
                className="flex justify-between text-xs text-[var(--color-on-surface-variant)] mt-2 px-1 font-medium select-none"
                aria-hidden="true"
              >
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <i className="ri-checkbox-blank-circle-fill text-[8px]"></i> 1-3 Calm
                </span>
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <i className="ri-checkbox-blank-circle-fill text-[8px]"></i> 4-6 Moderate
                </span>
                <span className="flex items-center gap-1 text-rose-600 font-semibold">
                  <i className="ri-checkbox-blank-circle-fill text-[8px]"></i> 7-10 High/Critical
                </span>
              </div>
            </section>

            {/* 2. Text Input Card with Live Sentiment Indicator */}
            <section
              className="clay p-6 sm:p-7 space-y-3"
              aria-labelledby="textarea-heading"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <label
                    id="textarea-heading"
                    htmlFor="checkin-text"
                    className="block font-bold text-[var(--color-on-surface)] text-xl"
                  >
                    What&apos;s on your mind?
                  </label>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                    Share coursework challenges, exam pressure, campus life, or how you are coping.
                  </p>
                </div>

                {/* Live Sentiment & Stress Estimation Pill */}
                <div className="min-h-[32px] flex items-center">
                  <AnimatePresence mode="wait">
                    {liveSentiment ? (
                      <motion.div
                        key={liveSentiment.label}
                        initial={{ opacity: 0, y: -4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${liveSentiment.badgeBg}`}
                        aria-live="polite"
                        title={`Heuristic Confidence: ${(liveSentiment.confidence * 100).toFixed(0)}%`}
                      >
                        <span className="w-2 h-2 rounded-full animate-ping bg-current" />
                        <i className={`${liveSentiment.icon} text-sm`}></i>
                        <span>{liveSentiment.label}</span>
                      </motion.div>
                    ) : (
                      <span className="text-[11px] text-[var(--color-on-surface-variant)] flex items-center gap-1 opacity-70">
                        <i className="ri-sparkling-line text-[var(--color-primary)]"></i>
                        Live sentiment indicator updates as you type
                      </span>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  id="checkin-text"
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, charLimit))}
                  placeholder="e.g. Preparing for CIA exams while managing heavy assignments this week has been overwhelming..."
                  rows={5}
                  required
                  aria-required="true"
                  aria-describedby="char-and-sentiment-count"
                  className="w-full resize-none p-3.5 rounded-[var(--radius-lg)] border text-sm sm:text-base leading-relaxed focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all"
                />
              </div>

              {/* Detected keywords / signals & word counter */}
              <div
                id="char-and-sentiment-count"
                className="flex flex-wrap justify-between items-center gap-2 pt-1"
              >
                <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--color-on-surface-variant)]">
                  <span className="tabular-nums font-medium">
                    {wordCount > 0 && `${wordCount} word${wordCount !== 1 ? 's' : ''}`}
                    {wordCount >= 20 && wordCount < 45 && ' · Good detail'}
                    {wordCount >= 45 && ' · Rich reflection ✓'}
                  </span>

                  {liveSentiment && liveSentiment.keySignals.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] opacity-75">Signals:</span>
                      {liveSentiment.keySignals.map(sig => (
                        <span
                          key={sig}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] font-mono"
                        >
                          {sig}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="text-xs font-mono tabular-nums"
                  style={{
                    color:
                      charCount > charLimit * 0.9
                        ? 'var(--color-error)'
                        : 'var(--color-on-surface-variant)',
                  }}
                  aria-live="polite"
                >
                  {charCount}/{charLimit}
                </div>
              </div>
            </section>

            {/* 3. Quick Mood Tag Pills with Category Groupings & Instant Wellness Advice Chips */}
            <section
              className="clay p-6 sm:p-7 space-y-4"
              aria-labelledby="mood-tags-heading"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2
                    id="mood-tags-heading"
                    className="font-bold text-[var(--color-on-surface)] text-xl flex items-center gap-2"
                  >
                    <i className="ri-price-tag-3-line text-[var(--color-primary)]"></i>
                    Mood & Focus Tags
                    <span className="text-xs font-normal text-[var(--color-on-surface-variant)]">
                      (Optional)
                    </span>
                  </h2>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                    Select tags that describe your state for instant tailored wellness micro-interventions.
                  </p>
                </div>

                {/* Category Filter Tabs */}
                <div
                  className="flex items-center gap-1 bg-[var(--color-surface-variant)]/60 p-1 rounded-full overflow-x-auto self-start sm:self-auto"
                  role="tablist"
                  aria-label="Mood tag categories"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTagCategory === 'All'}
                    onClick={() => setActiveTagCategory('All')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      activeTagCategory === 'All'
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                    }`}
                  >
                    All
                  </button>
                  {MOOD_TAG_CATEGORIES.map(cat => (
                    <button
                      key={cat.category}
                      type="button"
                      role="tab"
                      aria-selected={activeTagCategory === cat.category}
                      onClick={() => setActiveTagCategory(cat.category)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        activeTagCategory === cat.category
                          ? 'bg-[var(--color-primary)] text-white shadow-xs'
                          : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                      }`}
                    >
                      {cat.category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap gap-2" role="group" aria-label="Mood tags">
                {MOOD_TAG_CATEGORIES.filter(
                  cat => activeTagCategory === 'All' || activeTagCategory === cat.category
                ).flatMap(cat => cat.tags).map(({ tag, icon }) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={active}
                      className={`
                        px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium
                        border flex items-center gap-1.5 transition-all duration-150 cursor-pointer
                        ${active
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm scale-105'
                          : 'bg-transparent text-[var(--color-on-surface-variant)] border-[var(--color-outline)]/50 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-variant)]/40'
                        }
                      `}
                    >
                      {icon && <i className={`${icon} text-sm`}></i>}
                      <span>{tag}</span>
                      {active && <i className="ri-check-line text-xs font-bold ml-0.5"></i>}
                    </button>
                  );
                })}
              </div>

              {/* Instant Helpful Wellness Advice Chips (Dynamic) */}
              <AnimatePresence>
                {activeTagDetails.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-3 border-t border-[var(--color-outline)]/20 space-y-2"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)]">
                      <i className="ri-lightbulb-flash-line text-sm"></i>
                      <span>Instant Helpful Wellness Advice:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeTagDetails.map(td => (
                        <div
                          key={td.tag}
                          className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary-container)]/70 text-[var(--color-on-primary-container)] text-xs flex items-start gap-2 border border-[var(--color-primary)]/20"
                        >
                          <i className="ri-sparkling-2-line text-sm text-[var(--color-primary)] shrink-0 mt-0.5"></i>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold">{td.tag}: </span>
                            <span className="leading-snug">{td.advice}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* 4. Course, Department & Sleep Analytics */}
            <section
              className="clay p-6 sm:p-7 space-y-5"
              aria-labelledby="academic-details-heading"
            >
              <div>
                <h2
                  id="academic-details-heading"
                  className="font-bold text-[var(--color-on-surface)] text-xl flex items-center gap-2"
                >
                  <i className="ri-graduation-cap-line text-[var(--color-primary)]"></i>
                  Academic Unit & Sleep Habit
                  <span className="text-xs font-normal text-[var(--color-on-surface-variant)]">
                    (Optional & Anonymized)
                  </span>
                </h2>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                  Helps Christ University identify specific student batches experiencing high workload.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department Grouped Select */}
                <div>
                  <label
                    htmlFor="department-select"
                    className="block text-xs font-bold text-[var(--color-on-surface)] mb-1.5 uppercase tracking-wider"
                  >
                    Department / School
                  </label>
                  <div className="relative">
                    <select
                      id="department-select"
                      value={department}
                      onChange={e => handleDepartmentChange(e.target.value)}
                      aria-label="Select Christ University Department"
                      className="w-full text-sm rounded-[var(--radius-md)] border p-2.5 bg-[var(--color-surface)] text-[var(--color-on-surface)]"
                    >
                      <option value="">All Christ University Schools…</option>
                      {CHRIST_DEPARTMENTS.map(dept => (
                        <option key={dept.name} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Course Select with Search */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="course-select"
                      className="block text-xs font-bold text-[var(--color-on-surface)] uppercase tracking-wider"
                    >
                      Course / Program
                    </label>
                    {courseSearch && (
                      <button
                        type="button"
                        onClick={() => setCourseSearch('')}
                        className="text-[11px] text-[var(--color-primary)] hover:underline cursor-pointer"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <select
                      id="course-select"
                      value={course}
                      onChange={e => handleCourseChange(e.target.value)}
                      aria-label="Select your specific course"
                      className="w-full text-sm rounded-[var(--radius-md)] border p-2.5 bg-[var(--color-surface)] text-[var(--color-on-surface)]"
                    >
                      <option value="">Select course or program…</option>
                      {CHRIST_DEPARTMENTS.map(deptGroup => (
                        <optgroup key={deptGroup.name} label={deptGroup.name}>
                          {deptGroup.courses.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sleep Hours Input & Visual Sleep Quality Badge */}
              <div className="pt-3 border-t border-[var(--color-outline)]/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <label
                      htmlFor="sleep-hours-input"
                      className="block text-xs font-bold text-[var(--color-on-surface)] uppercase tracking-wider mb-1"
                    >
                      Sleep Last Night (Hours)
                    </label>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      Sleep directly correlates with cognitive stress recovery.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSleepHours(prev =>
                          prev === '' ? 7 : Math.max(0, Math.round((Number(prev) - 0.5) * 2) / 2)
                        )
                      }
                      aria-label="Decrease sleep hours"
                      className="w-9 h-9 rounded-full border border-[var(--color-outline)]/40 flex items-center justify-center text-base hover:bg-[var(--color-surface-variant)] cursor-pointer"
                    >
                      <i className="ri-subtract-line"></i>
                    </button>

                    <input
                      type="number"
                      id="sleep-hours-input"
                      min="0"
                      max="24"
                      step="0.5"
                      value={sleepHours}
                      onChange={e =>
                        setSleepHours(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="e.g. 7.5"
                      aria-label="Hours of sleep last night"
                      className="w-24 text-center font-bold text-base p-2 rounded-[var(--radius-md)] border"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setSleepHours(prev =>
                          prev === '' ? 7 : Math.min(24, Math.round((Number(prev) + 0.5) * 2) / 2)
                        )
                      }
                      aria-label="Increase sleep hours"
                      className="w-9 h-9 rounded-full border border-[var(--color-outline)]/40 flex items-center justify-center text-base hover:bg-[var(--color-surface-variant)] cursor-pointer"
                    >
                      <i className="ri-add-line"></i>
                    </button>
                  </div>
                </div>

                {/* Real-time Sleep Quality Visual Badge */}
                <AnimatePresence>
                  {sleepInfo && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className={`mt-3 p-3 rounded-[var(--radius-lg)] border flex items-start gap-2.5 ${sleepInfo.badgeClass}`}
                    >
                      <i className={`${sleepInfo.icon} text-lg shrink-0 mt-0.5`}></i>
                      <div className="text-xs">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{sleepInfo.label}</span>
                        </div>
                        <p className="mt-0.5 opacity-90 leading-snug">{sleepInfo.tip}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* Privacy & K-Anonymity Notice */}
            <div
              className="flex items-start gap-3 px-4 py-3.5 rounded-[var(--radius-xl)] bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] text-xs sm:text-sm"
              role="note"
              aria-label="Privacy guarantee"
            >
              <i className="ri-shield-check-line text-lg shrink-0 text-emerald-600 mt-0.5"></i>
              <p className="leading-relaxed">
                <strong>Anonymity Guaranteed:</strong> Submissions are secured via salt-hashed k-anonymity (k ≥ 5). No roll numbers, IP addresses, or personal identifiers are collected or stored.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitState !== 'idle'}
              aria-label={
                submitState === 'loading'
                  ? 'Submitting check-in…'
                  : submitState === 'success'
                  ? 'Submitted successfully'
                  : 'Submit check-in anonymously'
              }
              className={`
                relative w-full py-4 rounded-[var(--radius-full)] font-bold text-base
                transition-all duration-200 cursor-pointer flex items-center justify-center gap-2
                shadow-lg
                ${submitState === 'success'
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'clay-btn disabled:opacity-75 disabled:cursor-not-allowed'
                }
              `}
            >
              {submitState === 'loading' && (
                <i className="ri-loader-4-line animate-spin text-xl"></i>
              )}
              {submitState === 'success' && (
                <i className="ri-checkbox-circle-fill text-xl"></i>
              )}
              {submitState === 'idle' && (
                <>
                  <span>Submit Anonymous Check-in</span>
                  <i className="ri-arrow-right-line text-lg"></i>
                </>
              )}
              {submitState === 'loading' && 'Transmitting Anonymously…'}
              {submitState === 'success' && 'Check-in Recorded!'}
            </button>
          </form>

          {/* 5. Enhanced AI Nudge & Crisis Card (Rendered upon successful submission) */}
          <AnimatePresence>
            {submitState === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                className="space-y-4"
              >
                {/* AI Nudge Box */}
                <div
                  className="p-6 rounded-[var(--radius-xl)] bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] border border-[var(--color-primary)]/30 shadow-md relative"
                  aria-live="polite"
                  aria-label="Personalized AI Wellbeing Tip"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <i className="ri-sparkling-fill text-lg text-[var(--color-primary)]"></i>
                      <h3 className="font-bold text-base">A Thought for You</h3>
                    </div>

                    {nudgeLoading ? (
                      <div className="flex items-center gap-1.5 text-xs opacity-75">
                        <i className="ri-loader-4-line animate-spin text-sm"></i>
                        <span>Generating tailored advice…</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => copyTipToClipboard(aiNudge || 'Remember: reaching out is a sign of strength.')}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-white/80 dark:bg-black/30 hover:bg-white text-[var(--color-on-primary-container)] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        aria-label="Copy wellbeing tip"
                      >
                        <i className={tipCopied ? 'ri-check-line text-emerald-600 font-bold' : 'ri-file-copy-line'}></i>
                        <span>{tipCopied ? 'Copied!' : 'Copy Tip'}</span>
                      </button>
                    )}
                  </div>

                  {nudgeLoading && !aiNudge && (
                    <div className="space-y-2 py-2">
                      <div className="h-4 w-5/6 rounded bg-[var(--color-primary)]/20 animate-pulse"></div>
                      <div className="h-4 w-3/4 rounded bg-[var(--color-primary)]/20 animate-pulse"></div>
                    </div>
                  )}

                  {aiNudge && (
                    <p className="text-sm leading-relaxed font-medium">
                      {aiNudge}
                    </p>
                  )}

                  {!nudgeLoading && !aiNudge && (
                    <p className="text-sm leading-relaxed opacity-85">
                      Remember: you are not alone in this journey. Taking small intentional breaks can restore cognitive capacity and emotional balance.
                    </p>
                  )}

                  {/* Auto-reset progress indicator */}
                  <div className="mt-4 pt-3 border-t border-[var(--color-primary)]/20 flex items-center justify-between text-xs opacity-80">
                    <span className="flex items-center gap-1.5">
                      <i className="ri-timer-line"></i>
                      <span>Resetting form in {countdown}s</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="font-bold text-[var(--color-primary)] hover:underline cursor-pointer"
                    >
                      Submit Another Now
                    </button>
                  </div>
                </div>

                {/* Crisis Hotline Accordion */}
                <div
                  className={`rounded-[var(--radius-xl)] border transition-all ${
                    stressLevel >= 8
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-[var(--color-surface-variant)]/60 border-[var(--color-outline)]/30'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setShowCrisisAccordion(prev => !prev)}
                    aria-expanded={showCrisisAccordion}
                    className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <i
                        className={`ri-heart-pulse-fill text-lg ${
                          stressLevel >= 8 ? 'text-rose-600' : 'text-[var(--color-primary)]'
                        }`}
                      ></i>
                      <div>
                        <div className="text-sm font-bold text-[var(--color-on-surface)] flex items-center gap-2">
                          <span>Confidential Crisis & Mental Health Resources</span>
                          {stressLevel >= 8 && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-rose-600 text-white font-semibold">
                              Urgent Support Available
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-on-surface-variant)]">
                          Free, 24x7 support from Christ University counselors and national helplines.
                        </p>
                      </div>
                    </div>

                    <i
                      className={`ri-arrow-down-s-line text-xl transition-transform ${
                        showCrisisAccordion ? 'rotate-180' : ''
                      }`}
                    ></i>
                  </button>

                  {/* Hotline details */}
                  <AnimatePresence>
                    {showCrisisAccordion && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4 space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {CRISIS_RESOURCES.map(res => (
                            <div
                              key={res.name}
                              className="p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-outline)]/20 shadow-xs flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <h4 className="text-xs font-bold text-[var(--color-on-surface)] truncate">
                                    {res.name}
                                  </h4>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-mono shrink-0">
                                    {res.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[var(--color-on-surface-variant)] leading-snug line-clamp-2">
                                  {res.description}
                                </p>
                              </div>

                              <div className="mt-3 pt-2 border-t border-[var(--color-outline)]/15 flex items-center justify-between gap-2">
                                <a
                                  href={res.phoneHref}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
                                >
                                  <i className="ri-phone-fill text-sm"></i>
                                  <span>{res.phone}</span>
                                </a>

                                {res.email && (
                                  <a
                                    href={`mailto:${res.email}`}
                                    className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                                  >
                                    <i className="ri-mail-line"></i>
                                    <span>Email</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
