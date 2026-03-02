import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HeartPulse, BrainCircuit, Timer, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw, ChevronRight, Activity, Zap, Trophy, XCircle, TrainFront } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import confetti from 'canvas-confetti';

interface MathEmotionAnalyzerProps {
  onBack: () => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'Kids' | 'Easy' | 'Intermediate' | 'Hard';
  topic: string;
}

interface QuestionMetric {
  questionId: string;
  timeTaken: number; // ms
  selectedOption: string | null; // null if timeout
  isCorrect: boolean;
  hesitationCount: number; // hovers over other options
}

interface ThinkingProfile {
  cognitiveState: string;
  hesitationAreas: string[];
  confusionPatterns: string[];
  strengths: string[];
  emotionalScore: number; // 0-100
  advice: string;
}

export default function MathEmotionAnalyzer({ onBack }: MathEmotionAnalyzerProps) {
  const [stage, setStage] = useState<'intro' | 'selection' | 'loading' | 'quiz' | 'analysis'>('intro');
  const [difficulty, setDifficulty] = useState<'Kids' | 'Easy' | 'Intermediate' | 'Hard'>('Intermediate');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [metrics, setMetrics] = useState<QuestionMetric[]>([]);
  const [profile, setProfile] = useState<ThinkingProfile | null>(null);
  
  // Interaction State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hoverCount, setHoverCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [showDeadLight, setShowDeadLight] = useState(false);

  // Refs
  const questionStartTime = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Intro Animation
  useEffect(() => {
    const timer = setTimeout(() => setStage('selection'), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Timer & Reset on new question
  useEffect(() => {
    if (stage === 'quiz') {
      questionStartTime.current = Date.now();
      setSelectedOption(null);
      setIsAnswered(false);
      setHoverCount(0);
      setTimeLeft(20);
      setShowDeadLight(false);

      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQuestionIndex, stage]);

  const handleTimeout = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    handleOptionClick(null); // Treat as timeout/wrong
  };

  const generateQuiz = async () => {
    setStage('loading');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Generate 15 unique ${difficulty} level math questions.
        Topics must include a mix of: Arithmetic, Algebra, Comparison, Probability, and Aptitude.
        For "Kids" level, focus on basic arithmetic and simple comparisons.
        For "Hard" level, include complex algebra and probability.
        
        For each problem, provide 4 options where only one is correct.
        
        Return a JSON ARRAY of objects: 
        [
          { 
            "id": "unique_id", 
            "question": "The problem text", 
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "The exact string of the correct option",
            "difficulty": "${difficulty}", 
            "topic": "Topic Name (e.g., Arithmetic, Probability)" 
          }
        ]
        No markdown. Just the JSON array.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      
      const text = result.text;
      if (text) {
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // Extract JSON if wrapped in text
        const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        }
        const data = JSON.parse(cleanText);
        setQuestions(Array.isArray(data) ? data : [data]);
        setStage('quiz');
        setCurrentQuestionIndex(0);
        setMetrics([]);
      }
    } catch (error) {
      console.error("Failed to generate quiz", error);
      setStage('selection'); // Go back on error
    }
  };

  const handleOptionClick = (option: string | null) => {
    if (isAnswered) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    setSelectedOption(option);
    setIsAnswered(true);

    const now = Date.now();
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = option === currentQuestion.correctAnswer;

    if (isCorrect) {
      // Party Blower Effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']
      });
    } else {
      // Bloody Dead Light Effect
      setShowDeadLight(true);
      setTimeout(() => setShowDeadLight(false), 800);
    }

    const newMetric: QuestionMetric = {
      questionId: currentQuestion.id,
      timeTaken: now - questionStartTime.current,
      selectedOption: option,
      isCorrect,
      hesitationCount: hoverCount
    };

    const newMetrics = [...metrics, newMetric];
    setMetrics(newMetrics);

    // Auto advance after delay
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        finishQuiz(newMetrics);
      }
    }, 1500);
  };

  const finishQuiz = async (finalMetrics: QuestionMetric[]) => {
    setStage('analysis');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        Analyze this student's mathematical thinking profile based on a 15-question quiz.
        
        Difficulty: ${difficulty}
        
        Performance Data:
        ${finalMetrics.map((m, i) => `
          Question ${i + 1}: ${questions[i].topic}
          - Correct: ${m.isCorrect}
          - Time: ${m.timeTaken}ms
          - Hesitation (Hovers): ${m.hesitationCount}
          - Timeout: ${m.selectedOption === null}
        `).join('\n')}
        
        Analyze for:
        1. Speed vs Accuracy (Impulsive? Cautious?)
        2. Topic Mastery (Which topics were strong/weak?)
        3. Emotional State (Stress based on time/hesitation?)
        
        Return JSON:
        {
          "cognitiveState": "Flow | Anxious | Impulsive | Cautious",
          "hesitationAreas": ["Specific topics or 'None'"],
          "confusionPatterns": ["Observations on errors"],
          "strengths": ["List strengths"],
          "emotionalScore": number (0-100, where 100 is Peak Performance),
          "advice": "Brief psychological and mathematical advice"
        }
      `;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const text = result.text;
      if (text) {
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // Extract JSON if wrapped in text
        const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            cleanText = jsonMatch[0];
        }
        setProfile(JSON.parse(cleanText));
      }
    } catch (error) {
      console.error("Analysis failed", error);
    }
  };

  if (stage === 'intro') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-pink-500 font-mono">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 relative"
        >
          <HeartPulse size={80} className="animate-pulse" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-pink-500/20 rounded-full blur-xl"
          />
        </motion.div>
        <h2 className="text-2xl font-bold tracking-widest uppercase mb-2">Neural Sync</h2>
        <p className="text-pink-400/70 text-sm">Calibrating Cognitive Sensors...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors"
            >
              <ArrowLeft className="text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <HeartPulse className="text-pink-500" />
                Math Emotion Analyzer
              </h1>
              <p className="text-slate-400 text-sm">Cognitive Pattern Tracker</p>
            </div>
          </div>
          {stage === 'quiz' && (
            <div className="flex items-center gap-4">
               <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${timeLeft <= 5 ? 'bg-red-900/50 border-red-500 text-red-400 animate-pulse' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                 <Timer size={16} />
                 <span className="font-mono font-bold">{timeLeft}s</span>
               </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-full border border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Progress</span>
                <span className="font-mono text-sm text-white">{currentQuestionIndex + 1}/{questions.length}</span>
              </div>
            </div>
          )}
        </header>

        {stage === 'selection' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 max-w-lg mx-auto mt-12"
          >
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-white mb-2">Select Difficulty</h2>
              <p className="text-slate-400">The system will analyze your thinking patterns as you solve.</p>
            </div>
            
            {(['Kids', 'Easy', 'Intermediate', 'Hard'] as const).map((level) => (
              <button
                key={level}
                onClick={() => { setDifficulty(level); generateQuiz(); }}
                className={`p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition-all flex items-center justify-between group ${difficulty === level ? 'ring-2 ring-pink-500/50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    level === 'Kids' ? 'bg-blue-500/20 text-blue-400' :
                    level === 'Easy' ? 'bg-green-500/20 text-green-400' :
                    level === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    <BrainCircuit size={24} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white">{level} Level</div>
                    <div className="text-xs text-slate-500">
                      {level === 'Kids' ? 'Arithmetic & Shapes' : 
                       level === 'Easy' ? 'Basic Concepts' : 
                       level === 'Intermediate' ? 'Mixed Topics' : 'Advanced Logic'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" />
              </button>
            ))}
          </motion.div>
        )}

        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32">
            <RefreshCw className="animate-spin text-pink-500 mb-4" size={48} />
            <h2 className="text-xl font-bold text-white">Generating Quiz...</h2>
            <p className="text-slate-400 mt-2">Crafting 15 questions across multiple topics...</p>
          </div>
        )}

        {stage === 'quiz' && questions.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-8"
              >
                {/* Question Card */}
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
                  
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-mono text-pink-400 border border-pink-500/30 px-3 py-1 rounded-full bg-pink-500/10">
                      {questions[currentQuestionIndex].topic}
                    </span>
                    <span className="text-slate-500 font-mono text-sm">
                      Question {currentQuestionIndex + 1}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    {questions[currentQuestionIndex].question}
                  </h2>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questions[currentQuestionIndex].options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrect = option === questions[currentQuestionIndex].correctAnswer;
                    
                    let buttonStyle = "border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600";
                    if (isAnswered) {
                      if (isSelected && isCorrect) buttonStyle = "border-green-500 bg-green-500/20 text-green-200";
                      else if (isSelected && !isCorrect) buttonStyle = "border-red-500 bg-red-500/20 text-red-200";
                      else if (!isSelected && isCorrect) buttonStyle = "border-green-500/50 bg-green-500/10 text-green-200/50"; // Show correct answer
                      else buttonStyle = "opacity-50 border-slate-800 bg-slate-900/30";
                    }

                    return (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => handleOptionClick(option)}
                        onMouseEnter={() => !isAnswered && setHoverCount(h => h + 1)}
                        disabled={isAnswered}
                        className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden group ${buttonStyle}`}
                      >
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="font-medium text-lg">{option}</span>
                          {isAnswered && isSelected && (
                            isCorrect ? <CheckCircle2 className="text-green-500" /> : <XCircle className="text-red-500" />
                          )}
                        </div>
                        {!isAnswered && (
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {stage === 'analysis' && (
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* 3D Train Result Animation - Thomas Style */}
              <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 overflow-hidden relative">
                <h3 className="text-center text-xl font-bold text-white mb-8 flex items-center justify-center gap-2">
                  <TrainFront className="text-blue-500" />
                  Performance Train
                </h3>
                
                <div className="relative h-64 w-full overflow-x-auto overflow-y-hidden perspective-container flex items-center justify-center bg-slate-950/50 rounded-xl border-t border-b border-slate-800" style={{ perspective: '1200px' }}>
                  
                  {/* Moving Track */}
                  <div className="absolute bottom-12 w-[200%] h-16 bg-slate-800/30" style={{ transform: 'rotateX(60deg) scale(2)' }}>
                    <motion.div 
                      animate={{ x: ["0%", "-50%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_40px,#475569_40px,#475569_50px)]"
                    />
                  </div>

                  <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: '-10%' }}
                    transition={{ duration: 2, ease: "easeOut" }} // Faster entrance
                    className="flex gap-2 items-end relative z-10 pb-16"
                    style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-15deg)' }}
                  >
                    {/* Thomas Engine */}
                    <div className="w-44 h-36 relative group" style={{ transformStyle: 'preserve-3d' }}>
                        {/* Main Body (Boiler) - Cyan/Blue */}
                        <div className="absolute bottom-4 left-8 w-28 h-20 bg-cyan-600 rounded-lg border-2 border-red-500 shadow-xl flex items-center justify-center" style={{ transform: 'translateZ(20px)' }}>
                          <div className="w-16 h-12 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-yellow-600">
                            <span className="text-2xl font-black text-red-600">1</span>
                          </div>
                        </div>
                        <div className="absolute bottom-4 left-8 w-28 h-20 bg-cyan-700 rounded-lg" style={{ transform: 'translateZ(-20px)' }} />
                        <div className="absolute bottom-4 right-8 w-20 h-20 bg-cyan-600 origin-right" style={{ transform: 'rotateY(90deg) translateZ(20px)' }} />
                        <div className="absolute bottom-24 left-8 w-28 h-20 bg-cyan-500 origin-top" style={{ transform: 'rotateX(90deg) translateZ(20px)' }} />
                        
                        {/* Cabin - Blue */}
                        <div className="absolute bottom-24 right-0 w-20 h-24 bg-cyan-600 border-2 border-red-500 rounded-t-lg" style={{ transform: 'translateZ(10px)' }}>
                          <div className="w-full h-full relative">
                            <div className="absolute top-2 left-2 right-2 h-8 bg-black/30 rounded-sm border border-black/50" /> {/* Window */}
                          </div>
                        </div>

                        {/* Face - Gray Circle on Front */}
                        <div className="absolute bottom-6 left-2 w-20 h-20 bg-gray-300 rounded-full border-4 border-gray-400 flex flex-col items-center justify-center shadow-lg" style={{ transform: 'rotateY(-90deg) translateZ(10px)' }}>
                          <div className="flex gap-4 mb-1">
                            <div className="w-3 h-3 bg-black rounded-full" />
                            <div className="w-3 h-3 bg-black rounded-full" />
                          </div>
                          <div className="w-8 h-3 border-b-4 border-black rounded-full" /> {/* Smile */}
                        </div>

                        {/* Chimney - Black */}
                        <div className="absolute bottom-24 left-12 w-8 h-12 bg-black rounded-t-lg border border-gray-700" style={{ transform: 'translateZ(10px)' }}>
                          {[...Array(5)].map((_, i) => (
                            <motion.div 
                              key={i}
                              initial={{ y: 0, scale: 0.5, opacity: 0.8 }}
                              animate={{ y: -60 - Math.random() * 40, scale: 2, opacity: 0, x: Math.random() * 20 - 10 }}
                              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                              className="absolute -top-2 left-1 w-6 h-6 bg-white/60 rounded-full blur-md"
                            />
                          ))}
                        </div>

                        {/* Wheels - Blue with Red spokes */}
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute -bottom-2 left-6 w-12 h-12 bg-cyan-800 rounded-full border-4 border-red-500 flex items-center justify-center"
                          style={{ transform: 'translateZ(25px)' }}
                        >
                          <div className="w-full h-1 bg-red-500" />
                          <div className="h-full w-1 bg-red-500 absolute" />
                        </motion.div>
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute -bottom-2 right-6 w-12 h-12 bg-cyan-800 rounded-full border-4 border-red-500 flex items-center justify-center"
                          style={{ transform: 'translateZ(25px)' }}
                        >
                          <div className="w-full h-1 bg-red-500" />
                          <div className="h-full w-1 bg-red-500 absolute" />
                        </motion.div>
                    </div>

                    {/* Connector */}
                    <div className="w-4 h-2 bg-black self-end mb-6" />

                    {/* Carriages - Annie/Clarabel Style (Orange/Brown) */}
                    {metrics.map((m, i) => (
                      <div key={i} className="flex items-end gap-1">
                        <div className="w-20 h-24 relative group" style={{ transformStyle: 'preserve-3d' }}>
                          <div className={`absolute bottom-4 inset-x-0 h-16 rounded-lg border-2 flex items-center justify-center shadow-lg ${m.isCorrect ? 'bg-orange-700 border-orange-500' : 'bg-red-800 border-red-600'}`} style={{ transform: 'translateZ(16px)' }}>
                            <span className="font-bold text-white text-xl">{i + 1}</span>
                            {/* Windows */}
                            <div className="absolute top-2 left-2 w-4 h-4 bg-white/80 rounded-sm" />
                            <div className="absolute top-2 right-2 w-4 h-4 bg-white/80 rounded-sm" />
                          </div>
                          <div className={`absolute bottom-4 inset-x-0 h-16 rounded-lg ${m.isCorrect ? 'bg-orange-800' : 'bg-red-900'}`} style={{ transform: 'translateZ(-16px)' }} />
                          <div className={`absolute bottom-4 right-0 w-16 h-16 origin-right ${m.isCorrect ? 'bg-orange-800' : 'bg-red-900'}`} style={{ transform: 'rotateY(90deg)' }} />
                          <div className={`absolute bottom-20 inset-x-0 h-16 origin-top ${m.isCorrect ? 'bg-orange-600' : 'bg-red-700'}`} style={{ transform: 'rotateX(90deg)' }} />
                          
                          {/* Wheels */}
                          <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="absolute -bottom-2 left-2 w-6 h-6 bg-black rounded-full border-2 border-gray-500" 
                              style={{ transform: 'translateZ(20px)' }} 
                          />
                          <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="absolute -bottom-2 right-2 w-6 h-6 bg-black rounded-full border-2 border-gray-500" 
                              style={{ transform: 'translateZ(20px)' }} 
                          />
                        </div>
                        {i < metrics.length - 1 && <div className="w-2 h-2 bg-black self-end mb-6" />}
                      </div>
                    ))}
                  </motion.div>
                </div>
                
                {/* Score Summary */}
                <div className="mt-4 text-center">
                   <div className="inline-block bg-slate-900/80 px-6 py-3 rounded-2xl border border-slate-700">
                      <span className="text-slate-400 text-sm uppercase tracking-wider mr-3">Final Score</span>
                      <span className="text-3xl font-black text-white">{metrics.filter(m => m.isCorrect).length} <span className="text-slate-500 text-xl">/ {questions.length}</span></span>
                   </div>
                </div>
              </div>

              {/* AI Analysis Section - Loads independently */}
              {!profile ? (
                <div className="flex flex-col items-center justify-center py-12 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed">
                  <BrainCircuit size={32} className="text-pink-500 animate-pulse mb-4" />
                  <h2 className="text-lg font-bold text-white">Analyzing Cognitive Patterns...</h2>
                  <p className="text-slate-400 text-sm mt-1">Generating your personalized thinking profile</p>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Main Score Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-3xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-2">{profile.cognitiveState}</h2>
                        <p className="text-slate-400">Dominant Cognitive State</p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-pink-400">{profile.emotionalScore}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Performance Score</div>
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-pink-300 mb-2 flex items-center gap-2">
                          <Timer size={14} /> Hesitation Areas
                        </h3>
                        <ul className="text-sm text-slate-300 space-y-1">
                          {(profile.hesitationAreas || []).map((area, i) => (
                            <li key={i}>• {area}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-yellow-300 mb-2 flex items-center gap-2">
                          <AlertCircle size={14} /> Confusion Patterns
                        </h3>
                        <ul className="text-sm text-slate-300 space-y-1">
                          {(profile.confusionPatterns || []).map((pattern, i) => (
                            <li key={i}>• {pattern}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Advice Section */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <CheckCircle2 className="text-green-500" />
                      Personalized Advice
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      {profile.advice}
                    </p>
                  </div>

                  <button
                    onClick={() => { setStage('selection'); setQuestions([]); setProfile(null); }}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-bold"
                  >
                    Analyze Another Session
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
        {/* Bloody Dead Light Effect Overlay */}
        <AnimatePresence>
          {showDeadLight && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
            >
              {/* Red Flash */}
              <div className="absolute inset-0 bg-red-600/40 mix-blend-overlay" />
              <div className="absolute inset-0 bg-gradient-to-r from-red-900/50 via-transparent to-red-900/50" />
              
              {/* "Dead Light" Glitch Text or Icon could go here, but keeping it as a visual flash for now */}
              <motion.div 
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative z-10"
              >
                <div className="text-red-500 font-black text-6xl tracking-widest uppercase drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse">
                  WRONG
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
