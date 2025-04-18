import React, { useState, useEffect, useRef, FC } from 'react';
import * as THREE from 'three';
import { useBox } from '@react-three/cannon';
import { Mesh, BufferGeometry, Material, Object3D } from 'three';
import { Text } from '@react-three/drei';
import MinecraftCharacter from './MinecraftCharacter';

const Block = ({ position, color, isPickupable = false }: { position: [number, number, number]; color: string; isPickupable?: boolean }) => {
  // Type the ref as Mesh<BufferGeometry, Material>
  const [ref, api] = useBox<Mesh<BufferGeometry, Material>>(() => ({
    mass: isPickupable ? 5 : 0,  // Increased mass for better physics
    position,
    args: [1, 1, 1],
    material: { restitution: 0.5, friction: 0.3 },
    linearDamping: 0.3,  // Reduced damping for more movement
    angularDamping: 0.3  // Added angular damping
  }));

  // Ensure userData is properly set with physics body reference
  useEffect(() => {
    if (ref.current) {
      // Store the physics body in userData for later manipulation
      ref.current.userData = { 
        isPickupable,
        body: api
      };
      console.log('[DEBUG] Block created with isPickupable:', isPickupable, 'physics API:', api);
      
      // If this is a sky block, make sure it's awake and can fall
      if (isPickupable && position[1] > 1) {
        // Apply initial velocity to help start movement
        api.wakeUp();
        api.velocity.set(0, -0.5, 0); // Give initial downward velocity
        console.log('[DEBUG] Waking up sky block at position:', position);
        
        // Debug logging to track block positions
        const debugInterval = setInterval(() => {
          const currentPos = new THREE.Vector3();
          if (ref.current) {
            ref.current.getWorldPosition(currentPos);
            console.log(`Block at ${position} now at ${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}`);
          } else {
            clearInterval(debugInterval);
          }
        }, 2000);
        
        // Clean up interval
        return () => clearInterval(debugInterval);
      }
    }
  }, [ref, api, isPickupable, position]);

  return (
    <mesh ref={ref} userData={{ isPickupable }}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} emissive={isPickupable ? color : 'black'} emissiveIntensity={0.2} />
    </mesh>
  );
};

const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#A020F0'];

interface MinecraftCharacterProps {
  initialPosition: [number, number, number];
  holdingObject: boolean;
  heldObject: THREE.Object3D | null;
  onPickup: (object: THREE.Object3D) => void;
  onDrop: () => void;
}

interface WorldProps {
  characterProps: MinecraftCharacterProps;
}

const World: FC<WorldProps> = ({ characterProps }) => {
  const size = 25; // 50x50 world (25 blocks in each direction)
  // Define the block type to ensure position is always a tuple
  type Block = {
    key: string;
    position: [number, number, number];
    color: string;
    isPickupable: boolean;
  };

  // Use character props from parent component
  const { holdingObject, heldObject, initialPosition, onPickup, onDrop } = characterProps;

  const [blocks, setBlocks] = useState<Block[]>(() => {
    // Floor blocks (not pickupable)
    const floor: Block[] = [];
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        floor.push({
          key: `floor-${x}-${z}`,
          position: [x, -0.5, z] as [number, number, number],
          color: '#8B4513',
          isPickupable: false,
        });
      }
    }
    
    // Generate 50 random colored blocks at start
    const randomBlocks: Block[] = [];
    for (let i = 0; i < 50; i++) {
      // Random position within a reasonable area (not too far from center)
      const x = Math.floor(Math.random() * 21) - 10; // -10 to 10
      const y = 0.5 + Math.floor(Math.random() * 3); // 0.5, 1.5, 2.5
      const z = Math.floor(Math.random() * 21) - 10; // -10 to 10
      
      randomBlocks.push({
        key: `initial-${i}-${Date.now()}-${Math.random()}`,
        position: [x, y, z] as [number, number, number],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        isPickupable: true,
      });
    }
    
    return [...floor, ...randomBlocks];
  });

  // Add block on left click
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      // Don't add blocks if holding an object
      if (holdingObject) return;
      
      // Raycast to find ground position
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      // Use THREE.Raycaster
      const camera = (window as any).threeCamera;
      const scene = (window as any).threeScene;
      if (!camera || !scene) return;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      // Intersect with y = -0.5 plane (ground)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersection);
      if (intersection) {
        // Snap to integer grid
        const blockPos: [number, number, number] = [
          Math.round(intersection.x),
          0.5,
          Math.round(intersection.z)
        ];
        
        // Add a random color block
        setBlocks(blocks => [
          ...blocks,
          {
            key: `user-${Date.now()}-${Math.random()}`,
            position: blockPos,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            isPickupable: true,
          },
        ]);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [holdingObject]);

  // Create a separate component for falling blocks to ensure physics is applied
  const FallingBlock = ({ position, color }: { position: [number, number, number]; color: string }) => {
    // Use much higher mass for falling blocks
    const [ref, api] = useBox<Mesh<BufferGeometry, Material>>(() => ({
      mass: 10, // Very heavy to ensure it falls
      position,
      args: [1, 1, 1],
      material: { restitution: 0.5, friction: 0.3 },
      linearDamping: 0.1, // Very low damping
      angularDamping: 0.1
    }));
    
    // Apply initial velocity immediately
    useEffect(() => {
      // Force it to start falling
      api.wakeUp();
      api.velocity.set(0, -2, 0); // Strong initial downward velocity
      
      // Log position changes
      const debugInterval = setInterval(() => {
        if (ref.current) {
          console.log(`Falling block at ${ref.current.position.x.toFixed(2)}, ${ref.current.position.y.toFixed(2)}, ${ref.current.position.z.toFixed(2)}`);
        } else {
          clearInterval(debugInterval);
        }
      }, 1000);
      
      return () => clearInterval(debugInterval);
    }, []);
    
    return (
      <mesh ref={ref} userData={{ isPickupable: true }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
      </mesh>
    );
  };
  
  // State for falling blocks (separate from regular blocks)
  const [fallingBlocks, setFallingBlocks] = useState<Array<{
    key: string;
    position: [number, number, number];
    color: string;
  }>>([]);
  
  // Periodically spawn blocks in the sky
  useEffect(() => {
    const interval = setInterval(() => {
      // Random X/Z within world bounds - keep closer to center
      const x = Math.floor(Math.random() * 11) - 5; // -5 to 5 range
      const z = Math.floor(Math.random() * 11) - 5; // -5 to 5 range
      // Lower starting position for better visibility
      const y = 10 + Math.random() * 5; // 10-15 units high
      
      // Add a new falling block
      const newBlock = {
        key: `sky-${Date.now()}-${Math.random()}`,
        position: [x, y, z] as [number, number, number],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
      
      setFallingBlocks(blocks => [...blocks, newBlock]);
      
      console.log('[DEBUG] Spawned new falling block at position:', [x, y, z]);
    }, 2000); // Every 2 seconds
    return () => clearInterval(interval);
  }, []);
  


  // Ground instructions text
  const InstructionText: FC<{
    text: string;
    position: [number, number, number];
    rotation?: [number, number, number];
    color?: string;
    size?: number;
  }> = ({ text, position, rotation = [0, 0, 0], color = 'white', size = 0.5 }) => (
    <Text
      position={position}
      rotation={rotation}
      color={color}
      fontSize={size}
      maxWidth={10}
      lineHeight={1}
      letterSpacing={0.02}
      textAlign="center"
      font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
      anchorX="center"
      anchorY="middle"
    >
      {text}
    </Text>
  );

  return (
    <>
      {/* Character */}
      <MinecraftCharacter 
        initialPosition={initialPosition}
        holdingObject={holdingObject}
        heldObject={heldObject}
        onPickup={onPickup}
        onDrop={onDrop}
      />
      
      {/* Regular Blocks */}
      {blocks.map(({ key, position, color, isPickupable }) => (
        <Block
          key={key}
          position={position}
          color={color}
          isPickupable={isPickupable}
        />
      ))}
      
      {/* Falling Blocks - separate component with dedicated physics */}
      {fallingBlocks.map(({ key, position, color }) => (
        <FallingBlock
          key={key}
          position={position}
          color={color}
        />
      ))}
      
      {/* Sky Instructions - Floating in the sky with even more separation */}
      <group position={[0, 0, 0]}>
        {/* Bottom-left: Red "WASD - Move" */}
        <InstructionText 
          text="WASD - Move" 
          position={[-35, 5, -40]} 
          color="#FF5555" 
          size={5} 
        />
        
        {/* Bottom-right: Green "SPACE - Jump" */}
        <InstructionText 
          text="SPACE - Jump" 
          position={[35, 5, -40]} 
          color="#55FF55" 
          size={5} 
        />
        
        {/* Top-left: Blue "E - Pick up/Drop" */}
        <InstructionText 
          text="E - Pick up/Drop" 
          position={[-35, 35, -40]} 
          color="#5555FF" 
          size={5} 
        />
        
        {/* Top-right: Yellow "Left Click - Place Block" */}
        <InstructionText 
          text="Left Click - Place Block" 
          position={[35, 35, -40]} 
          color="#FFFF55" 
          size={5} 
        />
      </group>
    </>
  );
};

export default World;