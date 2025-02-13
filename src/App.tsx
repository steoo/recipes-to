import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useControls } from 'leva';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { Curtain } from './components/Curtain';
import { Lights } from './components/Lights';

const path = '/curtains.glb';

function App() {
  const glowControls = useControls('Glow', {
    bloomIntensity: { value: 1, min: 0, max: 5, step: 0.1 },
    bloomThreshold: { value: 0.5, min: 0, max: 1, step: 0.1 },
    bloomRadius: { value: 0.7, min: 0, max: 1, step: 0.1 },
    glowColor: { value: '#ffffff' },
  });

  const sceneControls = useControls('Scene', {
    backgroundColor: { value: '#efbcbc' },
    fogColor: { value: '#efbcbc' },
    fogDensity: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
  });

  // Create a new RoomEnvironment
  const roomEnvironment = new RoomEnvironment();

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: sceneControls.backgroundColor,
      }}
    >
      <Canvas camera={{ position: [0, 5, 10] }}>
        <color attach="background" args={[sceneControls.backgroundColor]} />
        <fog attach="fog" args={[sceneControls.fogColor, 0, 25]} />

        <Lights glowColor={glowControls.glowColor} />
        <Curtain />

        <OrbitControls makeDefault />

        <EffectComposer>
          <Bloom
            intensity={glowControls.bloomIntensity}
            threshold={glowControls.bloomThreshold}
            radius={glowControls.bloomRadius}
          />
        </EffectComposer>

        {/* Use the RoomEnvironment as the background of your scene */}
        <mesh>
          <boxGeometry args={[1000, 1000, 1000]} />
          <meshBasicMaterial map={roomEnvironment.texture} />
        </mesh>

        {/* Use the RoomEnvironment as the environment map for your materials */}
        <mesh>
          <boxGeometry args={[1000, 1000, 1000]} />
          <meshStandardMaterial envMap={roomEnvironment.texture} />
        </mesh>
      </Canvas>
    </div>
  );
}

// Make sure to update this path to match your model's location
useGLTF.preload(path);

export default App;
