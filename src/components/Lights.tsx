import { useHelper } from '@react-three/drei';
import { useControls } from 'leva';
import { useRef } from 'react';
import * as THREE from 'three';

interface LightsProps {
  glowColor: string;
}

export function Lights({ glowColor }: LightsProps) {
  const lightControls = useControls('Lights', {
    // Ambient Light
    ambientIntensity: { value: 2, min: 0, max: 10, step: 0.1 },
    ambientColor: { value: '#e8bdbd' },

    // Main Directional Light
    directionalIntensity: { value: 1, min: 0, max: 20, step: 0.1 },
    directionalColor: { value: '#ad8787' },
    directionalX: { value: 5, min: -100, max: 100, step: 0.1 },
    directionalY: { value: 5, min: -100, max: 100, step: 0.1 },
    directionalZ: { value: 5, min: -100, max: 100, step: 0.1 },

    // Rim Lights
    rimIntensity: { value: 3, min: 0, max: 100, step: 0.1 },
    rimDistance: { value: 5, min: 1, max: 200, step: 0.5 },
    showHelpers: { value: true },
  });

  // Refs for lights to use with helpers
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLight1Ref = useRef<THREE.PointLight>(null);
  const rimLight2Ref = useRef<THREE.PointLight>(null);
  const rimLight3Ref = useRef<THREE.PointLight>(null);

  // Light helpers
  useHelper(
    lightControls.showHelpers && directionalLightRef,
    THREE.DirectionalLightHelper,
    1,
    'red'
  );
  useHelper(
    lightControls.showHelpers && rimLight1Ref,
    THREE.PointLightHelper,
    0.5,
    'blue'
  );
  useHelper(
    lightControls.showHelpers && rimLight2Ref,
    THREE.PointLightHelper,
    0.5,
    'blue'
  );
  useHelper(
    lightControls.showHelpers && rimLight3Ref,
    THREE.PointLightHelper,
    0.5,
    'blue'
  );

  return (
    <>
      <ambientLight
        intensity={lightControls.ambientIntensity}
        color={lightControls.ambientColor}
      />

      <directionalLight
        ref={directionalLightRef}
        position={[
          lightControls.directionalX,
          lightControls.directionalY,
          lightControls.directionalZ,
        ]}
        intensity={lightControls.directionalIntensity}
        color={lightControls.directionalColor}
        castShadow
      />

      <pointLight
        ref={rimLight1Ref}
        position={[-2, 0, 2]}
        intensity={lightControls.rimIntensity}
        color={glowColor}
        distance={lightControls.rimDistance}
      />
      <pointLight
        ref={rimLight2Ref}
        position={[2, 0, 2]}
        intensity={lightControls.rimIntensity}
        color={glowColor}
        distance={lightControls.rimDistance}
      />
      <pointLight
        ref={rimLight3Ref}
        position={[0, 2, 2]}
        intensity={lightControls.rimIntensity}
        color={glowColor}
        distance={lightControls.rimDistance}
      />
    </>
  );
}
