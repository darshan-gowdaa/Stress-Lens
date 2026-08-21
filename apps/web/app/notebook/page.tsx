import Navbar from '../components/Navbar';

export default function NotebookPage() {
  return (
    <>
      <Navbar currentPath="notebook" />
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col min-h-screen">
        <div className="mb-6 animate-fade-in-up shrink-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-on-background)] mb-2">
            ML Exploration Notebook <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 align-middle">Auto-Generated from pipeline</span>
          </h1>
          <p className="text-[var(--color-on-surface-variant)] text-sm max-w-3xl leading-relaxed">
            This interactive Jupyter Notebook demonstrates the underlying data pipeline, embedding generation, 
            machine learning training (Random Forest + MLflow), and topic modeling using BERTopic.
          </p>
        </div>
        
        <div className="clay flex-1 rounded-[var(--radius-xl)] overflow-hidden animate-fade-in w-full mb-8 min-h-[1200px] shadow-sm relative group">
<a href="/ML_Exploration.html" target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 z-50 bg-white/90 backdrop-blur text-sm px-3 py-1.5 rounded-md shadow opacity-0 group-hover:opacity-100 transition-opacity text-slate-700 hover:text-slate-900 flex items-center gap-1"><i className="ri-external-link-line"></i> Fullscreen</a>
          <iframe 
            src="/ML_Exploration.html" 
            className="w-full h-full min-h-[1200px] border-none"
            title="Jupyter Notebook"
          />
        </div>
      </main>
    </>
  );
}
