import { motion } from "framer-motion";
import SignUpEmail from "../components/SignUpEmail";
import { useState } from "react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", damping: 20, stiffness: 220 },
  },
};

const formIn = {
  hidden: { opacity: 0, x: 32, scale: 0.98 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", damping: 22, stiffness: 180 },
  },
};

//  helper state to see which form to show

export default function Home() {
  return (
    <motion.div
      className="min-h-screen bg-gradient-to-r from-indigo-500 to-blue-500 grid grid-cols-1 md:grid-cols-2 items-center px-6 md:px-12"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div className="justify-self-center flex flex-col gap-3 text-center md:text-left">
        <motion.h1
          className="text-[#f5e6e8] text-5xl md:text-6xl font-bold"
          variants={itemUp}
        >
          Organize Your files
        </motion.h1>
        <motion.h2
          className="text-[#f5e6e8] text-3xl md:text-4xl opacity-90"
          variants={itemUp}
        >
          In one place
        </motion.h2>
      </motion.div>

      <motion.div
        variants={formIn}
        className="justify-self-center w-full max-w-md"
      >
        <SignUpEmail />
      </motion.div>
    </motion.div>
  );
}
