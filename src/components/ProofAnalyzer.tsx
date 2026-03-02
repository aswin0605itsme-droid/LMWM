import { useState } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, Search, CheckCircle, AlertTriangle, FileText, ArrowRight, GitBranch, Terminal, Cpu, Share2, AlertOctagon, HelpCircle, BookOpen } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import ProofGraph from './ProofGraph';

interface ProofAnalyzerProps {
  onBack: () => void;
}

interface AnalysisResult {
  premises: { id: string; statement: string; symbolic: string }[];
  steps: {
    id: string;
    statement: string;
    symbolic: string;
    justification: string;
    dependencies: string[];
    error?: string;
    errorType?: 'circular' | 'invalid' | 'missing' | 'none';
  }[];
  conclusion: { id: string; statement: string; symbolic: string };
  proofType: string;
  validity: 'Valid' | 'Invalid' | 'Incomplete';
  feedback: string;
  explanation: string;
  graphExplanation: string;
}

export default function ProofAnalyzer({ onBack }: ProofAnalyzerProps) {
  const [inputProof, setInputProof] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logic' | 'graph' | 'explain'>('logic');

  const handleAnalyze = async () => {
    if (!inputProof.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Analyze the following mathematical proof text. 
      Convert it into a formal logical structure and provide a detailed explanation.
      
      Tasks:
      1. Identify Premises (P1, P2...).
      2. Identify Steps (S1, S2...) and Conclusion (C1).
      3. Convert each statement to Symbolic Logic (using ∀, ∃, →, ↔, ∧, ∨, ¬, ∈, ⊆, etc.).
      4. Identify Dependencies: Which previous steps/premises support this step?
      5. Detect Errors:
         - Circular Reasoning: Does a step depend on itself or a future step?
         - Invalid Inference: Does the logic not follow from premises?
         - Missing Assumption: Is a step used that wasn't declared?
      6. Explain the Proof: Provide a clear, step-by-step walkthrough of the proof in plain English.
      7. Explain the Graph: Provide a specific explanation of the dependency structure (e.g., "The proof flows linearly from P1 to S1...", or "There is a branching structure where S1 and S2 independently support S3...").
      
      Proof text:
      "${inputProof}"
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              premises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    statement: { type: Type.STRING },
                    symbolic: { type: Type.STRING }
                  }
                }
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    statement: { type: Type.STRING },
                    symbolic: { type: Type.STRING },
                    justification: { type: Type.STRING },
                    dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    error: { type: Type.STRING, description: "Description of the error if any" },
                    errorType: { type: Type.STRING, enum: ["circular", "invalid", "missing", "none"] }
                  }
                }
              },
              conclusion: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  statement: { type: Type.STRING },
                  symbolic: { type: Type.STRING }
                }
              },
              proofType: { type: Type.STRING },
              validity: { type: Type.STRING, enum: ["Valid", "Invalid", "Incomplete"] },
              feedback: { type: Type.STRING },
              explanation: { type: Type.STRING, description: "A detailed natural language explanation of the proof logic." },
              graphExplanation: { type: Type.STRING, description: "Explanation of the dependency graph structure." }
            }
          }
        }
      });

      if (response.text) {
        const parsedResult = JSON.parse(response.text) as AnalysisResult;
        setResult(parsedResult);
        if (parsedResult.steps.length > 0) setActiveTab('logic');
      } else {
        throw new Error("No response from AI");
      }

    } catch (err) {
      console.error("Analysis failed:", err);
      setError("Failed to analyze the proof. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Prepare graph data
  const graphNodes = result ? [
    ...result.premises.map(p => ({ id: p.id, label: p.symbolic, type: 'premise' as const, validity: 'valid' as const })),
    ...result.steps.map(s => ({ 
      id: s.id, 
      label: s.symbolic, 
      type: 'step' as const, 
      validity: (s.errorType && s.errorType !== 'none') ? s.errorType : 'valid' as const 
    })),
    { id: result.conclusion.id, label: result.conclusion.symbolic, type: 'conclusion' as const, validity: 'valid' as const }
  ] : [];

  const graphLinks = result ? [
    ...result.steps.flatMap(s => s.dependencies.map(dep => ({ source: dep, target: s.id }))),
  ] : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center px-4 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-500" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">
              Proof Logic Engine
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 border border-slate-700">v2.2.0</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-md border border-slate-800">
             <Cpu className="w-3 h-3 text-emerald-500" />
             <span className="text-xs text-slate-400 font-mono">SYSTEM READY</span>
           </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane: Editor */}
        <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-925">
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              Proof Editor
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !inputProof.trim()}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs rounded-md font-medium transition-all flex items-center gap-2"
            >
              {isAnalyzing ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-3 h-3" />
              )}
              {isAnalyzing ? 'Processing...' : 'Analyze'}
            </button>
          </div>
          <div className="flex-1 relative">
            <textarea
              value={inputProof}
              onChange={(e) => setInputProof(e.target.value)}
              placeholder="// Enter mathematical proof...&#10;Theorem: The sum of two even integers is even.&#10;Proof:&#10;Let x and y be even integers.&#10;Then x = 2k and y = 2m for integers k, m.&#10;x + y = 2k + 2m = 2(k + m).&#10;Since k + m is integer, x + y is even."
              className="w-full h-full bg-slate-950 p-4 text-slate-300 font-mono text-sm focus:outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
          {error && (
            <div className="p-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </div>
          )}
        </div>

        {/* Right Pane: Visualization & Logic */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/30">
            <button
              onClick={() => setActiveTab('logic')}
              className={`px-4 py-3 text-xs font-medium uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'logic' 
                  ? 'border-purple-500 text-white bg-slate-800/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Symbolic Logic
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-4 py-3 text-xs font-medium uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'graph' 
                  ? 'border-purple-500 text-white bg-slate-800/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <Share2 className="w-4 h-4" />
              Dependency Graph
            </button>
            <button
              onClick={() => setActiveTab('explain')}
              className={`px-4 py-3 text-xs font-medium uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'explain' 
                  ? 'border-purple-500 text-white bg-slate-800/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Explanation
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {!result ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <Cpu className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-sm font-mono">Waiting for input stream...</p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Status Bar */}
                <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 uppercase">Type:</span>
                      <span className="text-xs text-slate-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">{result.proofType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 uppercase">Status:</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        result.validity === 'Valid' ? 'text-emerald-400 bg-emerald-500/10' : 
                        result.validity === 'Invalid' ? 'text-red-400 bg-red-500/10' : 'text-yellow-400 bg-yellow-500/10'
                      }`}>
                        {result.validity === 'Valid' && <CheckCircle className="w-3 h-3" />}
                        {result.validity === 'Invalid' && <AlertTriangle className="w-3 h-3" />}
                        {result.validity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  {activeTab === 'logic' && (
                    <div className="space-y-6 max-w-3xl mx-auto">
                      {/* Premises */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          Axioms & Premises
                        </h3>
                        {result.premises.map((p) => (
                          <div key={p.id} className="flex gap-4 group">
                            <div className="w-8 text-right font-mono text-xs text-blue-400 pt-1 opacity-50 group-hover:opacity-100">{p.id}</div>
                            <div className="flex-1 bg-slate-900/50 rounded border border-slate-800 p-3 hover:border-blue-500/30 transition-colors">
                              <div className="font-mono text-sm text-blue-200 mb-1">{p.symbolic}</div>
                              <div className="text-xs text-slate-500">{p.statement}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Steps */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-6 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          Inference Steps
                        </h3>
                        {result.steps.map((s) => (
                          <div key={s.id} className="flex gap-4 group">
                            <div className="w-8 text-right font-mono text-xs text-purple-400 pt-1 opacity-50 group-hover:opacity-100">{s.id}</div>
                            <div className={`flex-1 bg-slate-900/50 rounded border p-3 transition-colors ${s.error ? 'border-red-500/30 bg-red-500/5' : 'border-slate-800 hover:border-purple-500/30'}`}>
                              <div className="flex justify-between items-start gap-4">
                                <div className="font-mono text-sm text-purple-200 mb-1">{s.symbolic}</div>
                                <div className="text-[10px] font-mono text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  FROM: {s.dependencies.join(', ') || '—'}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 mb-1">{s.statement}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-slate-600 uppercase tracking-wider">By:</span>
                                <span className="text-xs text-slate-400 italic">{s.justification}</span>
                              </div>
                              {s.error && (
                                <div className="mt-2 text-xs text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded">
                                  {s.errorType === 'circular' ? <AlertOctagon className="w-3 h-3" /> : 
                                   s.errorType === 'missing' ? <HelpCircle className="w-3 h-3" /> :
                                   <AlertTriangle className="w-3 h-3" />}
                                  {s.error}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Conclusion */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-6 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          Final Conclusion
                        </h3>
                        <div className="flex gap-4">
                          <div className="w-8 text-right font-mono text-xs text-emerald-400 pt-1 opacity-50">{result.conclusion.id}</div>
                          <div className="flex-1 bg-emerald-500/5 rounded border border-emerald-500/20 p-4">
                            <div className="font-mono text-lg text-emerald-300 mb-2">{result.conclusion.symbolic}</div>
                            <div className="text-sm text-emerald-400/70">{result.conclusion.statement}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'graph' && (
                    <div className="flex flex-col gap-6">
                      <div className="h-[600px] relative w-full">
                        <ProofGraph nodes={graphNodes} links={graphLinks} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Analysis Report</h4>
                          <p className="text-sm text-slate-300 leading-relaxed">{result.feedback}</p>
                        </div>
                        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Graph Explanation</h4>
                          <p className="text-sm text-slate-300 leading-relaxed">{result.graphExplanation}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'explain' && (
                    <div className="max-w-3xl mx-auto">
                      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-8">
                        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-purple-500" />
                          Proof Walkthrough
                        </h3>
                        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-200 prose-p:text-slate-400 prose-strong:text-slate-200 prose-code:text-purple-300 prose-code:bg-purple-500/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                          <ReactMarkdown>{result.explanation}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
