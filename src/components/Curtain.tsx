import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import Ammo from 'ammojs-typed';
import { useControls } from 'leva';
import { useRef, useState, useEffect } from 'react';
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
  const curtainRef = useRef<THREE.Group>(null);
  const ammoLib = useRef<typeof Ammo>({} as typeof Ammo);
  const physicsWorld = useRef<Ammo.btSoftRigidDynamicsWorld>(
    {} as Ammo.btSoftRigidDynamicsWorld
  );
  const transformAux1 = useRef<Ammo.btTransform>({} as Ammo.btTransform);
  const clock = new THREE.Clock();

  const controls = useControls('Curtain', {
    positionX: { value: 0, min: -100, max: 100, step: 5 },
    positionY: { value: -4, min: -100, max: 100, step: 1 },
    positionZ: { value: 0, min: -100, max: 100, step: 5 },
    rotationY: { value: Math.PI, min: -Math.PI, max: Math.PI, step: 0.1 },
    rotationX: { value: Math.PI / 2, min: -Math.PI, max: Math.PI, step: 0.1 },
    rotationZ: { value: Math.PI / 2, min: -Math.PI, max: Math.PI, step: 0.1 },
    scale: { value: 0.005, min: 0.001, max: 0.1, step: 0.001 },
    foldLayers: { value: 3, min: 1, max: 5, step: 1 },
    foldAmount: { value: 0.5, min: 0, max: 10, step: 0.01 },
    foldSpeed: { value: 0.5, min: 0.1, max: 20, step: 0.1 },
  });

  const initPhysics = () => {
    // Physics configuration
    const gravityConstant = -9.8;

    const collisionConfiguration =
      new ammoLib.current.btSoftBodyRigidBodyCollisionConfiguration();
    const dispatcher = new ammoLib.current.btCollisionDispatcher(
      collisionConfiguration
    );
    const broadphase = new ammoLib.current.btDbvtBroadphase();
    const solver = new ammoLib.current.btSequentialImpulseConstraintSolver();
    const softBodySolver = new ammoLib.current.btDefaultSoftBodySolver();
    physicsWorld.current = new ammoLib.current.btSoftRigidDynamicsWorld(
      dispatcher,
      broadphase,
      solver,
      collisionConfiguration,
      softBodySolver
    );
    physicsWorld.current.setGravity(
      new ammoLib.current.btVector3(0, gravityConstant, 0)
    );
    physicsWorld.current
      .getWorldInfo()
      .set_m_gravity(new ammoLib.current.btVector3(0, gravityConstant, 0));

    transformAux1.current = new ammoLib.current.btTransform();
  };

  const applyPhysics = () => {
    const margin = 10;

    // Get the first mesh from meshRefs (assuming it's the curtain)
    const clothMesh = Array.from(meshRefs.current.values())[0] as THREE.Mesh;

    if (!clothMesh || !clothMesh.geometry) {
      console.error('Curtain mesh not found');
      return;
    }

    const clothPos = curtainRef.current!.position;
    const clothHeight = curtainRef.current!.scale.y;
    const clothWidth = curtainRef.current!.scale.x;

    // Calculate segments based on the mesh geometry
    const positions = clothMesh.geometry.attributes.position;
    const clothNumSegmentsZ = Math.sqrt(positions.count) - 1;
    const clothNumSegmentsY = Math.sqrt(positions.count) - 1;

    console.log('Cloth segments:', {
      Z: clothNumSegmentsZ,
      Y: clothNumSegmentsY,
      vertexCount: positions.count,
      mesh: clothMesh,
    });

    const softBodyHelpers = new ammoLib.current.btSoftBodyHelpers();
    const clothCorner00 = new ammoLib.current.btVector3(
      clothPos.x,
      clothPos.y + clothHeight,
      clothPos.z
    );
    const clothCorner01 = new ammoLib.current.btVector3(
      clothPos.x,
      clothPos.y + clothHeight,
      clothPos.z - clothWidth
    );
    const clothCorner10 = new ammoLib.current.btVector3(
      clothPos.x,
      clothPos.y,
      clothPos.z
    );
    const clothCorner11 = new ammoLib.current.btVector3(
      clothPos.x,
      clothPos.y,
      clothPos.z - clothWidth
    );
    const clothSoftBody = softBodyHelpers.CreatePatch(
      physicsWorld.current.getWorldInfo(),
      clothCorner00,
      clothCorner01,
      clothCorner10,
      clothCorner11,
      clothNumSegmentsZ + 1,
      clothNumSegmentsY + 1,
      0,
      true
    );
    const sbConfig = clothSoftBody.get_m_cfg();
    sbConfig.set_viterations(10);
    sbConfig.set_piterations(10);

    clothSoftBody.setTotalMass(0.9, false);
    ammoLib.current
      .castObject(clothSoftBody, ammoLib.current.btCollisionObject)
      .getCollisionShape()
      .setMargin(margin * 3);
    physicsWorld.current.addSoftBody(clothSoftBody, 1, -1);
    clothMesh.userData.physicsBody = clothSoftBody;
    // Disable deactivation
    clothSoftBody.setActivationState(4);
  };

  useEffect(() => {
    Ammo.call({}).then((AmmoLib) => {
      console.log(AmmoLib);

      ammoLib.current = AmmoLib;

      initPhysics();
      applyPhysics();
    });
  }, []);

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

  const TWO_PI = Math.PI * 2;

  useFrame((state, delta) => {
    let needsNormalUpdate = false;
    const skipFoldingUpdate =
      !isAnimating.current && timeRef.current === (isFolded ? 1 : 0);

    // Handle folding animation
    if (!skipFoldingUpdate) {
      const easedDelta = delta * controls.foldSpeed * 0.5;

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
    }

    const foldProgress = timeRef.current;
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

    if (needsNormalUpdate || isAnimating.current) {
      meshRefs.current.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.computeVertexNormals();
        }
      });
    }
  });

  const updatePhysics = () => {
    if (!physicsWorld.current) return;

    const deltaTime = clock.getDelta();

    physicsWorld.current.stepSimulation(deltaTime, 10);

    meshRefs.current.forEach((child) => {
      if (child instanceof THREE.Mesh && child.geometry.attributes.position) {
        const softBody = child.userData.physicsBody;
        const positions = child.geometry.attributes.position;

        if (!softBody) return;

        const clothPositions = child.geometry.attributes.position.array;
        const numVerts = clothPositions.length / 3;
        const nodes = softBody.m_nodes;
        let indexFloat = 0;

        for (let i = 0; i < numVerts; i++) {
          const node = nodes.at(i);
          const nodePos = node.get_m_x();
          clothPositions[indexFloat++] = nodePos.x();
          clothPositions[indexFloat++] = nodePos.y();
          clothPositions[indexFloat++] = nodePos.z();
        }

        child.geometry.computeVertexNormals();
        child.geometry.attributes.position.needsUpdate = true;
        child.geometry.attributes.normal.needsUpdate = true;
        positions.needsUpdate = true;
      }
    });
  };

  useFrame(() => {
    // updatePhysics();
  });

  return (
    <>
      <primitive object={new THREE.GridHelper(10, 10, 'red', 'blue')} />

      <group
        ref={curtainRef}
        position={[controls.positionX, controls.positionY, controls.positionZ]}
        rotation={[controls.rotationX, controls.rotationY, controls.rotationZ]}
        scale={controls.scale}
        onClick={() => {
          // setIsFolded(!isFolded);
          isAnimating.current = true;
        }}
      >
        {/* Add axes helper as child of curtain group */}
        <primitive object={new THREE.AxesHelper(100)} />
        <primitive object={gltf.scene} />
      </group>
    </>
  );
}
