import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface PlaneData {
  mesh: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
  imageAspect?: number; // width / height
}

const isTouchDevice = () => typeof window !== 'undefined' && ('ontouchstart' in window || (navigator as any).maxTouchPoints > 0);

const FibonacciSphere: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const planesRef = useRef<PlaneData[]>([]);
  const sphereGroupRef = useRef<THREE.Group>();
  const isAnimatedRef = useRef(false);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const [isRevealed, setIsRevealed] = useState(false);
  // Raycasting & selection
  const raycasterRef = useRef<THREE.Raycaster>();
  const mouseNdcRef = useRef(new THREE.Vector2());
  const selectedPlaneRef = useRef<PlaneData | null>(null);
  const isModalOpenRef = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const billboardActiveRef = useRef(false);
  const billboardTickerRef = useRef<((time: number) => void) | null>(null);
  // Touch state
  const isTouchingRef = useRef(false);
  const lastTouchXRef = useRef(0);
  const lastTouchYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);

  // Images available in the public folder (served at root)
  const publicImageUrls = [
    '/Frame 633478.webp',
    '/Frame 633479.webp',
    '/Frame 633481.webp',
    '/Frame 633482.webp',
    '/Frame 633483.webp',
    '/Frame 633496.webp',
    '/Frame 633499.webp',
    '/Frame 633500.webp',
    '/Frame 633501.webp'
  ];
  // Local image for the middle row (equator) of the sphere
  const middleRowImageUrl = '/Frame 633501.webp';
  const otherPublicImageUrls = publicImageUrls.filter(u => u !== middleRowImageUrl);

  // Fibonacci sphere distribution
  const fibonacciSphere = (samples: number, radius: number) => {
    const points = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians

    for (let i = 0; i < samples; i++) {
      const y = 1 - (i / (samples - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y);

      const theta = phi * i; // Golden angle increment

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
    }

    return points;
  };

  // (removed unused cylindrical grid helper)

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 25);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Ensure correct color output (prevents washed-out/grey look)
    // For three@0.180+ use colorSpace; tone mapping off
    (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Raycaster setup
    raycasterRef.current = new THREE.Raycaster();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create sphere group
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);
    sphereGroupRef.current = sphereGroup;

    // Create planes with fibonacci distribution (original globe view)
    const sphereRadius = 15;
    const positions = fibonacciSphere(36, sphereRadius);
    const planes: PlaneData[] = [];

    positions.forEach((position, index) => {
      const geometry = new THREE.PlaneGeometry(2.5, 3.5);
      // Use MeshBasicMaterial so textures are not affected by lighting/reflection
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const plane = new THREE.Mesh(geometry, material);
      
      // Position the plane
      plane.position.copy(position);
      
      // Make plane look towards center and keep upright (no random z-tilt)
      plane.up.set(0, 1, 0);
      plane.lookAt(0, 0, 0);
      
      // Disable shadows
      plane.castShadow = false;
      plane.receiveShadow = false;
      
      sphereGroup.add(plane);
      
      const planeData: PlaneData = {
        mesh: plane,
        originalPosition: position.clone(),
        originalRotation: plane.rotation.clone(),
        imageAspect: undefined
      };
      planes.push(planeData);

      const loader = new THREE.TextureLoader();
      // Use the local image for planes near the equator (middle row)
      const isMiddleRow = Math.abs(position.y) <= sphereRadius * 0.12;
      const urlToLoad = isMiddleRow ? middleRowImageUrl : otherPublicImageUrls[index % otherPublicImageUrls.length];
      loader.load(
        urlToLoad,
        (texture: THREE.Texture) => {
          // Sharper sampling settings
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          // Max anisotropy for oblique viewing angles
          texture.anisotropy = (rendererRef.current?.capabilities.getMaxAnisotropy?.() || 8);
          (texture as any).colorSpace = THREE.SRGBColorSpace;
          (material as THREE.MeshBasicMaterial).map = texture;
          material.needsUpdate = true;
          const img = texture.image as HTMLImageElement | { width: number; height: number } | undefined;
          if (img && (img as any).width && (img as any).height) {
            planeData.imageAspect = (img as any).width / (img as any).height;
          }
        },
        undefined,
        () => {}
      );
    });

    planesRef.current = planes;

    // Helper: open plane at given client coordinates
    const openAtClient = (clientX: number, clientY: number) => {
      if (!isAnimatedRef.current || isModalOpenRef.current || !cameraRef.current || !rendererRef.current || !sphereGroupRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouseNdcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseNdcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = raycasterRef.current!;
      raycaster.setFromCamera(mouseNdcRef.current, cameraRef.current);
      const intersects = raycaster.intersectObjects(sphereGroupRef.current.children, true);
      if (!intersects.length) return;

      const first = intersects[0];
      const mesh = first.object as THREE.Mesh;
      const planeData = planesRef.current.find(p => p.mesh === mesh);
      if (!planeData) return;

      selectedPlaneRef.current = planeData;
      isModalOpenRef.current = true;
      setIsModalOpen(true);
      billboardActiveRef.current = false;

      const cam = cameraRef.current;
      const group = sphereGroupRef.current;

      // Target is the center of the sphere/group
      const groupWorldCenter = group.getWorldPosition(new THREE.Vector3());
      const targetWorldPos = groupWorldCenter.clone();
      const targetLocalPos = group.worldToLocal(targetWorldPos.clone());

      // (Removed direct lookAt pre-align; we precompute a local quaternion below for stability)

      // Compute uniform scale to fit within both width and height fractions (contain)
      const distanceToCenter = cam.position.distanceTo(groupWorldCenter);
      const worldHeight = 2 * distanceToCenter * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const worldWidth = worldHeight * cam.aspect;
      const baseWidthFraction = 0.6; // desktop: 2x previous size
      const baseHeightFraction = 0.6; // desktop: 2x previous size
      const desiredWidthFraction = isTouchDevice() ? Math.min(0.9, baseWidthFraction * 3) : baseWidthFraction;
      const desiredHeightFraction = isTouchDevice() ? Math.min(0.9, baseHeightFraction * 3) : baseHeightFraction;
      const maxW = worldWidth * desiredWidthFraction;
      const maxH = worldHeight * desiredHeightFraction;
      const planeParams = (mesh.geometry as THREE.PlaneGeometry).parameters as { width: number; height: number };
      const baseW = planeParams.width || 2.5;
      const baseH = planeParams.height || 3.5;
      const imageAspect = (selectedPlaneRef.current?.imageAspect) ?? (baseW / baseH);
      let targetW = maxW;
      let targetH = targetW / imageAspect;
      if (targetH > maxH) {
        targetH = maxH;
        targetW = targetH * imageAspect;
      }
      const xScale = targetW / baseW;
      const yScale = targetH / baseH;

      const tl = gsap.timeline({ paused: true });

      // Dim other planes slightly
      planesRef.current.forEach(p => {
        if (p.mesh !== mesh) {
          tl.to(p.mesh.material as any, { opacity: 0.4, duration: 0.4, ease: 'power2.out' }, 0);
        }
      });

      // Ensure selected renders on top while modal is open
      const selectedMat = mesh.material as THREE.Material & { depthTest?: boolean; depthWrite?: boolean };
      selectedMat.depthTest = false;
      selectedMat.depthWrite = false;
      mesh.renderOrder = 999;

      // Animate position to exact center in parent-local space and scale preserving aspect
      tl.to(mesh.position, { x: targetLocalPos.x, y: targetLocalPos.y, z: targetLocalPos.z, duration: 1.0, ease: 'power3.inOut' }, 0);
      tl.to(mesh.scale, { x: xScale, y: yScale, z: 1, duration: 1.0, ease: 'power3.inOut' }, 0);

      // Smoothly rotate to face the camera using shortest-path quaternion slerp (no billboard)
      if (cam) {
        const startQuat = mesh.quaternion.clone();
        const lookAtMatrix = new THREE.Matrix4();
        lookAtMatrix.lookAt(targetWorldPos.clone(), cam.position.clone(), new THREE.Vector3(0, 1, 0));
        const targetWorldQuat = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);
        const parentWorldQuat = new THREE.Quaternion();
        if (mesh.parent) mesh.parent.getWorldQuaternion(parentWorldQuat);
        let targetLocalQuat = parentWorldQuat.clone().invert().multiply(targetWorldQuat);
        // Rotate an extra 180deg around Y so the plane's +Z (front) faces the camera (prevents mirrored backside)
        const flipQuatY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        targetLocalQuat.multiply(flipQuatY);
        if (startQuat.dot(targetLocalQuat) < 0) {
          targetLocalQuat.set(-targetLocalQuat.x, -targetLocalQuat.y, -targetLocalQuat.z, -targetLocalQuat.w);
        }
        const q = { t: 0 } as { t: number };
        tl.to(q, {
          t: 1,
          duration: 1.0,
          ease: 'power2.inOut',
          onUpdate: () => {
            mesh.quaternion.copy(startQuat).slerp(targetLocalQuat, q.t);
          }
        }, 0);
      }

      // Play the open timeline
      tl.play(0);
    };

    // Mouse move handler (desktop)
    const handleMouseMove = (event: MouseEvent) => {
      if (!isAnimatedRef.current || isModalOpenRef.current) return;
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      targetRotationRef.current.y = mouseRef.current.x * Math.PI * 0.5;
      targetRotationRef.current.x = 0;
    };

    // Touch handlers (mobile swipe + tap-to-open)
    const handleTouchStart = (e: TouchEvent) => {
      if (!isAnimatedRef.current || isModalOpenRef.current) return;
      isTouchingRef.current = true;
      const t = e.touches[0];
      lastTouchXRef.current = t.clientX;
      lastTouchYRef.current = t.clientY;
      touchStartXRef.current = t.clientX;
      touchStartYRef.current = t.clientY;
      touchStartTimeRef.current = performance.now();
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchingRef.current || !isAnimatedRef.current || isModalOpenRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - lastTouchXRef.current;
      lastTouchXRef.current = t.clientX;
      lastTouchYRef.current = t.clientY;
      const rotationDelta = (dx / window.innerWidth) * Math.PI; // one screen width ~ 180deg
      targetRotationRef.current.y += rotationDelta;
      targetRotationRef.current.x = 0;
    };
    const handleTouchEnd = () => {
      if (!isAnimatedRef.current) return;
      const dt = performance.now() - touchStartTimeRef.current;
      const dx = Math.abs(lastTouchXRef.current - touchStartXRef.current);
      const dy = Math.abs(lastTouchYRef.current - touchStartYRef.current);
      isTouchingRef.current = false;
      // Treat as a tap if quick and minimal movement
      if (!isModalOpenRef.current && dt < 250 && dx < 10 && dy < 10) {
        openAtClient(lastTouchXRef.current, lastTouchYRef.current);
      }
    };

    // Click handler (desktop). If modal is open, close when clicking outside.
    const handleClick = (event: MouseEvent) => {
      if (isModalOpenRef.current && cameraRef.current && rendererRef.current && sphereGroupRef.current) {
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        mouseNdcRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseNdcRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = raycasterRef.current!;
        raycaster.setFromCamera(mouseNdcRef.current, cameraRef.current);
        const intersects = raycaster.intersectObjects(sphereGroupRef.current.children, true);
        const hitSelected = intersects.find((i: THREE.Intersection) => i.object === selectedPlaneRef.current?.mesh);
        if (!hitSelected) {
          handleClose();
        }
        return;
      }
      openAtClient(event.clientX, event.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    renderer.domElement.addEventListener('click', handleClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Smooth rotation interpolation
      if (isAnimatedRef.current && !isModalOpenRef.current && sphereGroupRef.current) {
        // Mobile gentle auto-rotate when not touching
        if (isTouchDevice() && !isTouchingRef.current) {
          targetRotationRef.current.y += 0.003; // slow drift
        }

        currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.05;
        currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.05;
        
        sphereGroupRef.current.rotation.x = currentRotationRef.current.x;
        sphereGroupRef.current.rotation.y = currentRotationRef.current.y;
      }
      
      // Billboarding handled by GSAP ticker to avoid conflicts with render loop
      
      // Subtle floating animation when not revealed
      if (!isAnimatedRef.current && sphereGroupRef.current) {
        const time = Date.now() * 0.0008;
        sphereGroupRef.current.rotation.y = Math.sin(time) * 0.1;
        sphereGroupRef.current.rotation.x = Math.cos(time * 0.7) * 0.05;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart as any);
      window.removeEventListener('touchmove', handleTouchMove as any);
      window.removeEventListener('touchend', handleTouchEnd as any);
      renderer.domElement.removeEventListener('click', handleClick);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const handleStart = () => {
    if (isAnimatedRef.current) return;
    
    isAnimatedRef.current = true;
    setIsRevealed(true);

    const tl = gsap.timeline();

    // Camera movement
    if (cameraRef.current) {
      tl.to(cameraRef.current.position, {
        duration: 2.5,
        x: 0,
        y: 0,
        z: 12,
        ease: "power2.inOut"
      });
    }

    // Fade in planes with stagger
    planesRef.current.forEach((planeData, index) => {
      tl.to(planeData.mesh.material, {
        duration: 1.8,
        opacity: 1.0,
        ease: "power2.out",
        delay: index * 0.05
      }, 0.8);

      // Subtle scale animation
      tl.fromTo(planeData.mesh.scale, 
        { x: 0.1, y: 0.1, z: 0.1 },
        {
          duration: 2,
          x: 1,
          y: 1,
          z: 1,
          ease: "back.out(1.2)",
          delay: index * 0.05
        }, 1);
    });

    // Reset sphere rotation for smooth transition
    if (sphereGroupRef.current) {
      tl.to(sphereGroupRef.current.rotation, {
        duration: 1.5,
        x: 0,
        y: 0,
        ease: "power2.inOut"
      }, 0);
    }
  };

  const handleClose = () => {
    if (!selectedPlaneRef.current) return;
    const planeData = selectedPlaneRef.current;
    const mesh = planeData.mesh;

    const tl = gsap.timeline({
      onComplete: () => {
        const mat = mesh.material as THREE.Material & { depthTest?: boolean; depthWrite?: boolean };
        mat.depthTest = true;
        mat.depthWrite = true;
        mesh.renderOrder = 0;
        isModalOpenRef.current = false;
        setIsModalOpen(false);
        billboardActiveRef.current = false;
        if (billboardTickerRef.current) {
          gsap.ticker.remove(billboardTickerRef.current);
          billboardTickerRef.current = null;
        }
        selectedPlaneRef.current = null;
      }
    });

    // Restore other planes' opacity
    planesRef.current.forEach(p => {
      if (p.mesh !== mesh) {
        tl.to(p.mesh.material as any, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0);
      }
    });

    // Animate back to original position and scale
    tl.to(mesh.position, { x: planeData.originalPosition.x, y: planeData.originalPosition.y, z: planeData.originalPosition.z, duration: 0.9, ease: 'power3.inOut' }, 0);
    tl.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'power3.inOut' }, 0);

    // Smoothly rotate back to original rotation using shortest-path slerp
    const startQuat = mesh.quaternion.clone();
    let targetQuat = new THREE.Quaternion().setFromEuler(planeData.originalRotation);
    if (startQuat.dot(targetQuat) < 0) targetQuat.set(-targetQuat.x, -targetQuat.y, -targetQuat.z, -targetQuat.w);
    const q = { t: 0 } as { t: number };
    tl.to(q, {
      t: 1,
      duration: 0.9,
      ease: 'power2.inOut',
      onUpdate: () => { mesh.quaternion.copy(startQuat).slerp(targetQuat, q.t); }
    }, 0);
    tl.add(() => {
      // Ensure exact original orientation at the end to avoid residual precision error
      mesh.rotation.copy(planeData.originalRotation);
    }, 0.9);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-white">
      <div ref={mountRef} className="absolute inset-0" />
      
      {/* Header */}
      {false && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
          <h1 className="text-3xl font-bold text-gray-800 tracking-wide">
            OpenPurpose<sup className="text-sm">®</sup>
          </h1>
        </div>
      )}

      {/* Start Button */}
      {!isRevealed && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <button
            onClick={handleStart}
            className="w-36 h-36 bg-black rounded-full flex items-center justify-center text-white text-2xl font-medium hover:scale-105 transition-transform duration-300 shadow-2xl hover:shadow-3xl"
          >
            Start
          </button>
        </div>
      )}

      {/* Instructions */}
      {false && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
          <p className="text-gray-600 text-sm text-center">
            Move your mouse left-right to explore the sphere. Click an image to enlarge.
          </p>
        </div>
      )}

      {/* Removed overlay div to ensure nothing overlays images */}
      {false && isModalOpen && (<div className="absolute inset-0 z-20" />)}

      {/* Navigation */}
      {isRevealed && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <nav className="flex space-x-8">
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium">
              Home
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium">
              Portfolio
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium">
              About
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium">
              Contact
            </a>
          </nav>
        </div>
      )}
    </div>
  );
};

export default FibonacciSphere;