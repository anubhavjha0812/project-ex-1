import React, { useRef, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import Webcam from "react-webcam";
import "./App.css";
import { drawHand } from "./utilities";
import * as fp from "fingerpose";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [message, setMessage] = useState("Start Hand Detection!");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modelActive, setModelActive] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [gestureConfidence, setGestureConfidence] = useState(0); // Confidence state

  const runHandpose = async () => {
    try {
      const net = await handpose.load();
      console.log("Handpose model loaded.");
      setMessage("Handpose model is ready!");
      return net;
    } catch (error) {
      console.error("Error loading handpose model:", error);
      setMessage("Failed to load Handpose model.");
    }
  };

  const detect = async (net) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const hand = await net.estimateHands(video);

      if (hand.length > 0) {
        const GE = new fp.GestureEstimator([
          fp.Gestures.VictoryGesture,
          fp.Gestures.ThumbsUpGesture,
        ]);
        const gesture = await GE.estimate(hand[0].landmarks, 8);

        if (gesture.gestures && gesture.gestures.length > 0) {
          const highestGesture = gesture.gestures.reduce((prev, current) =>
            prev.score > current.score ? prev : current
          );

          setGestureConfidence(highestGesture.score); // Update confidence

          if (highestGesture.score > 0.9) {
            console.log(`Sign Detected: ${highestGesture.name}`);
            setMessage(`${highestGesture.name} Detected!`);
          }
        } else {
          setGestureConfidence(0); // Reset confidence if no gesture
          setMessage(null); // Reset message when no gesture detected
        }
      }

      const ctx = canvasRef.current.getContext("2d");
      drawHand(hand, ctx);
    }
  };

  const toggleModel = async () => {
    if (!modelActive) {
      const net = await runHandpose();
      const id = setInterval(() => {
        detect(net);
      }, 100);
      setIntervalId(id);
      setModelActive(true);
      setMessage("Detection Started!");
    } else {
      clearInterval(intervalId);
      setModelActive(false);
      setMessage("Detection Stopped!");
    }
  };

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalId]);

  return (
    <div className="App">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-content">
          <button
            className="menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
          <h1 className="logo">Sign Detection App</h1>
          <div className="login-section">
            <span>Username</span>
            <button className="login-button">Login</button>
          </div>
        </div>
      </nav>

      {/* Side Menu */}
      <div className={`side-menu ${menuOpen ? "open" : ""}`}>
        <ul>
          <li>Home</li>
          <li>About</li>
          <li>Settings</li>
          <li>Logout</li>
        </ul>
      </div>

      {/* Main Content */}
      <main className="main-content">
        <p className={`message ${message ? "bold-message" : ""}`}>{message}</p> {/* Enhanced message */}
        <div className="webcam-container">
          <Webcam ref={webcamRef} className="webcam" />
          <canvas ref={canvasRef} className="canvas" />
        </div>

        {/* Confidence Bar */}
        <div className="confidence-bar-container">
          <div
            className="confidence-bar"
            style={{
              width: `${gestureConfidence * 100}%`,
              backgroundColor: gestureConfidence > 0.9 ? "green" : "orange",
            }}
          ></div>
        </div>

        <button
          className="toggle-button"
          onClick={toggleModel}
          style={{
            backgroundColor: modelActive ? "red" : "green",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            fontSize: "16px",
            cursor: "pointer",
            marginTop: "1rem"
          }}
        >
          {modelActive ? "Stop Detection" : "Start Detection"}
        </button>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2024 Sign Detection App. Built with React and TensorFlow.js</p>
      </footer>
    </div>
  );
}

export default App;
