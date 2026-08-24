import Navbar from '../components/Navbar';

export const metadata = {
  title: 'ML Exploration Notebook | StressLens',
  description: 'Interactive Jupyter Notebook demonstrating NLP vectorization, supervised stress prediction, and BERTopic clustering.',
};

export default function NotebookPage() {
  return (
    <>
      <Navbar currentPath="notebook" />
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col min-h-screen">
        {/* Header */}
        <div className="mb-6 animate-fade-in-up shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-on-surface)]">
                  ML Exploration & Data Science Pipeline
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  All 8 Modules Executed
                </span>
              </div>
              <p className="text-[var(--color-on-surface-variant)] text-xs sm:text-sm mt-1.5 max-w-3xl leading-relaxed">
                Interactive Jupyter Notebook showcasing data sanitization, SBERT vectorization, Random Forest classification,
                unsupervised BERTopic topic modeling, and Differential Privacy ($k \ge 5$).
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <a
                href="/ML_Exploration.html"
                target="_blank"
                rel="noopener noreferrer"
                className="clay-btn flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium transition-all"
              >
                <i className="ri-external-link-line text-base"></i> Fullscreen
              </a>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="clay p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                Model Accuracy
              </span>
              <span className="text-xl font-extrabold text-emerald-600 tabular-nums">95.1%</span>
              <span className="text-[10px] text-[var(--color-on-surface-variant)]">Random Forest F1: 0.95</span>
            </div>
            <div className="clay p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                Inference Latency
              </span>
              <span className="text-xl font-extrabold text-[var(--color-primary)] tabular-nums">8.4 ms</span>
              <span className="text-[10px] text-[var(--color-on-surface-variant)]">Sub-10ms p95 latency</span>
            </div>
            <div className="clay p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                BERTopic Themes
              </span>
              <span className="text-xl font-extrabold text-purple-600 tabular-nums">5 Topics</span>
              <span className="text-[10px] text-[var(--color-on-surface-variant)]">UMAP + HDBSCAN clusters</span>
            </div>
            <div className="clay p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                Privacy Guarantee
              </span>
              <span className="text-xl font-extrabold text-amber-600 tabular-nums">k ≥ 5</span>
              <span className="text-[10px] text-[var(--color-on-surface-variant)]">Laplace Mechanism ε=0.5</span>
            </div>
          </div>
        </div>

        {/* Notebook iframe container */}
        <div className="clay flex-1 rounded-[var(--radius-xl)] overflow-hidden animate-fade-in w-full mb-8 min-h-[1400px] shadow-sm relative">
          <iframe
            src="/ML_Exploration.html"
            className="w-full h-full min-h-[1400px] border-none"
            title="StressLens Machine Learning Exploration Notebook"
          />
        </div>
      </main>
    </>
  );
}
