'use client';

import React, { useState, useMemo, useEffect } from 'react';
import notebookCellsRaw from '../lib/notebookData.json';

interface CellOutput {
  type: 'stream' | 'html' | 'image' | 'text' | 'error';
  text?: string;
  data?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

interface NotebookCell {
  id: number;
  type: 'code' | 'markdown';
  execution_count: number | null;
  source: string;
  outputs: CellOutput[];
}

// Simple fast Python syntax highlighter
function highlightPython(code: string): React.ReactNode[] {
  const lines = code.split('\n');

  return lines.map((line, lineIdx) => {
    // Check for comment
    const commentIdx = line.indexOf('#');
    const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';

    // Tokenize strings, keywords, numbers, builtins
    const tokens: React.ReactNode[] = [];
    const regex = /(".*?"|'.*?'|\b(?:import|from|as|def|return|class|if|elif|else|for|while|in|try|except|finally|with|lambda|pass|raise|yield|and|or|not|is|None|True|False)\b|\b(?:print|len|range|dict|list|set|tuple|int|float|str|round|sum|max|min|enumerate|zip|open|type)\b|\b\d+(?:\.\d+)?\b|[a-zA-Z_][a-zA-Z0-9_]*|[^\s\w])/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(codePart)) !== null) {
      const textBefore = codePart.slice(lastIndex, match.index);
      if (textBefore) tokens.push(textBefore);

      const token = match[0];
      const isString = (token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"));
      const isKeyword = /^(?:import|from|as|def|return|class|if|elif|else|for|while|in|try|except|finally|with|lambda|pass|raise|yield|and|or|not|is|None|True|False)$/.test(token);
      const isBuiltin = /^(?:print|len|range|dict|list|set|tuple|int|float|str|round|sum|max|min|enumerate|zip|open|type)$/.test(token);
      const isNumber = /^\d+(?:\.\d+)?$/.test(token);

      if (isString) {
        tokens.push(<span key={match.index} className="text-emerald-700 dark:text-emerald-400">{token}</span>);
      } else if (isKeyword) {
        tokens.push(<span key={match.index} className="text-purple-700 dark:text-purple-400 font-semibold">{token}</span>);
      } else if (isBuiltin) {
        tokens.push(<span key={match.index} className="text-sky-700 dark:text-sky-400 font-medium">{token}</span>);
      } else if (isNumber) {
        tokens.push(<span key={match.index} className="text-amber-700 dark:text-amber-400">{token}</span>);
      } else {
        tokens.push(token);
      }

      lastIndex = regex.lastIndex;
    }

    const remaining = codePart.slice(lastIndex);
    if (remaining) tokens.push(remaining);
    if (commentPart) {
      tokens.push(<span key="comment" className="text-zinc-500 dark:text-zinc-400 italic">{commentPart}</span>);
    }

    return (
      <div key={lineIdx} className="table-row leading-relaxed">
        <span className="table-cell select-none pr-4 text-right text-zinc-400 dark:text-zinc-500 text-xs font-mono w-8">
          {lineIdx + 1}
        </span>
        <span className="table-cell font-mono text-[13px] whitespace-pre text-zinc-900 dark:text-zinc-100">
          {tokens.length > 0 ? tokens : ' '}
        </span>
      </div>
    );
  });
}

// Markdown cell renderer
function renderMarkdown(content: string) {
  const lines = content.split('\n');
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none space-y-2 text-zinc-800 dark:text-zinc-200">
      {lines.map((line, idx) => {
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white pt-2 pb-1 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <span className="text-amber-500 font-normal">#</span>
              {line.replace('# ', '')}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white pt-3 pb-1 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <span className="text-amber-500 font-normal">##</span>
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 pt-2 flex items-center gap-1.5">
              <span className="text-amber-500 font-normal">###</span>
              {line.replace('### ', '')}
            </h3>
          );
        }
        if (line.startsWith('* ') || line.startsWith('- ')) {
          return (
            <li key={idx} className="ml-4 text-sm list-disc text-zinc-800 dark:text-zinc-200 font-medium">
              {line.replace(/^[*|-]\s+/, '')}
            </li>
          );
        }
        if (!line.trim()) return <div key={idx} className="h-1.5" />;

        // Simple bold parser
        const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
        return (
          <p key={idx} className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
            {parts.map((p, pIdx) => {
              if (p.startsWith('**') && p.endsWith('**')) {
                return <strong key={pIdx} className="font-semibold text-zinc-900 dark:text-white">{p.slice(2, -2)}</strong>;
              }
              if (p.startsWith('`') && p.endsWith('`')) {
                return (
                  <code key={pIdx} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-amber-700 dark:text-amber-400 font-mono text-xs border border-zinc-200 dark:border-zinc-700">
                    {p.slice(1, -1)}
                  </code>
                );
              }
              return p;
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function ColabNotebook() {
  const [cells] = useState<NotebookCell[]>(notebookCellsRaw as NotebookCell[]);
  const [executingCellId, setExecutingCellId] = useState<number | null>(null);
  const [executedCells, setExecutedCells] = useState<Record<number, { count: number; time: string }>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showToc, setShowToc] = useState(true);
  const [copiedCellId, setCopiedCellId] = useState<number | null>(null);
  const [hideOutputs, setHideOutputs] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Initialize executed state with notebook default execution counts
  useEffect(() => {
    const initial: Record<number, { count: number; time: string }> = {};
    cells.forEach((c) => {
      if (c.type === 'code' && c.execution_count) {
        initial[c.id] = { count: c.execution_count, time: '0.4s' };
      }
    });
    setExecutedCells(initial);
  }, [cells]);

  // Extract table of contents headers
  const tocItems = useMemo(() => {
    return cells
      .filter((c) => c.type === 'markdown' && c.source.startsWith('#'))
      .map((c) => {
        const firstLine = c.source.split('\n')[0];
        const level = firstLine.startsWith('### ') ? 3 : firstLine.startsWith('## ') ? 2 : 1;
        const title = firstLine.replace(/^#+\s+/, '');
        return { id: c.id, level, title };
      });
  }, [cells]);

  // Filtered cells based on search query
  const filteredCells = useMemo(() => {
    if (!searchQuery.trim()) return cells;
    const q = searchQuery.toLowerCase();
    return cells.filter((c) => c.source.toLowerCase().includes(q));
  }, [cells, searchQuery]);

  // Execute single cell simulation
  const handleRunCell = (cellId: number) => {
    setExecutingCellId(cellId);
    setTimeout(() => {
      setExecutedCells((prev) => ({
        ...prev,
        [cellId]: {
          count: (prev[cellId]?.count || Object.keys(prev).length) + 1,
          time: `${(Math.random() * 0.4 + 0.1).toFixed(2)}s`,
        },
      }));
      setExecutingCellId(null);
    }, 450);
  };

  // Run all cells simulation
  const handleRunAll = () => {
    setIsRunningAll(true);
    let index = 0;
    const codeCellIds = cells.filter((c) => c.type === 'code').map((c) => c.id);

    const interval = setInterval(() => {
      if (index >= codeCellIds.length) {
        clearInterval(interval);
        setIsRunningAll(false);
        setExecutingCellId(null);
        return;
      }
      const cellId = codeCellIds[index];
      setExecutingCellId(cellId);
      setExecutedCells((prev) => ({
        ...prev,
        [cellId]: {
          count: index + 1,
          time: `${(Math.random() * 0.3 + 0.1).toFixed(2)}s`,
        },
      }));
      index++;
    }, 180);
  };

  const handleCopyCode = (cellId: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCellId(cellId);
    setTimeout(() => setCopiedCellId(null), 2000);
  };

  const scrollToCell = (cellId: number) => {
    const el = document.getElementById(`cell-${cellId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xl text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* 1. Google Colab Top Application Bar */}
      <header className="bg-zinc-50/90 dark:bg-[#121214] border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 select-none">
        {/* Left: Colab Brand & File Name & Credits */}
        <div className="flex items-center gap-3">
          {/* Colab Interlocking Rings Logo */}
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-xl shadow-xs">
            <i className="ri-infinity-line text-2xl"></i>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                ML_Exploration.ipynb
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                Python 3 (ipykernel)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                Dept of Statistics and Data Science
              </span>
            </div>

            {/* Subtitle / Authors */}
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 pt-0.5 flex-wrap">
              <span className="font-medium text-zinc-800 dark:text-zinc-300">Team:</span>
              <span>Darshan Gowda G S (2582439)</span>
              <span>•</span>
              <span>Sumedha KN (2582424)</span>
              <span>•</span>
              <span>Shaina Veigas (2582418)</span>
            </div>

            {/* Menu Bar (Colab Style) */}
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 pt-1 font-medium">
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">File</span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">Edit</span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">View</span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">Insert</span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">Runtime</span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">Tools</span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">Help</span>
            </div>
          </div>
        </div>

        {/* Right: Runtime Connection & Resource Usage Meters */}
        <div className="flex items-center gap-3 self-end lg:self-auto flex-wrap">
          {/* Resource Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">Connected</span>
            <span className="text-zinc-400">|</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span>RAM: <strong>2.1/12.7 GB</strong></span>
              <span>·</span>
              <span>Disk: <strong>24.5/107.7 GB</strong></span>
            </div>
          </div>

          {/* Download Raw Notebook */}
          <a
            href="/ML_Exploration.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-colors"
            title="Open original HTML export"
          >
            <i className="ri-external-link-line"></i>
            <span>Raw HTML</span>
          </a>
        </div>
      </header>

      {/* 2. Google Colab Secondary Action Toolbar */}
      <div className="bg-zinc-100/70 dark:bg-[#161618] border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunAll}
            disabled={isRunningAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isRunningAll ? (
              <>
                <i className="ri-loader-4-line animate-spin text-sm"></i>
                <span>Running All...</span>
              </>
            ) : (
              <>
                <i className="ri-play-fill text-sm"></i>
                <span>Run all</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowToc(!showToc)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
              showToc
                ? 'bg-zinc-200 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white'
                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
            }`}
            title="Toggle Outline / Table of Contents"
          >
            <i className="ri-list-check-2"></i>
            <span>Outline ({tocItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setHideOutputs(!hideOutputs)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium transition-colors cursor-pointer"
          >
            <i className={hideOutputs ? 'ri-eye-line' : 'ri-eye-off-line'}></i>
            <span>{hideOutputs ? 'Show Outputs' : 'Hide Outputs'}</span>
          </button>
        </div>

        {/* Search within notebook */}
        <div className="relative">
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search code or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 sm:w-64 pl-7 pr-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* 3. Main Workspace with STICKY Outline Drawer + Notebook Cells */}
      <div className="flex flex-1 relative items-start">
        {/* Table of Contents Sticky Drawer */}
        {showToc && (
          <aside className="w-64 sm:w-72 bg-zinc-50 dark:bg-[#121214] border-r border-zinc-200 dark:border-zinc-800 p-4 shrink-0 overflow-y-auto max-h-[calc(100vh-6rem)] sticky top-20 self-start z-20 rounded-bl-xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-200 dark:border-zinc-800 mb-3">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <i className="ri-list-unordered"></i> Outline
              </span>
              <button
                type="button"
                onClick={() => setShowToc(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
                title="Close outline"
              >
                <i className="ri-close-line text-base"></i>
              </button>
            </div>
            <nav className="space-y-1 text-xs">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToCell(item.id)}
                  className={`w-full text-left py-1.5 px-2 rounded-lg hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400 transition-colors truncate cursor-pointer ${
                    item.level === 1
                      ? 'font-bold text-zinc-900 dark:text-zinc-100'
                      : item.level === 2
                      ? 'pl-4 font-semibold text-zinc-700 dark:text-zinc-300'
                      : 'pl-6 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {item.title}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Notebook Cells Flow */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-x-hidden min-w-0">
          {filteredCells.map((cell) => {
            const isCode = cell.type === 'code';
            const isExecuting = executingCellId === cell.id;
            const executionState = executedCells[cell.id];
            const execCountDisplay = executionState?.count ?? cell.execution_count ?? ' ';

            return (
              <div
                key={cell.id}
                id={`cell-${cell.id}`}
                className="group relative border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl p-1 transition-all"
              >
                {isCode ? (
                  /* Code Cell */
                  <div className="flex flex-col rounded-xl bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    {/* Code Cell Header & Gutter */}
                    <div className="flex items-center bg-zinc-50 dark:bg-[#161618] px-3.5 py-2 border-b border-zinc-200 dark:border-zinc-800">
                      {/* Execution play button / count */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRunCell(cell.id)}
                          disabled={isExecuting}
                          className="w-6 h-6 rounded-full flex items-center justify-center bg-zinc-200 hover:bg-amber-500 hover:text-white dark:bg-zinc-800 dark:hover:bg-amber-500 text-zinc-700 dark:text-zinc-300 text-xs transition-colors cursor-pointer shrink-0"
                          title="Execute cell (Ctrl+Enter)"
                        >
                          {isExecuting ? (
                            <i className="ri-loader-4-line animate-spin text-amber-500"></i>
                          ) : (
                            <i className="ri-play-fill"></i>
                          )}
                        </button>

                        <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 select-none">
                          [{execCountDisplay}]
                        </span>

                        {executionState?.time && (
                          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-medium">
                            ✓ {executionState.time}
                          </span>
                        )}
                      </div>

                      {/* Top Right Cell Controls */}
                      <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(cell.id, cell.source)}
                          className="px-2 py-0.5 rounded-md text-[11px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1 cursor-pointer transition-colors font-medium"
                        >
                          <i className={copiedCellId === cell.id ? 'ri-check-line text-emerald-600' : 'ri-file-copy-line'}></i>
                          <span>{copiedCellId === cell.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Syntax Highlighted Code Body */}
                    <div className="p-4 overflow-x-auto bg-[#f8fafc] dark:bg-[#0d0d0e] border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="table w-full">
                        {highlightPython(cell.source)}
                      </div>
                    </div>

                    {/* Cell Output Container (Attached below code cell) */}
                    {!hideOutputs && cell.outputs.length > 0 && (
                      <div className="bg-white dark:bg-[#121214] p-4 space-y-3">
                        {cell.outputs.map((out, outIdx) => {
                          if (out.type === 'stream') {
                            return (
                              <pre
                                key={outIdx}
                                className="font-mono text-xs text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800"
                              >
                                {out.text}
                              </pre>
                            );
                          }
                          if (out.type === 'text') {
                            return (
                              <pre
                                key={outIdx}
                                className="font-mono text-xs text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed p-1"
                              >
                                {out.data}
                              </pre>
                            );
                          }
                          if (out.type === 'html' && out.data) {
                            return (
                              <div
                                key={outIdx}
                                className="overflow-x-auto my-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-zinc-100 [&_th]:dark:bg-zinc-800 [&_th]:p-2.5 [&_th]:text-left [&_th]:border-b [&_th]:border-zinc-200 [&_th]:dark:border-zinc-700 [&_th]:font-bold [&_td]:p-2.5 [&_td]:border-b [&_td]:border-zinc-100 [&_td]:dark:border-zinc-800 [&_tr:hover]:bg-zinc-50 [&_tr:hover]:dark:bg-zinc-800/50 font-mono"
                                dangerouslySetInnerHTML={{ __html: out.data }}
                              />
                            );
                          }
                          if (out.type === 'image' && out.data) {
                            const imgSrc = `data:image/png;base64,${out.data}`;
                            return (
                              <div key={outIdx} className="relative group/img my-2 inline-block">
                                <img
                                  src={imgSrc}
                                  alt={`Cell ${cell.id} plot`}
                                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 max-w-full h-auto shadow-sm cursor-zoom-in hover:brightness-105 transition-all bg-white"
                                  onClick={() => setSelectedImage(imgSrc)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setSelectedImage(imgSrc)}
                                  className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-black/75 text-white text-[11px] font-medium opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer"
                                >
                                  <i className="ri-zoom-in-line"></i> Expand
                                </button>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Markdown Cell */
                  <div className="py-2.5 px-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                    {renderMarkdown(cell.source)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Image Modal Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-white dark:bg-zinc-900 p-3 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-zinc-200 dark:border-zinc-800 mb-2">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Plot Visualization High-Res View
              </span>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer p-1"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh]">
              <img
                src={selectedImage}
                alt="Enlarged visualization"
                className="max-w-full h-auto mx-auto rounded-lg bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
