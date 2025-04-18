import * as THREE from 'three';
import type { NextApiRequest, NextApiResponse } from "next";
import { FC, useEffect } from "react";

const World: FC = () => {
  const addPickupableObjects = (scene: THREE.Scene) => {
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1); // 1x1x1 block
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 'red' });

    for (let i = 0; i < 5; i++) {
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.set(i * 2, 0.5, 0); // Set Y to 0.5 to place on ground
      box.userData.isPickupable = true; // Mark as pickupable
      scene.add(box);
    }
  };

  useEffect(() => {
    const scene = new THREE.Scene();
    addPickupableObjects(scene);
  }, []);

  return null; // Render other world elements here
};

export default World;
