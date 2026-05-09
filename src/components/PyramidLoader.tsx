"use client";

import React from "react";

const PyramidLoader = () => {
  return (
    <div className="pyramid-container">
      <div className="pyramid-loader">
        <div className="wrapper">
          <span className="side side1" />
          <span className="side side2" />
          <span className="side side3" />
          <span className="side side4" />
          <span className="shadow" />
        </div>
      </div>
      <p className="loading-text">Loading...</p>

      {/* Native CSS loads instantly, preventing the "white text" flash */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .pyramid-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .pyramid-loader {
          position: relative;
          width: 300px;
          height: 300px;
          display: block;
          transform-style: preserve-3d;
          transform: rotateX(-20deg);
        }

        .wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: spin 4s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotateY(360deg); }
        }

        .pyramid-loader .wrapper .side {
          width: 80px;
          height: 80px;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          margin: auto;
          transform-origin: center top;
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }

        .pyramid-loader .wrapper .side1 {
          transform: rotateZ(-30deg) rotateY(90deg);
          background: conic-gradient(#0f172a, #2dd4bf, #14b8a6, #04070c);
        }

        .pyramid-loader .wrapper .side2 {
          transform: rotateZ(30deg) rotateY(90deg);
          background: conic-gradient(#04070c, #14b8a6, #2dd4bf, #0f172a);
        }

        .pyramid-loader .wrapper .side3 {
          transform: rotateX(30deg);
          background: conic-gradient(#04070c, #14b8a6, #2dd4bf, #0f172a);
        }

        .pyramid-loader .wrapper .side4 {
          transform: rotateX(-30deg);
          background: conic-gradient(#0f172a, #2dd4bf, #14b8a6, #04070c);
        }

        .pyramid-loader .wrapper .shadow {
          width: 70px;
          height: 70px;
          background: #2dd4bf;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          margin: auto;
          transform: rotateX(90deg) translateZ(-45px);
          filter: blur(15px);
          opacity: 0.5;
        }

        .loading-text {
          margin-top: -60px;
          color: #2dd4bf;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          font-weight: 600;
          text-shadow: 0 0 10px rgba(45, 212, 191, 0.5);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `,
        }}
      />
    </div>
  );
};

export default PyramidLoader;
