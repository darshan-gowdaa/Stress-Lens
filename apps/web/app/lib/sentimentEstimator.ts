// Client-side lightweight heuristic for real-time sentiment and stress estimation

export interface SentimentEstimation {
  stressLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  valence: 'Positive' | 'Neutral' | 'Negative';
  confidence: number;
  label: string;
  color: string;
  badgeBg: string;
  icon: string;
  keySignals: string[];
}

export function estimateCheckinSentiment(text: string): SentimentEstimation | null {
  const trimmed = text.trim();
  if (trimmed.length < 4) return null;

  const lower = trimmed.toLowerCase();
  const words = lower.match(/\b[a-z'-]+\b/g) || [];
  if (words.length === 0) return null;

  // Distress keywords grouped by severity
  const criticalWords = [
    'breakdown', 'hopeless', 'suicide', 'suicidal', 'drowning', 'panic',
    'suffocating', 'unbearable', 'despair', 'crisis', 'terrified', 'paralyzed',
    'cannot take it', 'can\'t take it', 'give up', 'giving up', 'worthless'
  ];

  const highDistressWords = [
    'burnout', 'burnt out', 'overwhelmed', 'exhausted', 'failing', 'crying',
    'depressed', 'severe', 'nightmare', 'anxiety', 'agony', 'helpless', 'ruined',
    'awful', 'terrible', 'dread', 'freaking out', 'miserable', 'collapse', 'screwed'
  ];

  const moderateDistressWords = [
    'stress', 'stressed', 'anxious', 'worried', 'struggling', 'behind', 'backlog',
    'tired', 'deadline', 'deadlines', 'pressure', 'hard', 'difficult', 'insomnia',
    'headache', 'confused', 'lonely', 'sad', 'quiz', 'exam', 'exams', 'viva',
    'attendance', 'lost', 'stuck', 'procrastinating', 'overloaded', 'nervous', 'cia'
  ];

  // Positive and resilience keywords
  const positiveWords = [
    'happy', 'excited', 'good', 'great', 'calm', 'relax', 'relaxed', 'hopeful',
    'peaceful', 'confident', 'grateful', 'proud', 'better', 'improving', 'relieved',
    'motivated', 'energized', 'productive', 'supported', 'manageable', 'fine',
    'enjoying', 'thriving', 'blessed', 'rested', 'refreshed', 'ready', 'optimistic'
  ];

  let stressScore = 0;
  let valenceScore = 0;
  const matchedSignals: string[] = [];

  for (const w of words) {
    if (criticalWords.includes(w)) {
      stressScore += 3.5;
      valenceScore -= 3;
      matchedSignals.push(w);
    } else if (highDistressWords.includes(w)) {
      stressScore += 2.5;
      valenceScore -= 2;
      matchedSignals.push(w);
    } else if (moderateDistressWords.includes(w)) {
      stressScore += 1.2;
      valenceScore -= 1;
      matchedSignals.push(w);
    } else if (positiveWords.includes(w)) {
      stressScore -= 1.5;
      valenceScore += 2;
      matchedSignals.push(w);
    }
  }

  // Punctuation and emphasis boost
  const exclamations = (trimmed.match(/!{2,}/g) || []).length;
  if (exclamations > 0) stressScore += 1.5;

  const allCapsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).filter(
    w => !['CIA', 'BBA', 'BCA', 'MCA', 'BSE', 'LLM', 'CSE', 'ECE', 'MBA', 'AND', 'FOR', 'THE'].includes(w)
  );
  if (allCapsWords.length > 0) stressScore += 1.2;

  // Determine stress tier
  let stressLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  if (stressScore >= 5) {
    stressLevel = 'Critical';
  } else if (stressScore >= 2.5) {
    stressLevel = 'High';
  } else if (stressScore >= 1) {
    stressLevel = 'Moderate';
  } else {
    stressLevel = 'Low';
  }

  // Determine valence
  let valence: 'Positive' | 'Neutral' | 'Negative';
  if (valenceScore >= 1.5) {
    valence = 'Positive';
  } else if (valenceScore <= -1) {
    valence = 'Negative';
  } else {
    valence = 'Neutral';
  }

  // Colors and badges
  let color = '#22c55e';
  let badgeBg = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  let icon = 'ri-heart-pulse-line';

  if (stressLevel === 'Critical') {
    color = '#ef4444';
    badgeBg = 'bg-rose-500/15 text-rose-600 border-rose-500/30';
    icon = 'ri-alarm-warning-line';
  } else if (stressLevel === 'High') {
    color = '#f97316';
    badgeBg = 'bg-orange-500/15 text-orange-600 border-orange-500/30';
    icon = 'ri-temp-hot-line';
  } else if (stressLevel === 'Moderate') {
    color = '#f59e0b';
    badgeBg = 'bg-amber-500/15 text-amber-600 border-amber-500/30';
    icon = 'ri-scales-3-line';
  }

  const uniqueSignals = Array.from(new Set(matchedSignals)).slice(0, 4);

  return {
    stressLevel,
    valence,
    confidence: Math.min(0.95, 0.5 + Math.min(uniqueSignals.length * 0.12, 0.45)),
    label: `Estimated: ${stressLevel} Stress · ${valence} Valence`,
    color,
    badgeBg,
    icon,
    keySignals: uniqueSignals,
  };
}
