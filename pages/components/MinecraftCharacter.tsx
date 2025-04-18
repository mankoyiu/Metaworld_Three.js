import { useRef, useEffect, useState, FC } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface MinecraftCharacterProps {
  initialPosition: [number, number, number];
  holdingObject: boolean;
  heldObject: THREE.Object3D | null;
  onPickup: (object: THREE.Object3D) => void;
  onDrop: () => void;
}

const MinecraftCharacter: FC<MinecraftCharacterProps> = ({
  initialPosition,
  holdingObject,
  heldObject,
  onPickup,
  onDrop,
}) => {
  const { scene } = useThree();
  const gltf = useLoader(GLTFLoader, '/models/hestia.glb');
  const meshRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const heldObjectRef = useRef<THREE.Mesh | null>(null);
  const moveSpeed = 0.1;
  const jumpHeight = 0.5;
  const isJumping = useRef(false);
  const position = useRef(new THREE.Vector3(initialPosition[0], 0.5, initialPosition[2]));
  const velocity = useRef(new THREE.Vector3());
  const gravity = -0.01;
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
  });

  const findHandBone = () => {
    if (!meshRef.current) return null;

    // First try to find an actual hand bone
    const possibleHandNames = ['mixamorig:RightHand', 'RightHand', 'rightHand', 'hand_right'];
    for (const name of possibleHandNames) {
      const handBone = meshRef.current.children[0].getObjectByName(name);
      if (handBone) return handBone;
    }
    
    // If no hand bone is found, return the mesh itself as a fallback
    // This ensures we can always attach objects even if the model doesn't have named bones
    console.log('[DEBUG] No hand bone found, using character mesh as attachment point');
    return meshRef.current;
  };

  const findNearbyObjects = () => {
    const nearbyObjects: THREE.Mesh[] = [];
    if (!scene || !meshRef.current) {
      console.log('[DEBUG] Scene or meshRef not available');
      return nearbyObjects;
    }
    
    // Log the scene hierarchy to debug
    console.log('[DEBUG] Scene hierarchy:', scene);
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData?.isPickupable) {
        const charPos = meshRef.current!.position;
        const blockPos = child.position;
        const distanceXZ = Math.sqrt(
          Math.pow(blockPos.x - charPos.x, 2) +
          Math.pow(blockPos.z - charPos.z, 2)
        );
        
        // Increase the pickup radius to make it easier to pick up blocks
        const pickupRadius = 3;
        console.log('[DEBUG] Checking pickupable object', child, 'distanceXZ:', distanceXZ, 'userData:', child.userData);
        
        if (distanceXZ < pickupRadius) {
          nearbyObjects.push(child);
        }
      }
    });
    console.log('[DEBUG] Nearby pickupable objects found:', nearbyObjects.length);
    return nearbyObjects;
  };

  useEffect(() => {
    // Combined keyboard handler for all keys
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Handle WASD and space for movement
      if (key === 'w') keys.current.w = true;
      if (key === 'a') keys.current.a = true;
      if (key === 's') keys.current.s = true;
      if (key === 'd') keys.current.d = true;
      if (key === ' ' && !isJumping.current && position.current.y <= 0.5) {
        keys.current.space = true;
        isJumping.current = true;
        velocity.current.y = jumpHeight;
      }
      
      // Handle E key for pickup/drop
      if (key === 'e') {
        console.log('[DEBUG] E key pressed, holdingObject:', holdingObject);
        
        if (!holdingObject) {
          // Try to pick up a nearby object
          const nearbyObjects = findNearbyObjects();
          console.log('[DEBUG] Found nearby objects:', nearbyObjects);
          
          if (nearbyObjects.length > 0) {
            const objectToPickup = nearbyObjects[0];
            console.log('[DEBUG] Attempting to pick up:', objectToPickup);
            
            heldObjectRef.current = objectToPickup;
            const handBone = findHandBone();
            console.log('[DEBUG] Hand bone found:', handBone);
            
            if (handBone) {
              // Save the original state
              objectToPickup.userData.originalParent = objectToPickup.parent;
              objectToPickup.userData.originalPosition = objectToPickup.position.clone();
              objectToPickup.userData.originalRotation = objectToPickup.rotation.clone();
              
              // Remove physics from the object so it can move with the character
              if (objectToPickup.userData.body) {
                objectToPickup.userData.body.sleep();
              }
              
              // Detach from current parent
              if (objectToPickup.parent) {
                const worldPosition = new THREE.Vector3();
                objectToPickup.getWorldPosition(worldPosition);
                objectToPickup.parent.remove(objectToPickup);
                scene.add(objectToPickup);
                objectToPickup.position.copy(worldPosition);
              }
              
              // Attach to hand
              handBone.attach(objectToPickup);
              
              // Position relative to hand
              if (handBone === meshRef.current) {
                // If we're attaching to the character mesh directly
                // Set elevation to 1.0 as requested
                objectToPickup.position.set(0.5, 3.0, 0.5);
              } else {
                // If we're attaching to an actual hand bone
                // Set elevation to 1.0 as requested
                objectToPickup.position.set(0.2, 3.0, 0);
              }
              
              console.log('[DEBUG] Attached object to character:', objectToPickup);
              onPickup(objectToPickup);
            }
          }
        } else if (heldObjectRef.current) {
          // Drop the currently held object
          console.log('[DEBUG] Attempting to drop object:', heldObjectRef.current);
          
          // Get the world position before detaching
          const worldPosition = new THREE.Vector3();
          const worldQuaternion = new THREE.Quaternion();
          heldObjectRef.current.getWorldPosition(worldPosition);
          heldObjectRef.current.getWorldQuaternion(worldQuaternion);
          
          // Position slightly in front of the character
          const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(meshRef.current!.quaternion);
          worldPosition.add(forward.multiplyScalar(1));
          worldPosition.y = 0.5; // Place at a consistent height
          
          // Detach from hand
          const handBone = findHandBone();
          if (handBone) {
            handBone.remove(heldObjectRef.current);
          }
          
          // Add back to scene
          scene.add(heldObjectRef.current);
          heldObjectRef.current.position.copy(worldPosition);
          
          // Wake up physics if it was sleeping
          if (heldObjectRef.current.userData.body) {
            heldObjectRef.current.userData.body.wakeUp();
          }
          
          console.log('[DEBUG] Dropped object at position:', worldPosition);
          heldObjectRef.current = null;
          onDrop();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') keys.current.w = false;
      if (key === 'a') keys.current.a = false;
      if (key === 's') keys.current.s = false;
      if (key === 'd') keys.current.d = false;
      if (key === ' ') keys.current.space = false;
    };

    // Use a single keydown event listener instead of multiple ones
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [holdingObject, onPickup, onDrop]);

  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    const direction = new THREE.Vector3();
    if (keys.current.w) direction.z -= 1;
    if (keys.current.s) direction.z += 1;
    if (keys.current.a) direction.x -= 1;
    if (keys.current.d) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize();
      direction.multiplyScalar(moveSpeed);

      const angle = Math.atan2(direction.x, direction.z);
      if (meshRef.current) {
        meshRef.current.rotation.y = angle;
      }
    }

    position.current.x += direction.x;
    position.current.z += direction.z;

    if (isJumping.current) {
      position.current.y += velocity.current.y;
      velocity.current.y += gravity;

      if (position.current.y <= 0.5) {
        position.current.y = 0.5;
        velocity.current.y = 0;
        isJumping.current = false;
      }
    }

    if (meshRef.current) {
      meshRef.current.position.copy(position.current);
    }
  });

  // This useEffect ensures the held object stays with the character
  useEffect(() => {
    if (holdingObject && heldObject) {
      console.log('[DEBUG] Character is holding object:', heldObject);
    }
  }, [holdingObject, heldObject]);

  return (
    <group ref={meshRef}>
      <primitive object={gltf.scene} scale={2.0} />
      {/* We don't need to render the held object separately as it's already attached to the hand */}
    </group>
  );
};

export default MinecraftCharacter;