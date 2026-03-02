import { motion } from 'motion/react';

export function EuclidScene({ progress }: { progress: number }) {
  // Steps:
  // 0-20: List Primes {2, 3, 5}
  // 20-40: Multiply -> 30
  // 40-60: Add 1 -> 31
  // 60-80: Check Divisibility
  // 80-100: Conclusion

  const step = Math.floor(progress / 20);

  return (
    <div className="w-full h-full bg-slate-900 rounded-xl shadow-2xl border border-slate-800 flex flex-col items-center justify-center p-8 font-mono">
      <div className="space-y-8 text-center">
        
        {/* Step 1: Primes */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: step >= 0 ? 1 : 0, y: step >= 0 ? 0 : 20 }}
          className="text-xl text-blue-400"
        >
          Primes: P = {'{2, 3, 5}'}
        </motion.div>

        {/* Step 2: Product */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 20 }}
          className="text-2xl text-white font-bold"
        >
          N = 2 × 3 × 5 = 30
        </motion.div>

        {/* Step 3: Add 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 20 }}
          className="text-3xl text-pink-500 font-bold"
        >
          Q = N + 1 = 31
        </motion.div>

        {/* Step 4: Check Divisibility */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 20 }}
          className="text-sm text-slate-400 space-y-2"
        >
          <p>31 ÷ 2 = 15 rem 1</p>
          <p>31 ÷ 3 = 10 rem 1</p>
          <p>31 ÷ 5 = 6 rem 1</p>
        </motion.div>

        {/* Step 5: Conclusion */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: step >= 4 ? 1 : 0, scale: step >= 4 ? 1 : 0.9 }}
          className="text-lg text-green-400 font-bold border-t border-slate-700 pt-4"
        >
          31 is a new prime!
          <br/>
          <span className="text-xs font-normal text-slate-500">
            (Or has a prime factor not in P)
          </span>
        </motion.div>

      </div>
      
      <div className="absolute bottom-8 text-xs text-slate-600">
        Euclid's Theorem: Infinitude of Primes
      </div>
    </div>
  );
}
