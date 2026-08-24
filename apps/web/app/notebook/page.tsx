import Navbar from '../components/Navbar';
import ColabNotebook from '../components/ColabNotebook';

export const metadata = {
  title: 'ML Exploration Notebook | StressLens',
  description: 'Interactive Google Colab / Jupyter Notebook demonstrating NLP vectorization, supervised stress prediction, and BERTopic clustering.',
};

export default function NotebookPage() {
  return (
    <>
      <Navbar currentPath="notebook" />
      <main className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-6 flex flex-col min-h-screen">
        <ColabNotebook />
      </main>
    </>
  );
}

