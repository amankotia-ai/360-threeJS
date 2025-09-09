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
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Touch state
  const isTouchingRef = useRef(false);
  const lastTouchXRef = useRef(0);
  const lastTouchYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);

  // Sample images for the planes (using placeholder URLs)
  const imageUrls = [
    'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184293/pexels-photo-3184293.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184294/pexels-photo-3184294.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184295/pexels-photo-3184295.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184296/pexels-photo-3184296.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184297/pexels-photo-3184297.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184299/pexels-photo-3184299.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184300/pexels-photo-3184300.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184301/pexels-photo-3184301.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184302/pexels-photo-3184302.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184303/pexels-photo-3184303.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184304/pexels-photo-3184304.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184305/pexels-photo-3184305.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184306/pexels-photo-3184306.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184307/pexels-photo-3184307.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184308/pexels-photo-3184308.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184309/pexels-photo-3184309.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184310/pexels-photo-3184310.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184311/pexels-photo-3184311.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184312/pexels-photo-3184312.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184313/pexels-photo-3184313.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184314/pexels-photo-3184314.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184315/pexels-photo-3184315.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184316/pexels-photo-3184316.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184318/pexels-photo-3184318.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184319/pexels-photo-3184319.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184320/pexels-photo-3184320.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184321/pexels-photo-3184321.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184322/pexels-photo-3184322.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184323/pexels-photo-3184323.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184324/pexels-photo-3184324.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3184326/pexels-photo-3184326.jpeg?auto=compress&cs=tinysrgb&w=400'
  ];

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    // Create planes with fibonacci distribution
    const sphereRadius = 15;
    const positions = fibonacciSphere(36, sphereRadius);
    const planes: PlaneData[] = [];

    positions.forEach((position, index) => {
      const geometry = new THREE.PlaneGeometry(2.5, 3.5);
      
      // Create material with visible fallback color
      const material = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      
      const plane = new THREE.Mesh(geometry, material);
      
      // Position the plane
      plane.position.copy(position);
      
      // Make plane look towards center
      plane.lookAt(0, 0, 0);
      
      // Add some random rotation for natural look
      plane.rotation.z += (Math.random() - 0.5) * 0.3;
      
      plane.castShadow = true;
      plane.receiveShadow = true;
      
      sphereGroup.add(plane);
      
      const planeData: PlaneData = {
        mesh: plane,
        originalPosition: position.clone(),
        originalRotation: plane.rotation.clone(),
        imageAspect: undefined
      };
      planes.push(planeData);

      // Load texture asynchronously
      const loader = new THREE.TextureLoader();
      loader.load(
        imageUrls[index % imageUrls.length],
        (texture: THREE.Texture) => {
          texture.minFilter = THREE.LinearFilter;
          material.color.setHex(0xffffff);
          material.map = texture;
          material.needsUpdate = true;
          // Capture natural aspect ratio once image is available
          const img = texture.image as HTMLImageElement | { width: number; height: number } | undefined;
          if (img && (img as any).width && (img as any).height) {
            planeData.imageAspect = (img as any).width / (img as any).height;
          }
        },
        undefined,
        (error: unknown) => {
          console.warn('Failed to load texture:', error);
          // Keep the colorful fallback
        }
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

      const cam = cameraRef.current;
      const group = sphereGroupRef.current;

      // Target is the center of the sphere/group
      const groupWorldCenter = group.getWorldPosition(new THREE.Vector3());
      const targetWorldPos = groupWorldCenter.clone();
      const targetLocalPos = group.worldToLocal(targetWorldPos.clone());

      // Compute uniform scale to fit within both width and height fractions (contain)
      const distanceToCenter = cam.position.distanceTo(groupWorldCenter);
      const worldHeight = 2 * distanceToCenter * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const worldWidth = worldHeight * cam.aspect;
      const baseWidthFraction = 0.3;
      const baseHeightFraction = 0.3;
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

      const tl = gsap.timeline();

      // Dim other planes
      planesRef.current.forEach(p => {
        if (p.mesh !== mesh) {
          tl.to((p.mesh.material as any), { opacity: 0.12, duration: 0.5, ease: 'power2.out' }, 0);
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

      // Simple angle correction to face camera without flip
      const startQuat = mesh.quaternion.clone();
      const lookAtMatrix = new THREE.Matrix4();
      lookAtMatrix.lookAt(targetWorldPos.clone(), cam.position.clone(), new THREE.Vector3(0, 1, 0));
      const targetWorldQuat = new THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);
      const parentWorldQuat = new THREE.Quaternion();
      mesh.parent && mesh.parent.getWorldQuaternion(parentWorldQuat);
      let targetLocalQuat = parentWorldQuat.clone().invert().multiply(targetWorldQuat);
      if (startQuat.dot(targetLocalQuat) < 0) targetLocalQuat.set(-targetLocalQuat.x, -targetLocalQuat.y, -targetLocalQuat.z, -targetLocalQuat.w);
      const q = { t: 0 };
      tl.to(q, {
        t: 1,
        duration: 1.0,
        ease: 'power2.out',
        onUpdate: () => {
          mesh.quaternion.copy(startQuat).slerp(targetLocalQuat, q.t);
        }
      }, 0);
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

    // Click handler for selecting planes (desktop)
    const handleClick = (event: MouseEvent) => {
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

  // Overlay click: close when clicking outside the selected mesh
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isModalOpenRef.current || !rendererRef.current || !cameraRef.current || !sphereGroupRef.current) return;
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
  };

  const handleClose = () => {
    if (!selectedPlaneRef.current) return;
    const planeData = selectedPlaneRef.current;
    const mesh = planeData.mesh;

    const tl = gsap.timeline({
      onComplete: () => {
        // Restore material and flags
        const mat = mesh.material as THREE.Material & { depthTest?: boolean; depthWrite?: boolean };
        mat.depthTest = true;
        mat.depthWrite = true;
        mesh.renderOrder = 0;
        isModalOpenRef.current = false;
        setIsModalOpen(false);
        selectedPlaneRef.current = null;
      }
    });

    // Restore others' opacity
    planesRef.current.forEach(p => {
      if (p.mesh !== mesh) {
        tl.to((p.mesh.material as any), { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0);
      }
    });

    // Animate back to original position and scale
    tl.to(mesh.position, { x: planeData.originalPosition.x, y: planeData.originalPosition.y, z: planeData.originalPosition.z, duration: 0.9, ease: 'power3.inOut' }, 0);
    tl.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'power3.inOut' }, 0);

    // Simple angle correction back to the original rotation (no flip)
    const startQuat = mesh.quaternion.clone();
    let targetQuat = new THREE.Quaternion().setFromEuler(planeData.originalRotation);
    if (startQuat.dot(targetQuat) < 0) targetQuat.set(-targetQuat.x, -targetQuat.y, -targetQuat.z, -targetQuat.w);
    const q = { t: 0 };
    tl.to(q, {
      t: 1,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => {
        mesh.quaternion.copy(startQuat).slerp(targetQuat, q.t);
      }
    }, 0);
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

      {/* Modal overlay: click outside image to close */}
      {isModalOpen && (
        <div ref={overlayRef} onClick={handleOverlayClick} className="absolute inset-0 z-20 bg-transparent" />
      )}

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