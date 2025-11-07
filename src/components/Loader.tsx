"use client";

import { LineWave } from "react-loader-spinner";

const Loader = () => {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center justify-center">
        <LineWave
          visible={true}
          height="120"
          width="120"
          color="#14B8A6"
          ariaLabel="line-wave-loading"
          wrapperStyle={{}}
        />
        <p className="mt-6 text-teal-400 text-lg font-semibold tracking-wide animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
};

export default Loader;
