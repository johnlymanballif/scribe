"use client";

import { useEffect, useState } from "react";
import { LOADING_PHRASES } from "@/lib/constants";

export default function LoadingStatus() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-20 animate-in fade-in duration-700">
      <div className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
      </div>
      <div className="h-6 overflow-hidden flex flex-col items-center">
        <span
          key={index}
          className="text-sm font-medium text-secondary animate-in slide-in-from-bottom-2 fade-in duration-500"
        >
          {LOADING_PHRASES[index]}
        </span>
      </div>
    </div>
  );
}
