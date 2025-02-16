import { useAnimations, useGLTF, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { useEffect } from 'react';
import * as THREE from 'three';

const path = '/curtains-baked.glb';

const AnimatedCurtain = () => {
  const { nodes, animations, scene } = useGLTF(path);
  const { actions, ref, names, mixer } = useAnimations(animations);

  // Load fabric textures
  const [colorMap, normalMap, roughnessMap, aoMap, heightMap, metallicMap] =
    useTexture([
      '/fabric_silk/fabric_silk_basecolor.jpg',
      '/fabric_silk/fabric_silk_normal.jpg',
      '/fabric_silk/fabric_silk_roughness.jpg',
      '/fabric_silk/fabric_silk_ambientOcclusion.jpg',
      '/fabric_silk/fabric_silk_height.png',
      '/fabric_silk/fabric_silk_metallic.jpg',
    ]);

  const groupControls = useControls('Group Rotation', {
    rotationX: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
    rotationY: { value: -Math.PI / 2, min: -Math.PI, max: Math.PI, step: 0.1 },
    rotationZ: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
    scale: { value: 10, min: 1, max: 20, step: 0.1 },
  });

  useEffect(() => {
    const child = nodes.Grid;
    if (child instanceof THREE.Mesh) {
      child.material = new THREE.MeshStandardMaterial({
        map: colorMap,
        normalMap: normalMap,
        // roughnessMap: roughnessMap,
        aoMap: aoMap,
        displacementMap: heightMap, // Add height/displacement map
        displacementScale: 0.1, // Adjust this value to control displacement intensity
        displacementBias: 0, // Offset for the displacement
        metalnessMap: metallicMap, // Add metallic map
        metalness: 0, // Set to 1 to let the metallic map control the effect
        side: THREE.DoubleSide,
        envMapIntensity: 0.3,
        // normalScale: new THREE.Vector2(0.5, 0.5),
      });

      child.material.needsUpdate = true;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  }, [
    nodes.Grid,
    scene,
    colorMap,
    normalMap,
    roughnessMap,
    aoMap,
    heightMap,
    metallicMap,
  ]);

  useFrame((_state, delta) => mixer.update(delta));

  useEffect(() => {
    console.log('Nodes:', nodes);
    console.log('Animations:', animations);
    console.log('Animation Names:', names);
    animations.forEach((clip) => {
      console.log('Clip:', clip.name, {
        duration: clip.duration,
        tracks: clip.tracks.length,
        frames: clip.tracks[0]?.times.length || 0,
      });
    });
  }, [animations, names, nodes]);

  const playAnimation = (name: string) => {
    const action = actions[name];
    if (action) {
      action.reset().setLoop(THREE.LoopOnce, 1).clampWhenFinished = true;
      // action.play();
    }
  };

  return (
    <group
      ref={ref}
      rotation={[
        groupControls.rotationX,
        groupControls.rotationY,
        groupControls.rotationZ,
      ]}
      scale={groupControls.scale}
    >
      <primitive object={new THREE.AxesHelper(100)} />
      <primitive object={nodes.Grid} onClick={() => playAnimation(names[0])} />
    </group>
  );
};

useGLTF.preload(path);

export default AnimatedCurtain;
