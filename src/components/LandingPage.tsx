import { motion } from "motion/react";
import { ArrowRight, Calculator, Sigma, Pi, Divide, X } from "lucide-react";

export default function LandingPage({ onStart }: { onStart: () => void }) {
  // Generate random positions for background elements
  const backgroundElements = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: 10 + Math.random() * 20,
    delay: Math.random() * 5,
    icon: [Calculator, Sigma, Pi, Divide, X][Math.floor(Math.random() * 5)],
    size: 20 + Math.random() * 40,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-900 text-white font-sans">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {backgroundElements.map((el) => (
          <motion.div
            key={el.id}
            className="absolute text-slate-700/20"
            initial={{ x: `${el.x}vw`, y: `${el.y}vh`, rotate: el.rotation }}
            animate={{
              y: [`${el.y}vh`, `${(el.y + 50) % 100}vh`],
              rotate: [el.rotation, el.rotation + 360],
            }}
            transition={{
              duration: el.duration,
              repeat: Infinity,
              ease: "linear",
              delay: el.delay,
            }}
          >
            <el.icon size={el.size} />
          </motion.div>
        ))}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-indigo-900/20 to-slate-900/80" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="mb-6 inline-flex items-center justify-center p-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-sm">
            <Calculator className="w-6 h-6 text-indigo-400 mr-2" />
            <span className="text-indigo-200 font-medium">Master Mathematics</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
            Learn Math With Me
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Explore the beauty of numbers through interactive lessons and challenges.
            From algebra to calculus, let's solve it together.
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900"
          >
            <span>Let's Start</span>
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
