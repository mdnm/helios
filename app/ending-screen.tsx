"use client";

import { Horizon } from "./horizon";

const ENDING_SIZE = 340;

export function EndingScreen() {
  return (
    <main className="screen ending-screen" aria-labelledby="ending-title">
      <div className="warm-sky" aria-hidden="true" />
      <Horizon />
      <div className="ending-composition">
        <div className="ending-mark" aria-hidden="true">
          <div
            className="sun-slot sun-slot-ending"
            style={{ width: ENDING_SIZE, height: ENDING_SIZE }}
          />
        </div>
        <div className="claim">
          <h1 id="ending-title" className="claim-title">epilot Helios</h1>
          <p className="claim-sub">Energy made casual.</p>
        </div>
      </div>
    </main>
  );
}
