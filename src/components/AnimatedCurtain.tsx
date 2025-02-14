import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';

const path = '/animated-curtains.glb';

const AnimatedCurtain = () => {
  const { nodes, animations, scene } = useGLTF(path);
  const { actions, ref, names, mixer } = useAnimations(animations);

  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // child.material = new THREE.MeshStandardMaterial({
        //   color: '#ebd8a9',
        //   side: THREE.DoubleSide,
        // });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useFrame((_state, delta) => mixer.update(delta));

  useEffect(() => {
    console.log('Animations:', animations);
    console.log('Animation Names:', names);
    animations.forEach((clip) => {
      console.log('Clip:', clip.name, {
        duration: clip.duration,
        tracks: clip.tracks.length,
        frames: clip.tracks[0]?.times.length || 0,
      });
    });
  }, [animations, names]);

  useEffect(() => {
    actions[names[0]]?.reset();
    actions[names[0]]?.play();
  }, [actions, names]);

  return (
    <group ref={ref}>
      <primitive object={new THREE.AxesHelper(100)} />
      <primitive object={scene} />
    </group>
  );
};

useGLTF.preload(path);

export default AnimatedCurtain;
