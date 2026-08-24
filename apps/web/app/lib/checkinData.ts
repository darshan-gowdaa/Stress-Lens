// Data definitions for Christ University departments, mood tags, sleep insights, and crisis resources

export interface DepartmentGroup {
  name: string;
  shortName: string;
  icon: string;
  courses: string[];
}

export const CHRIST_DEPARTMENTS: DepartmentGroup[] = [
  {
    name: 'School of Sciences',
    shortName: 'Sciences',
    icon: 'ri-flask-line',
    courses: [
      'BSc Computer Science',
      'BSc Data Science & AI',
      'BSc Mathematics & Statistics',
      'BSc Biotechnology & Life Sciences',
      'BSc Physics & Chemistry',
      'MCA (Master of Computer Applications)',
      'MSc Data Science',
    ],
  },
  {
    name: 'School of Engineering & Technology',
    shortName: 'Engineering',
    icon: 'ri-cpu-line',
    courses: [
      'B.Tech Computer Science & Engineering (CSE)',
      'B.Tech AI & Machine Learning',
      'B.Tech Electronics & Comm (ECE)',
      'B.Tech Mechanical & Mechatronics',
      'B.Tech Civil Engineering',
      'M.Tech Computer Science / AI',
    ],
  },
  {
    name: 'School of Business & Management',
    shortName: 'Management',
    icon: 'ri-briefcase-line',
    courses: [
      'BBA (General / Honours)',
      'BBA Finance & International Business',
      'BBA Business Analytics & Decision Sciences',
      'BBA Tourism & Travel Management',
      'MBA (Finance / Marketing / HR / Operations)',
      'Executive MBA',
    ],
  },
  {
    name: 'School of Commerce, Finance & Accountancy',
    shortName: 'Commerce',
    icon: 'ri-bank-card-line',
    courses: [
      'B.Com (Regular / Honours)',
      'B.Com Applied Finance & Analytics',
      'B.Com Professional Studies (CA/CS Track)',
      'B.Com International Finance (ACCA)',
      'M.Com (Master of Commerce)',
    ],
  },
  {
    name: 'School of Humanities & Social Sciences',
    shortName: 'Humanities',
    icon: 'ri-book-read-line',
    courses: [
      'BSc / MSc Psychology',
      'BA Economics & Political Science',
      'BA English & Cultural Studies',
      'BA Journalism & Digital Media',
      'MSW (Master of Social Work)',
    ],
  },
  {
    name: 'School of Law',
    shortName: 'Law',
    icon: 'ri-scales-3-line',
    courses: [
      'BA LL.B (Honours)',
      'BBA LL.B (Honours)',
      'LL.M Corporate & Commercial Law',
      'LL.M Constitutional & Administrative Law',
    ],
  },
  {
    name: 'School of Education & Architecture',
    shortName: 'Education & Arch',
    icon: 'ri-building-line',
    courses: [
      'B.Ed (Bachelor of Education)',
      'B.Arch (Bachelor of Architecture)',
      'MA Educational Studies',
    ],
  },
];

export interface TagDetail {
  tag: string;
  advice: string;
  icon?: string;
}

export interface MoodTagCategory {
  category: string;
  icon: string;
  tags: TagDetail[];
}

export const MOOD_TAG_CATEGORIES: MoodTagCategory[] = [
  {
    category: 'Energy & Body',
    icon: 'ri-flashlight-line',
    tags: [
      { tag: '#tired', advice: 'Try 15m Non-Sleep Deep Rest (NSDR) or step away from screens for a reset.', icon: 'ri-zzz-line' },
      { tag: '#exhausted', advice: 'Prioritize physical rest tonight; avoid heavy caffeine past 3 PM.', icon: 'ri-battery-low-line' },
      { tag: '#restless', advice: 'Try progressive muscle relaxation or a 10-minute campus walk.', icon: 'ri-walk-line' },
      { tag: '#burnt-out', advice: 'Take a 20-minute digital disconnect. Protect the boundary between work and sleep.', icon: 'ri-fire-line' },
    ],
  },
  {
    category: 'Mind & Academics',
    icon: 'ri-brain-line',
    tags: [
      { tag: '#focused', advice: 'Protect flow state with 45m Pomodoro cycles and hydration breaks.', icon: 'ri-focus-2-line' },
      { tag: '#overwhelmed', advice: '1-3-5 Rule: Choose 1 essential priority and 3 quick wins; defer the rest.', icon: 'ri-stack-line' },
      { tag: '#confused', advice: 'Write down your single sticking point and consult a peer or faculty member.', icon: 'ri-question-mark' },
      { tag: '#procrastinating', advice: '5-Minute Rule: Commit to working for just 300 seconds without judging the output.', icon: 'ri-timer-line' },
    ],
  },
  {
    category: 'Emotions & Feelings',
    icon: 'ri-heart-pulse-line',
    tags: [
      { tag: '#anxious', advice: 'Box breathing: 4s inhale, 4s hold, 4s exhale, 4s hold (repeat 4 times).', icon: 'ri-windy-line' },
      { tag: '#frustrated', advice: 'Step outside near Central Campus gardens or fountain for fresh air.', icon: 'ri-leaf-line' },
      { tag: '#lonely', advice: 'Student Wellness Centre (Block 1) has open drop-in hours and peer listening.', icon: 'ri-user-heart-line' },
      { tag: '#sad', advice: 'Self-compassion break: acknowledge feelings without self-criticism.', icon: 'ri-empathize-line' },
    ],
  },
  {
    category: 'Positivity & Flow',
    icon: 'ri-sparkling-line',
    tags: [
      { tag: '#calm', advice: 'Anchor this feeling: note what helped you feel grounded today.', icon: 'ri-cup-line' },
      { tag: '#hopeful', advice: 'Capture a quick note of gratitude to reinforce emotional momentum.', icon: 'ri-sun-line' },
      { tag: '#motivated', advice: 'Ride the momentum: tackle your highest friction task while mental energy is high.', icon: 'ri-rocket-line' },
      { tag: '#excited', advice: 'Channel this positive energy into creative work or collaboration with peers.', icon: 'ri-magic-line' },
    ],
  },
];

// Flat list for easy tag lookup
export const ALL_MOOD_TAGS = MOOD_TAG_CATEGORIES.flatMap(c => c.tags);

export interface SleepQualityInfo {
  label: string;
  category: 'critical' | 'suboptimal' | 'optimal' | 'extended';
  badgeClass: string;
  icon: string;
  tip: string;
}

export function getSleepQualityInfo(hours: number | ''): SleepQualityInfo | null {
  if (hours === '' || isNaN(Number(hours))) return null;
  const h = Number(hours);
  if (h < 0) return null;

  if (h < 5) {
    return {
      label: 'Critical Deficit (<5h)',
      category: 'critical',
      badgeClass: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
      icon: 'ri-alarm-warning-line',
      tip: 'Elevated cognitive fatigue & stress risk. Aim for a 20m power nap before 4 PM.',
    };
  }
  if (h < 7) {
    return {
      label: 'Suboptimal (5-6h)',
      category: 'suboptimal',
      badgeClass: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
      icon: 'ri-time-line',
      tip: 'Below the student recovery threshold. Plan an earlier bedtime tonight.',
    };
  }
  if (h <= 9) {
    return {
      label: 'Optimal Rest (7-9h)',
      category: 'optimal',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
      icon: 'ri-check-double-line',
      tip: 'Ideal memory consolidation and emotional regulation zone.',
    };
  }
  return {
    label: 'Extended Rest (>9h)',
    category: 'extended',
    badgeClass: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
    icon: 'ri-moon-clear-line',
    tip: 'Deep recovery achieved. Remember to hydrate and get morning sunlight.',
  };
}

export interface CrisisResource {
  name: string;
  description: string;
  phone: string;
  email?: string;
  phoneHref: string;
  badge: string;
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'Christ University Student Wellness Centre',
    description: 'On-campus confidential mental health support and professional counselors (Block 1, Central Campus)',
    phone: '080-4012 9100',
    email: 'counseling@christuniversity.in',
    phoneHref: 'tel:08040129100',
    badge: 'On-Campus Support',
  },
  {
    name: 'Tele-MANAS (National Mental Health Helpline)',
    description: '24x7 Government of India free and confidential tele-counseling in 20+ languages',
    phone: '14416 / 1800-891-4416',
    phoneHref: 'tel:14416',
    badge: '24x7 Toll-Free Govt',
  },
  {
    name: 'Vandrevala Foundation Helpline',
    description: '24/7 free mental health crisis intervention & counseling by trained psychologists',
    phone: '+91 9999 666 555',
    phoneHref: 'tel:+919999666555',
    badge: '24/7 Crisis Helpline',
  },
  {
    name: 'KIRAN National Mental Health Helpline',
    description: 'Ministry of Social Justice 24/7 helpline for psychological first-aid and anxiety management',
    phone: '1800-599-0019',
    phoneHref: 'tel:18005990019',
    badge: 'National Support',
  },
];
