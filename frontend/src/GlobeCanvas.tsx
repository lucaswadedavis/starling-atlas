import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
// @ts-ignore
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as satellite from "satellite.js";

const EARTH_RADIUS_KM = 6371; // km
// Virtual time step in seconds per animation frame
const TIME_STEP_SECONDS = 60; // 1 minute per frame

// Add prop type for satellites
interface GlobeCanvasProps {
  satellites: {
    tle_line1: string;
    tle_line2: string;
    color: string;
    displayName: string;
  }[];
}

const GlobeCanvas: React.FC<GlobeCanvasProps> = ({ satellites }) => {
  const globeRef = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null); // Store Globe instance
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const timeRef = useRef<Date>(new Date());
  const frameIdRef = useRef<number>();

  // Only set up Three.js scene and Globe once
  useEffect(() => {
    if (!globeRef.current) return;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - 600, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    globeRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup scene
    const scene = new THREE.Scene();

    // Setup camera
    const camera = new THREE.PerspectiveCamera();
    camera.aspect = (window.innerWidth - 600) / window.innerHeight;
    camera.updateProjectionMatrix();
    camera.position.z = 400;
    cameraRef.current = camera;

    // Add camera controls
    const tbControls = new OrbitControls(camera, renderer.domElement);
    tbControls.minDistance = 200;
    tbControls.maxDistance = 400;
    tbControls.rotateSpeed = 5;
    tbControls.zoomSpeed = 0.8;
    controlsRef.current = tbControls;

    // Add lights
    scene.add(new THREE.AmbientLight(0xcccccc, Math.PI));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI));

    // Setup globe
    const Globe = new ThreeGlobe()
      .globeImageUrl("/assets/earth-blue-marble.jpg")
      .particleLat("lat")
      .particleLng("lng")
      .particleAltitude("alt")
      .particlesSize(2);
    globeInstance.current = Globe;

    // Satellite icon
    new THREE.TextureLoader().load("/assets/sat-icon.png", (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      //Globe.particlesTexture(texture);
    });

    scene.add(Globe);

    // Animation loop
    function animate() {
      tbControls.update();
      // Advance virtual time
      timeRef.current = new Date(
        timeRef.current.getTime() + TIME_STEP_SECONDS * 100
      );
      // Update satellite positions
      if (globeInstance.current) {
        const satPositions = getSatPositions(timeRef.current);
        globeInstance.current.particlesData([satPositions]);
      }
      renderer.render(scene, camera);
      frameIdRef.current = requestAnimationFrame(animate);
    }
    animate();

    // Handle resize
    const handleResize = () => {
      if (!globeRef.current || !cameraRef.current || !rendererRef.current)
        return;
      cameraRef.current.aspect =
        globeRef.current.clientWidth / globeRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(
        globeRef.current.clientWidth - 600,
        globeRef.current.clientHeight
      );
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      renderer.dispose();
      if (globeRef.current) {
        globeRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update satellite data when satellites prop changes (without resetting scene)
  useEffect(() => {
    // On satellite prop change, update the globe's particlesData immediately
    if (globeInstance.current) {
      // Optionally, reset virtual time if you want new satellites to start at 'now'
      // timeRef.current = new Date();
      const satPositions = getSatPositions(timeRef.current);
      globeInstance.current.particlesData([satPositions]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites]);

  function getSatPositions(currentTime: Date) {
    const gmst = satellite.gstime(currentTime);
    return satellites
      .map((sat) => {
        try {
          const satrec = satellite.twoline2satrec(sat.tle_line1, sat.tle_line2);
          const eci = satellite.propagate(satrec, currentTime);
          if (eci && eci.position) {
            const gdPos = satellite.eciToGeodetic(eci.position, gmst);
            return {
              lat: satellite.radiansToDegrees(gdPos.latitude),
              lng: satellite.radiansToDegrees(gdPos.longitude),
              alt: gdPos.height / EARTH_RADIUS_KM,
              color: sat.color,
              name: sat.displayName,
            };
          }
        } catch (e) {
          // Ignore satellites that can't be propagated
        }
        return null;
      })
      .filter(
        (
          x
        ): x is {
          lat: number;
          lng: number;
          alt: number;
          color: string;
          name: string;
        } => x !== null
      );
  }

  return (
    <div>
      <div
        ref={globeRef}
        style={{ height: "100vh", width: "calc(100vw - 600px)" }}
      />
    </div>
  );
};

export default GlobeCanvas;
