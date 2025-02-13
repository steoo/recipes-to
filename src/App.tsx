import { Physics, usePlane } from '@react-three/cannon';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const path = '/curtains.glb';

// Create an animated version of the GLTF group

function Curtain() {
  const [isFolded, setIsFolded] = useState(false);
  const timeRef = useRef(0);
  const gltf = useGLTF('/curtains.glb');
  const isAnimating = useRef(false);

  // Add Leva controls with adjusted ranges and default values
  const controls = useControls({
    positionX: { value: 0, min: -100, max: 100, step: 5 },
    positionY: { value: 0, min: -100, max: 100, step: 5 },
    positionZ: { value: 0, min: -100, max: 100, step: 5 },
    rotationY: { value: Math.PI, min: -Math.PI, max: Math.PI, step: 0.1 },
    rotationX: { value: Math.PI / 2, min: -Math.PI, max: Math.PI, step: 0.1 },
    rotationZ: { value: Math.PI / 2, min: -Math.PI, max: Math.PI, step: 0.1 },
    scale: { value: 0.005, min: 0.001, max: 0.1, step: 0.001 },
    color: {
      value: '#dec37d',
    },
    metalness: { value: 0.0, min: 0, max: 1, step: 0.1 },
    roughness: { value: 0.5, min: 0, max: 1, step: 0.1 },
    segments: { value: 20, min: 5, max: 50, step: 1 },
    stiffness: { value: 0.9, min: 0, max: 1, step: 0.01 },
    damping: { value: 0.1, min: 0, max: 1, step: 0.01 },
    wind: { value: 0, min: -1, max: 1, step: 0.1 },
    foldAmount: { value: 0.5, min: 0, max: 10, step: 0.01 },
    foldLayers: { value: 3, min: 1, max: 50, step: 1 },
    foldSpeed: { value: 2, min: 0.1, max: 20, step: 0.1 },
  });

  // Cache geometry data for better performance
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!(child.material instanceof THREE.MeshStandardMaterial)) {
          child.material = new THREE.MeshStandardMaterial();
        }

        child.material.color.set(controls.color);
        child.material.metalness = controls.metalness;
        child.material.roughness = controls.roughness;
        child.castShadow = true;
        child.receiveShadow = true;

        // Store original positions and compute normalized Y values once
        if (!child.geometry.userData.originalPositions) {
          const positions = child.geometry.attributes.position;
          child.geometry.userData.originalPositions = Float32Array.from(
            positions.array
          );

          // Pre-compute normalized Y values
          const bbox =
            child.geometry.boundingBox ||
            new THREE.Box3().setFromBufferAttribute(positions);
          const normalizedY = new Float32Array(positions.count);
          for (let i = 0; i < positions.count; i++) {
            normalizedY[i] =
              (positions.getY(i) - bbox.min.y) / (bbox.max.y - bbox.min.y);
          }
          child.geometry.userData.normalizedY = normalizedY;
        }
      }
    });
  }, [gltf, controls.color, controls.metalness, controls.roughness]);

  useFrame((state, delta) => {
    if (!isAnimating.current && timeRef.current === (isFolded ? 1 : 0)) {
      return;
    }

    // Smooth out the animation timing
    const easedDelta = delta * controls.foldSpeed * 0.5; // Reduced speed for smoother animation

    if (isFolded) {
      timeRef.current = Math.min(timeRef.current + easedDelta, 1);
      if (timeRef.current === 1) {
        isAnimating.current = false;
      }
    } else {
      timeRef.current = Math.max(timeRef.current - easedDelta, 0);
      if (timeRef.current === 0) {
        isAnimating.current = false;
      }
    }

    const foldProgress = timeRef.current;
    // Add easing to the fold progress
    const easedProgress = foldProgress * foldProgress * (3 - 2 * foldProgress); // Smooth step function

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const positions = child.geometry.attributes.position;
        const originalPositions = child.geometry.userData.originalPositions;
        const normalizedY = child.geometry.userData.normalizedY;

        if (originalPositions && normalizedY) {
          for (let i = 0; i < positions.count; i++) {
            const origY = originalPositions[i * 3 + 1];
            const origZ = originalPositions[i * 3 + 2];

            // Shift the phase of the sine wave based on progress
            const shiftedPhase =
              normalizedY[i] * Math.PI * 2 * controls.foldLayers +
              Math.PI * easedProgress;
            const foldOffset =
              Math.sin(shiftedPhase) * controls.foldAmount * easedProgress;

            positions.setZ(i, origZ + foldOffset);
            const compressedY = origY * (1 - easedProgress * 0.5);
            positions.setY(i, compressedY);
          }

          positions.needsUpdate = true;
          if (state.clock.elapsedTime % 2 === 0) {
            child.geometry.computeVertexNormals();
          }
        }
      }
    });
  });

  return (
    <group
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
function App() {
  const lightControls = useControls({
    ambientIntensity: { value: 2, min: 0, max: 5, step: 0.1 },
    directionalIntensity: { value: 2, min: 0, max: 5, step: 0.1 },
    pointLightIntensity: { value: 2, min: 0, max: 5, step: 0.1 },
  });

  // Add camera controls with adjusted ranges
  const cameraControls = useControls('Camera', {
    cameraX: { value: 0, min: -20, max: 20, step: 1 },
    cameraY: { value: 10, min: -20, max: 20, step: 1 },
    cameraZ: { value: 20, min: -20, max: 20, step: 1 },
  });

  // Add target controls for lookAt
  const targetControls = useControls('Target', {
    targetX: { value: 0, min: -20, max: 20, step: 0.1 },
    targetY: { value: 0, min: -20, max: 20, step: 0.1 },
    targetZ: { value: -20, min: -200, max: 200, step: 0.1 },
  });

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{
          position: [
            cameraControls.cameraX,
            cameraControls.cameraY,
            cameraControls.cameraZ,
          ],
          fov: 50,
        }}
        shadows // Enable shadows
      >
        <Physics
          gravity={[0, -9.81, 0]}
          defaultContactMaterial={{
            friction: 0.1,
            restitution: 0.1,
          }}
        >
          {/* Main lights */}
          <ambientLight intensity={lightControls.ambientIntensity} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={lightControls.directionalIntensity}
            castShadow // Enable shadow casting
          />
          <directionalLight
            position={[-5, 5, -5]}
            intensity={lightControls.directionalIntensity}
          />

          {/* Fill lights */}
          <pointLight
            position={[10, 10, 10]}
            intensity={lightControls.pointLightIntensity}
          />
          <pointLight
            position={[-10, -10, -10]}
            intensity={lightControls.pointLightIntensity / 2}
          />

          {/* Environment light */}
          <hemisphereLight
            intensity={0.5}
            groundColor={new THREE.Color(0x080820)}
          />

          {/* Added grid and axes helpers for debugging */}
          <gridHelper args={[10, 10]} />
          <axesHelper args={[5]} />
          <Curtain />
          {/* Add a floor for the curtain to interact with */}
          <Floor />
          <OrbitControls
            makeDefault
            target={[
              targetControls.targetX,
              targetControls.targetY,
              targetControls.targetZ,
            ]}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Physics>
      </Canvas>
    </div>
  );
}

function Floor() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -2, 0],
    type: 'Static',
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#666" />
    </mesh>
  );
}

// Make sure to update this path to match your model's location
useGLTF.preload(path);

export default App;
