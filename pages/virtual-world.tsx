import { FC } from 'react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const Scene = dynamic(() => import('./components/MinecraftScene'), {
  ssr: false,
});

// Controls overlay component
const ControlsOverlay: FC = () => {
  return (
    <div className="absolute bottom-5 left-0 right-0 flex justify-center pointer-events-none">
      <div className="bg-black bg-opacity-70 text-white p-4 rounded-lg max-w-md">
        <h3 className="text-xl font-bold mb-2">Controls:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><span className="font-mono font-bold">W, A, S, D</span> - Move character</li>
          <li><span className="font-mono font-bold">SPACE</span> - Jump</li>
          <li><span className="font-mono font-bold">E</span> - Pick up / drop blocks</li>
          <li><span className="font-mono font-bold">Left Click</span> - Place new block</li>
        </ul>
      </div>
    </div>
  );
};

const MinecraftPage: FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh' }} className="relative">
      <Scene />
      <ControlsOverlay />
    </div>
  );
};

export default MinecraftPage;