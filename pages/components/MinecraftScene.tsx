import { FC, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import MinecraftCharacter from './MinecraftCharacter';
import MinecraftWorld from './MinecraftWorld';

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

const MinecraftScene: FC = () => {
  const [holdingObject, setHoldingObject] = useState(false);
  const [heldObject, setHeldObject] = useState<THREE.Object3D | null>(null);
  const [showControls, setShowControls] = useState(true);
  
  // Store camera and scene references to make them available for raycasting
  const cameraRef = useRef<THREE.Camera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  
  // Make camera and scene available globally for raycasting
  useEffect(() => {
    if (cameraRef.current) {
      (window as any).threeCamera = cameraRef.current;
    }
    if (sceneRef.current) {
      (window as any).threeScene = sceneRef.current;
    }
    
    return () => {
      (window as any).threeCamera = null;
      (window as any).threeScene = null;
    };
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 50, 80], fov: 60 }} /* Zoomed out more with wider field of view */
      style={{ background: '#000000' }} /* Changed to black background */
      gl={{ antialias: true }}
      onCreated={({ camera, scene }) => {
        cameraRef.current = camera;
        sceneRef.current = scene;
        (window as any).threeCamera = camera;
        (window as any).threeScene = scene;
      }}
    >
      {/* Reduced gravity for slower falling blocks */}
      <Physics gravity={[0, -9.8, 0]}>
        <MinecraftWorld
          characterProps={{
            initialPosition: [0, 2, 0],
            holdingObject: holdingObject,
            heldObject: heldObject,
            onPickup: (object: THREE.Object3D) => {
              setHeldObject(object);
              setHoldingObject(true);
            },
            onDrop: () => {
              setHeldObject(null);
              setHoldingObject(false);
            }
          }}
        />
        <OrbitControls makeDefault />
        {/* Removed background from Environment */}
        <Environment preset="sunset" background={false} />
        {/* Add ambient light to ensure text is visible */}
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
      </Physics>
    </Canvas>
  );
};

export default MinecraftScene;