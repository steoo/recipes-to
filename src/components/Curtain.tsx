import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

const path = '/curtains.glb';

export function Curtain() {
  const [isFolded, setIsFolded] = useState(false);
  const timeRef = useRef(0);
  const isAnimating = useRef(false);
  const gltf = useGLTF(path);
  const originalPositions = useRef(new Map());
  const normalizedYValues = useRef(new Map());
  const meshRefs = useRef(new Map());
  const { camera } = useThree();
  const curtainRef = useRef<THREE.Group>(null);

  const controls = useControls('Curtain', {
    positionX: { value: 0, min: -100, max: 100, step: 5 },
    positionY: { value: 0, min: -100, max: 100, step: 5 },
    positionZ: { value: 0, min: -100, max: 100, step: 5 },
    rotationY: { value: Math.PI, min: -Math.PI, max: Math.PI, step: 0.1 },
    rotationX: { value: Math.PI / 2, min: -Math.PI, max: Math.PI, step: 0.1 },
    rotationZ: { value: Math.PI / 2, min: -Math.PI, max: Math.PI, step: 0.1 },
    scale: { value: 0.005, min: 0.001, max: 0.1, step: 0.001 },
    foldLayers: { value: 3, min: 1, max: 5, step: 1 },
    foldAmount: { value: 0.5, min: 0, max: 10, step: 0.01 },
    foldSpeed: { value: 0.5, min: 0.1, max: 20, step: 0.1 },
  });

  // Pre-compute and cache values
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry.attributes.position) {
        const positions = child.geometry.attributes.position;
        const array = positions.array;

        // Store original positions in a typed array for better performance
        originalPositions.current.set(child, new Float32Array(array));

        // Pre-compute normalized Y values
        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox;
        const normalizedY = new Float32Array(positions.count);
        const yRange = bbox.max.y - bbox.min.y;

        for (let i = 0; i < positions.count; i++) {
          normalizedY[i] = (array[i * 3 + 1] - bbox.min.y) / yRange;
        }
        normalizedYValues.current.set(child, normalizedY);
        meshRefs.current.set(child, child);

        // Set up material once
        child.material = new THREE.MeshStandardMaterial({
          color: '#ebd8a9',
          side: THREE.DoubleSide,
        });
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeVertexNormals();
      }
    });
  }, [gltf]);

  // Pre-compute Math.PI * 2 for better performance
  const TWO_PI = useMemo(() => Math.PI * 2, []);

  useFrame((state, delta) => {
    if (!isAnimating.current && timeRef.current === (isFolded ? 1 : 0)) {
      return;
    }

    const easedDelta = delta * controls.foldSpeed * 0.5;
    let needsNormalUpdate = false;

    if (isFolded) {
      timeRef.current = Math.min(timeRef.current + easedDelta, 1);
      if (timeRef.current === 1) {
        isAnimating.current = false;
        needsNormalUpdate = true;
      }
    } else {
      timeRef.current = Math.max(timeRef.current - easedDelta, 0);
      if (timeRef.current === 0) {
        isAnimating.current = false;
        needsNormalUpdate = true;
      }
    }

    const foldProgress = timeRef.current;
    // Optimize easing calculation
    const easedProgress = foldProgress * foldProgress * (3 - 2 * foldProgress);
    const piEasedProgress = Math.PI * easedProgress;

    meshRefs.current.forEach((child) => {
      if (child instanceof THREE.Mesh && child.geometry.attributes.position) {
        const positions = child.geometry.attributes.position;
        const array = positions.array;
        const originalPos = originalPositions.current.get(child);
        const normalizedY = normalizedYValues.current.get(child);

        if (originalPos && normalizedY) {
          const foldLayers = controls.foldLayers;
          const foldAmount = controls.foldAmount;

          // Batch process vertices for better performance
          for (let i = 0; i < positions.count; i++) {
            const idx = i * 3;
            const shiftedPhase =
              normalizedY[i] * TWO_PI * foldLayers + piEasedProgress;
            const foldOffset =
              Math.sin(shiftedPhase) * foldAmount * easedProgress;

            array[idx] = originalPos[idx];
            array[idx + 1] = originalPos[idx + 1] * (1 - easedProgress * 0.5);
            array[idx + 2] = originalPos[idx + 2] + foldOffset;
          }

          positions.needsUpdate = true;
        }
      }
    });

    // Update normals only when necessary
    if (needsNormalUpdate || isAnimating.current) {
      meshRefs.current.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.computeVertexNormals();
        }
      });
    }
  });

  useEffect(() => {
    if (curtainRef.current) {
      camera.position.set(
        curtainRef.current.position.x,
        curtainRef.current.position.y + 5,
        curtainRef.current.position.z + 10
      );
    }
  }, [camera, curtainRef]);

  return (
    <group
      ref={curtainRef}
      position={[controls.positionX, controls.positionY, controls.positionZ]}
      rotation={[controls.rotationX, controls.rotationY, controls.rotationZ]}
      scale={controls.scale}
      onClick={() => {
        setIsFolded(!isFolded);
        isAnimating.current = true;
      }}
    >
      <primitive object={gltf.scene} />
    </group>
  );
}

useGLTF.preload(path);
