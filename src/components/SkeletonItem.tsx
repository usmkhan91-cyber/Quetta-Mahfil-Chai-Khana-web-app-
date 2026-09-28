import React from 'react';
import { motion } from 'motion/react';

export default function SkeletonItem() {
  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden border-none shadow-2xl shadow-stone-200/50">
      <div className="h-72 relative bg-stone-50 animate-shimmer bg-[linear-gradient(90deg,transparent_25%,rgba(0,0,0,0.05)_50%,transparent_75%)] bg-[length:200%_100%]">
        <div className="absolute top-6 left-6 w-20 h-8 bg-stone-200/50 rounded-full" />
      </div>
      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <div className="h-8 w-3/4 bg-stone-100 rounded-xl animate-shimmer bg-[linear-gradient(90deg,transparent_25%,rgba(0,0,0,0.03)_50%,transparent_75%)] bg-[length:200%_100%]" />
          <div className="h-12 w-full bg-stone-50 rounded-xl animate-shimmer bg-[linear-gradient(90deg,transparent_25%,rgba(0,0,0,0.03)_50%,transparent_75%)] bg-[length:200%_100%]" />
        </div>
        <div className="h-14 w-full bg-stone-900/5 rounded-[1.5rem] animate-shimmer bg-[linear-gradient(90deg,transparent_25%,rgba(0,0,0,0.02)_50%,transparent_75%)] bg-[length:200%_100%]" />
      </div>
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <motion.div
           key={i}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, delay: i * 0.1 }}
        >
          <SkeletonItem />
        </motion.div>
      ))}
    </div>
  );
}
