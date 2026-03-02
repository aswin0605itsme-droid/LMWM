import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, HeartPulse, Activity, Play, GitBranch, Wind, Globe, Dices, Cuboid } from "lucide-react";
import LieDetector from "./LieDetector";
import MathEmotionAnalyzer from "./MathEmotionAnalyzer";
import LifeEquationSimulator from "./LifeEquationSimulator";
import VisualProofAnimator from "./VisualProofAnimator";
import ProofAnalyzer from "./ProofAnalyzer";
import DynamicalSystemsChaos from "./DynamicalSystemsChaos";
import NonEuclideanGeometry from "./NonEuclideanGeometry";
import ProbabilityStatistics from "./ProbabilityStatistics";
import ThreeDGraphVisualizer from "./ThreeDGraphVisualizer";

interface DashboardProps {
  onBack: () => void;
}

export default function Dashboard({ onBack }: DashboardProps) {
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null);

  const features = [
    {
      id: 1,
      title: "Mathematical Lie Detector",
      subtitle: "Proof Consistency Analyzer",
      icon: ShieldAlert,
      color: "bg-red-500",
      iconColor: "text-red-400",
    },
    {
      id: 2,
      title: "Math Emotion Analyzer",
      subtitle: "Cognitive Pattern Tracker",
      icon: HeartPulse,
      color: "bg-pink-500",
      iconColor: "text-pink-400",
    },
    {
      id: 3,
      title: "Real-Time Life Equation Simulator",
      subtitle: "Model Real-World Scenarios",
      icon: Activity,
      color: "bg-emerald-500",
      iconColor: "text-emerald-400",
    },
    {
      id: 4,
      title: "Visual Proof Animator",
      subtitle: "Logic Visualization Engine",
      icon: Play,
      color: "bg-blue-500",
      iconColor: "text-blue-400",
    },
    {
      id: 5,
      title: "Proof Structure Analyzer",
      subtitle: "Logical Decomposition",
      icon: GitBranch,
      color: "bg-purple-500",
      iconColor: "text-purple-400",
    },
    {
      id: 6,
      title: "Dynamical Systems & Chaos Behavior Predictor",
      subtitle: "Lorenz Attractor & Butterfly Effect",
      icon: Wind,
      color: "bg-orange-500",
      iconColor: "text-orange-400",
    },
    {
      id: 7,
      title: "Non-Euclidean Geometry Universe Simulator",
      subtitle: "Curved Space Exploration",
      icon: Globe,
      color: "bg-indigo-500",
      iconColor: "text-indigo-400",
    },
    {
      id: 8,
      title: "Probability & Statistics Simulator",
      subtitle: "Chance, Distributions & CLT",
      icon: Dices,
      color: "bg-teal-500",
      iconColor: "text-teal-400",
    },
    {
      id: 9,
      title: "3D Graph Visualizer",
      subtitle: "Plot 3D Functions & Surfaces",
      icon: Cuboid,
      color: "bg-cyan-500",
      iconColor: "text-cyan-400",
    },
  ];

  if (selectedFeature === 1) {
    return <LieDetector onBack={() => setSelectedFeature(null)} />;
  }

  if (selectedFeature === 2) {
    return <MathEmotionAnalyzer onBack={() => setSelectedFeature(null)} />;
  }

  if (selectedFeature === 3) {
    return <LifeEquationSimulator onBack={() => setSelectedFeature(null)} />;
  }

  if (selectedFeature === 4) {
    return <VisualProofAnimator onBack={() => setSelectedFeature(null)} />;
  }

  if (selectedFeature === 5) {
    return <ProofAnalyzer onBack={() => setSelectedFeature(null)} />;
  }

  if (selectedFeature === 6) {
    return <DynamicalSystemsChaos onBack={() => setSelectedFeature(null)} />;
  }

  if (selectedFeature === 7) {
    return <NonEuclideanGeometry onBack={() => setSelectedFeature(null)} />;
  }

  if (selectedFeature === 8) {
    return <ProbabilityStatistics onBack={() => setSelectedFeature(null)} />;
  }

  if (selectedFeature === 9) {
    return <ThreeDGraphVisualizer onBack={() => setSelectedFeature(null)} />;
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 50 } as const
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-sans">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto"
      >
        <motion.div variants={item} className="mb-12 text-center">
          <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-indigo-200 mb-4">
            Select a Module
          </h2>
          <p className="text-slate-400 text-lg">Choose a tool to begin your mathematical journey</p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          {features.map((feature) => (
            <motion.button
              key={feature.id}
              variants={item}
              whileHover={{ scale: 1.02, translateY: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedFeature(feature.id)}
              className="group relative flex flex-col items-start p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition-all duration-300 overflow-hidden text-left w-full h-full"
            >
              <div className={`absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 rounded-full ${feature.color} opacity-5 blur-3xl group-hover:opacity-10 transition-opacity`} />
              
              <div className={`mb-6 p-4 rounded-2xl ${feature.color} bg-opacity-10 ring-1 ring-inset ring-white/10`}>
                <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
              </div>
              
              <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-white transition-colors">
                {feature.title}
              </h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                {feature.subtitle}
              </p>
              
              <div className="mt-auto pt-6 flex items-center text-xs font-bold tracking-wider text-slate-500 uppercase group-hover:text-slate-300 transition-colors">
                <span>Module 0{feature.id}</span>
                <div className="ml-3 h-px flex-1 bg-slate-800 group-hover:bg-slate-700 transition-colors" />
              </div>
            </motion.button>
          ))}
        </div>

        <motion.div variants={item} className="mt-16 text-center">
          <button 
            onClick={onBack}
            className="px-6 py-3 rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-all text-sm font-medium"
          >
            ← Return to Home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
