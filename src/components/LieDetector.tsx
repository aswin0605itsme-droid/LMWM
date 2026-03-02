import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, ScanEye, BrainCircuit, CheckCircle, XCircle, ArrowLeft, AlertTriangle, FileText, Activity, Upload, Image as ImageIcon, X, Camera, Aperture, Keyboard } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface LieDetectorProps {
  onBack: () => void;
}

export default function LieDetector({ onBack }: LieDetectorProps) {
  const [introComplete, setIntroComplete] = useState(false);
  const [proof, setProof] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'camera' | 'upload'>('text');
  const [validationMessage, setValidationMessage] = useState<{ type: 'warning' | 'error', text: string } | null>(null);
  
  // 3D Visualization Interaction State
  const [rotation, setRotation] = useState({ x: -20, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const deltaX = clientX - lastMousePos.current.x;
    const deltaY = clientY - lastMousePos.current.y;
    
    setRotation(prev => ({
      x: Math.max(-60, Math.min(10, prev.x - deltaY * 0.5)), // Limit vertical rotation
      y: prev.y + deltaX * 0.5
    }));
    
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Intro Animation Sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroComplete(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Camera handling
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (activeTab === 'camera' && isCameraOpen) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Error accessing camera:", err);
          // Don't auto-close, let user see error or retry
        });
    } else {
      // Stop stream if switching away from camera tab or closing camera
      if (stream) {
        (stream as MediaStream).getTracks().forEach(track => track.stop());
      }
    }

    return () => {
      if (stream) {
        (stream as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [activeTab, isCameraOpen]);

  const analyzeImageQuality = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Downscale for performance
      const scale = Math.min(1, 500 / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let totalBrightness = 0;
      let totalEdgeScore = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
        
        // Simple horizontal edge detection (difference with neighbor)
        if (i + 4 < data.length) {
           const r2 = data[i+4];
           const g2 = data[i+5];
           const b2 = data[i+6];
           totalEdgeScore += Math.abs(r - r2) + Math.abs(g - g2) + Math.abs(b - b2);
        }
      }
      
      const pixelCount = data.length / 4;
      const avgBrightness = totalBrightness / pixelCount;
      const avgEdgeScore = totalEdgeScore / pixelCount; 
      
      if (avgBrightness < 50) {
        setValidationMessage({ type: 'warning', text: "Image is quite dark. Ensure good lighting for best results." });
      } else if (avgBrightness > 220) {
        setValidationMessage({ type: 'warning', text: "Image is very bright. Glare might affect analysis." });
      } else if (avgEdgeScore < 10) { 
        setValidationMessage({ type: 'warning', text: "Image appears blurry or low contrast. Text may be hard to read." });
      } else {
        setValidationMessage(null);
      }
    };
    img.src = dataUrl;
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        setIsCameraOpen(false);
        analyzeImageQuality(dataUrl);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImage(result);
        analyzeImageQuality(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setValidationMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateText = (text: string): boolean => {
    if (!text.trim()) return false;
    
    // Check parentheses balance
    const openP = (text.match(/\(/g) || []).length;
    const closeP = (text.match(/\)/g) || []).length;
    if (openP !== closeP) {
      setValidationMessage({ type: 'error', text: `Mismatched parentheses: ${openP} '(' and ${closeP} ')' detected.` });
      return false;
    }
    
    const openB = (text.match(/\[/g) || []).length;
    const closeB = (text.match(/\]/g) || []).length;
    if (openB !== closeB) {
      setValidationMessage({ type: 'error', text: `Mismatched brackets: ${openB} '[' and ${closeB} ']' detected.` });
      return false;
    }

    // Check for suspicious operator sequences (e.g., "+++" or "**/" unless valid like "**" for power)
    // Allow "**" (power), "//" (comment or floor div in some langs), "++" (increment), "--" (decrement)
    // But "+++" or "*/" or "/+" might be typos in standard math notation context
    if (/[\+\-\*\/]{3,}/.test(text)) {
       setValidationMessage({ type: 'warning', text: "Suspicious sequence of mathematical operators detected. Please verify." });
       // Warning only, don't block
       return true;
    }

    // Check for invalid start/end operators
    if (/^[\*\/\^%]/.test(text)) {
       setValidationMessage({ type: 'error', text: "Expression cannot start with this operator." });
       return false;
    }
    if (/[\+\-\*\/\^%]$/.test(text)) {
       setValidationMessage({ type: 'error', text: "Expression cannot end with an operator." });
       return false;
    }

    setValidationMessage(null);
    return true;
  };

  const analyzeProof = async () => {
    setValidationMessage(null);
    
    const hasText = !!proof.trim();
    const hasImage = !!image;

    if (!hasText && !hasImage) {
      setValidationMessage({ type: 'error', text: "Please provide input (text or image)." });
      return;
    }

    if (hasText) {
      if (!validateText(proof)) return;
    }
    
    // Image quality check is passive (warning only), so we don't block.
    
    setIsAnalyzing(true);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let prompt = `
        You are a "Mathematical Lie Detector". Your task is to analyze the user's input, which can be a mathematical question, a statement, or a proof.
        
        Analyze the input from beginner to intelligent levels.
        
        1. Solve the problem or verify the statement/proof.
        2. Determine if the input leads to a valid/true conclusion or contains a correct mathematical statement.
        3. If the input is a question (e.g., "What is 2+2?"), the "truth value" is considered TRUE if the question is mathematically valid and solvable.
        4. If the input is a statement (e.g., "2+2=5"), the "truth value" is FALSE.
        
        Please provide the output in the following JSON format:
        {
          "isValid": boolean,
          "displayMessage": "The given question contains a true value" (if isValid is true) OR "The given question contains a false value" (if isValid is false),
          "exactResult": "The precise answer or solution to the problem.",
          "stepByStep": "A concise step-by-step derivation or verification.",
          "complexity": "Beginner | Intermediate | Advanced",
          "explanation": "Clear explanation of why it is true or false.",
          "truthPercentage": number (0-100, representing the probability/confidence of truth),
          "liePercentage": number (0-100, representing the probability/confidence of falsehood, should be 100 - truthPercentage)
        }
        Do not include markdown formatting in the response, just the raw JSON.
      `;

      const parts: any[] = [{ text: prompt }];

      if (proof.trim()) {
        parts.push({ text: `User Input: "${proof}"` });
      }

      if (image) {
        // Extract base64 data
        const base64Data = image.split(',')[1];
        parts.push({
          inlineData: {
            mimeType: "image/jpeg", // Assuming jpeg/png, Gemini handles common formats
            data: base64Data
          }
        });
        parts.push({ text: "Also analyze the mathematical content in this image." });
      }

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config: { responseMimeType: "application/json" }
      });
      
      const responseText = result.text;
      
      if (!responseText) {
        throw new Error("No response text received");
      }
      
      // Clean up markdown if present
      let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      // Extract JSON if wrapped in text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
          jsonStr = jsonMatch[0];
      }
      const data = JSON.parse(jsonStr);
      
      setResult(data);
    } catch (error) {
      console.error("Analysis failed", error);
      setResult({
        isValid: false,
        displayMessage: "Error analyzing input",
        exactResult: "N/A",
        stepByStep: "Could not process request",
        complexity: "Unknown",
        explanation: "Please try again. Ensure the image is clear if uploaded.",
        truthPercentage: 0,
        liePercentage: 0
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!introComplete) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-red-500 font-mono">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <ShieldAlert size={80} />
        </motion.div>
        
        <div className="space-y-4 text-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold tracking-widest uppercase"
          >
            Initializing Protocol
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-sm text-red-400/70"
          >
            Loading Logic Engines...
          </motion.div>

          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "200px" }}
            transition={{ delay: 1.5, duration: 1.5, ease: "easeInOut" }}
            className="h-1 bg-red-600 mx-auto rounded-full"
          />

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.8 }}
            className="text-xs text-red-300"
          >
            SYSTEM READY
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="max-w-5xl mx-auto"
      >
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
                <ShieldAlert className="text-red-500" />
                Mathematical Lie Detector
              </h1>
              <p className="text-slate-400 text-sm">Proof Consistency Analyzer</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-500 border border-slate-800 px-3 py-1 rounded-full">
            <Activity size={14} className="animate-pulse text-green-500" />
            SYSTEM ACTIVE
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <label className="block text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                Input Method
              </label>

              {/* Input Tabs */}
              <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'text' 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Keyboard size={16} />
                  <span className="hidden sm:inline">Manual</span>
                </button>
                <button
                  onClick={() => { setActiveTab('camera'); setIsCameraOpen(true); }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'camera' 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Camera size={16} />
                  <span className="hidden sm:inline">Camera</span>
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'upload' 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Upload size={16} />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              </div>
              
              <div className="min-h-[200px]">
                {/* Manual Text Input */}
                {activeTab === 'text' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <textarea
                      value={proof}
                      onChange={(e) => setProof(e.target.value)}
                      placeholder="Type your question or proof here... (e.g., 'What is 2+2?' or 'Prove that...')"
                      className="w-full h-48 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none font-mono text-sm"
                    />
                  </motion.div>
                )}

                {/* Camera Input */}
                {activeTab === 'camera' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {isCameraOpen && !image ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="w-full h-48 object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                          <button 
                            onClick={capturePhoto}
                            className="p-3 bg-white rounded-full shadow-lg hover:bg-slate-200 transition-colors"
                          >
                            <Aperture className="text-black" size={24} />
                          </button>
                        </div>
                      </div>
                    ) : image ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                        <img src={image} alt="Captured" className="w-full h-48 object-contain bg-black/50" />
                        <button 
                          onClick={() => { setImage(null); setIsCameraOpen(true); }}
                          className="absolute top-2 right-2 p-1 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full transition-colors"
                        >
                          <Camera size={16} />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                          <ImageIcon size={12} /> Photo Captured
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => setIsCameraOpen(true)}
                        className="border-2 border-dashed border-slate-700 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all group"
                      >
                        <Camera className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mb-2 transition-colors" />
                        <span className="text-sm text-slate-400 group-hover:text-slate-300">Start Camera</span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Upload Input */}
                {activeTab === 'upload' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {!image ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all group"
                      >
                        <Upload className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mb-2 transition-colors" />
                        <span className="text-sm text-slate-400 group-hover:text-slate-300">Click to Upload Image</span>
                        <span className="text-xs text-slate-600 mt-1">JPG, PNG supported</span>
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                        <img src={image} alt="Uploaded" className="w-full h-48 object-contain bg-black/50" />
                        <button 
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors"
                        >
                          <X size={16} />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                          <ImageIcon size={12} /> Image Uploaded
                        </div>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </motion.div>
                )}
              </div>

              {/* Status Indicators */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 text-xs">
                  {proof && activeTab !== 'text' && (
                    <div className="text-indigo-400 flex items-center gap-1">
                      <Keyboard size={12} /> Text proof saved
                    </div>
                  )}
                  {image && activeTab !== 'upload' && activeTab !== 'camera' && (
                    <div className="text-indigo-400 flex items-center gap-1">
                      <ImageIcon size={12} /> Image attached
                    </div>
                  )}
                </div>

                {/* Validation Message */}
                <AnimatePresence>
                  {validationMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                        validationMessage.type === 'error' 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}
                    >
                      <AlertTriangle size={14} />
                      {validationMessage.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={analyzeProof}
                  disabled={isAnalyzing || (!proof.trim() && !image)}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 w-full md:w-auto justify-center"
                >
                  {isAnalyzing ? (
                    <>
                      <ScanEye className="animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <BrainCircuit /> Analyze Consistency
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions / Tips */}
            <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/50 text-sm text-slate-400">
              <h3 className="text-slate-300 font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-500" />
                How it works
              </h3>
              <p>
                Use <strong>Manual Entry</strong> to type your question/proof, <strong>Camera</strong> to snap a photo, or <strong>Upload</strong> for existing images. 
                The system analyzes the input to determine if it contains a true or false value and provides the exact result.
              </p>
            </div>
          </div>

          {/* Results Section */}
          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait">
              {!result && !isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-slate-600 p-8 border-2 border-dashed border-slate-800 rounded-2xl"
                >
                  <ScanEye size={48} className="mb-4 opacity-50" />
                  <p>Awaiting Input Data...</p>
                </motion.div>
              )}

              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center p-8"
                >
                  <div className="relative w-24 h-24 mb-8">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-4 border-slate-800 border-t-red-500 rounded-full"
                    />
                    <motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-4 border-4 border-slate-800 border-b-indigo-500 rounded-full"
                    />
                  </div>
                  <div className="font-mono text-red-400 animate-pulse">
                    SCANNING LOGIC STRUCTURE...
                  </div>
                </motion.div>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  {/* Verdict Card */}
                  <div className={`p-6 rounded-2xl border relative overflow-hidden ${result.isValid ? 'bg-green-900/20 border-green-500/50' : 'bg-red-950/30 border-red-500/50'}`}>
                    
                    {/* Bloody Effect for Lies */}
                    {!result.isValid && (
                      <div className="absolute inset-0 pointer-events-none z-0">
                        {/* Dark vignette */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(120,0,0,0.2)_100%)]" />
                        
                        {/* Drips */}
                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ height: 0, opacity: 0.8 }}
                            animate={{ height: [0, 60 + Math.random() * 100], opacity: [0.8, 0] }}
                            transition={{ 
                              duration: 3 + Math.random() * 2, 
                              repeat: Infinity, 
                              repeatDelay: Math.random() * 3,
                              ease: "easeIn"
                            }}
                            className="absolute top-0 w-1.5 bg-red-700 rounded-b-full blur-[1px]"
                            style={{ left: `${15 + Math.random() * 70}%` }}
                          />
                        ))}
                        
                        {/* Splatter spots */}
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={`splat-${i}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.4 }}
                            transition={{ delay: 0.5 + i * 0.5, duration: 0.2 }}
                            className="absolute bg-red-800 rounded-full blur-md"
                            style={{
                              top: `${20 + Math.random() * 60}%`,
                              left: `${10 + Math.random() * 80}%`,
                              width: `${20 + Math.random() * 40}px`,
                              height: `${20 + Math.random() * 40}px`,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <div className="relative z-10 flex items-center gap-4 mb-4">
                      {result.isValid ? (
                        <CheckCircle className="text-green-500 w-10 h-10" />
                      ) : (
                        <XCircle className="text-red-500 w-10 h-10" />
                      )}
                      <div>
                        <h2 className={`text-xl font-bold ${result.isValid ? 'text-green-400' : 'text-red-400'}`}>
                          {result.displayMessage}
                        </h2>
                        <div className="text-xs font-mono text-slate-400 mt-1 uppercase">
                          Level: {result.complexity}
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {result.explanation}
                    </p>
                  </div>

                  {/* 3D Truth vs Lie Visualization */}
                  <div 
                    className={`bg-slate-900/80 p-8 rounded-2xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden min-h-[400px] transition-colors ${isDragging ? 'cursor-grabbing border-indigo-500/50' : 'cursor-grab'}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleMouseMove}
                    onTouchEnd={handleMouseUp}
                  >
                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                      <div className="bg-black/40 backdrop-blur px-3 py-1 rounded-full text-xs text-slate-400 border border-slate-700/50 pointer-events-none">
                        Drag to rotate
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setRotation({ x: -20, y: 30 }); }}
                        className="bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded-lg transition-colors border border-slate-700"
                        title="Reset View"
                      >
                        <Activity size={14} />
                      </button>
                    </div>

                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-12 z-10 pointer-events-none">Truth vs Lie Probability (3D Analysis)</h3>
                    
                    <div className="flex items-end justify-center gap-20 h-64 w-full max-w-md pointer-events-none" style={{ perspective: '1000px' }}>
                      
                      {/* Truth Bar */}
                      <div className="relative flex flex-col items-center group/bar">
                        <div 
                          className="text-green-400 font-bold mb-4 text-2xl drop-shadow-lg transition-transform duration-100"
                          style={{ transform: `translateY(${rotation.x * 0.5}px)` }}
                        >
                          {result.truthPercentage}%
                        </div>
                        <div 
                          className="relative w-20 transition-all duration-100 ease-out"
                          style={{ 
                            height: `${Math.max(result.truthPercentage * 2.5, 20)}px`,
                            transformStyle: 'preserve-3d',
                            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
                          }}
                        >
                          {/* Front */}
                          <div className="absolute inset-0 bg-green-500/90 border border-green-400/50" style={{ transform: 'translateZ(20px)' }} />
                          {/* Back */}
                          <div className="absolute inset-0 bg-green-800/90 border border-green-400/50" style={{ transform: 'translateZ(-20px)' }} />
                          {/* Right */}
                          <div className="absolute inset-y-0 right-0 w-[40px] bg-green-600/90 border-r border-green-400/50 origin-right" style={{ transform: 'rotateY(90deg) translateX(20px)' }} />
                          {/* Left */}
                          <div className="absolute inset-y-0 left-0 w-[40px] bg-green-600/90 border-l border-green-400/50 origin-left" style={{ transform: 'rotateY(-90deg) translateX(-20px)' }} />
                          {/* Top */}
                          <div className="absolute top-0 inset-x-0 h-[40px] bg-green-400/90 border border-green-300/50 origin-top" style={{ transform: 'rotateX(90deg) translateY(-20px)' }} />
                        </div>
                        <div className="mt-8 text-green-500 font-mono text-sm tracking-widest uppercase font-bold">Truth Rate</div>
                      </div>

                      {/* Lie Bar */}
                      <div className="relative flex flex-col items-center group/bar">
                        <div 
                          className="text-red-400 font-bold mb-4 text-2xl drop-shadow-lg transition-transform duration-100"
                          style={{ transform: `translateY(${rotation.x * 0.5}px)` }}
                        >
                          {result.liePercentage}%
                        </div>
                        <div 
                          className="relative w-20 transition-all duration-100 ease-out"
                          style={{ 
                            height: `${Math.max(result.liePercentage * 2.5, 20)}px`,
                            transformStyle: 'preserve-3d',
                            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
                          }}
                        >
                          {/* Front */}
                          <div className="absolute inset-0 bg-red-500/90 border border-red-400/50" style={{ transform: 'translateZ(20px)' }} />
                          {/* Back */}
                          <div className="absolute inset-0 bg-red-800/90 border border-red-400/50" style={{ transform: 'translateZ(-20px)' }} />
                          {/* Right */}
                          <div className="absolute inset-y-0 right-0 w-[40px] bg-red-600/90 border-r border-red-400/50 origin-right" style={{ transform: 'rotateY(90deg) translateX(20px)' }} />
                          {/* Left */}
                          <div className="absolute inset-y-0 left-0 w-[40px] bg-red-600/90 border-l border-red-400/50 origin-left" style={{ transform: 'rotateY(-90deg) translateX(-20px)' }} />
                          {/* Top */}
                          <div className="absolute top-0 inset-x-0 h-[40px] bg-red-400/90 border border-red-300/50 origin-top" style={{ transform: 'rotateX(90deg) translateY(-20px)' }} />
                        </div>
                        <div className="mt-8 text-red-500 font-mono text-sm tracking-widest uppercase font-bold">Lie Rate</div>
                      </div>

                    </div>
                    
                    {/* Floor Grid Effect */}
                    <div 
                      className="absolute bottom-0 w-[200%] h-64 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)] opacity-20 pointer-events-none transition-transform duration-100" 
                      style={{ transform: `perspective(500px) rotateX(${60 + rotation.x * 0.5}deg) rotateY(${rotation.y * 0.2}deg) translateY(50px)` }} 
                    />
                  </div>

                  {/* Exact Result */}
                  <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Exact Result</h3>
                    <div className="font-mono text-indigo-300 bg-slate-950 p-3 rounded-lg border border-slate-800/50 overflow-x-auto whitespace-pre-wrap text-lg">
                      {result.exactResult}
                    </div>
                  </div>

                  {/* Step by Step */}
                  <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Analysis Breakdown</h3>
                    <div className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                      {result.stepByStep}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
