import { motion } from "framer-motion";

export const GameBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 opacity-10">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
        animate={{
          rotate: [0, 360],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  </div>
);
