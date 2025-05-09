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

  useEffect(() => {
    if (!globeRef.current) return;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - 600, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    globeRef.current.appendChild(renderer.domElement);

    // Setup scene
    const scene = new THREE.Scene();

    // Setup camera
    const camera = new THREE.PerspectiveCamera();
    camera.aspect = (window.innerWidth - 600) / window.innerHeight;
    camera.updateProjectionMatrix();
    camera.position.z = 400;

    // Add camera controls
    const tbControls = new OrbitControls(camera, renderer.domElement);
    tbControls.minDistance = 200;
    tbControls.maxDistance = 400;
    tbControls.rotateSpeed = 5;
    tbControls.zoomSpeed = 0.8;

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

    // Static minimal test: set a single particle
    //Globe.particlesData([{ lat: 0, lng: 0, alt: 0 }]);

    // Satellite icon
    new THREE.TextureLoader().load("/assets/sat-icon.png", (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      //Globe.particlesTexture(texture);
    });

    scene.add(Globe);

    // Fetch TLE data and animate satellites
    let frameId: number;
    // --- Animate user satellites ---
    let time = new Date(); // Virtual time

    function getSatPositions(currentTime: Date) {
      const gmst = satellite.gstime(currentTime);
      return satellites
        .map((sat) => {
          try {
            const satrec = satellite.twoline2satrec(
              sat.tle_line1,
              sat.tle_line2
            );
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

    // Animation loop
    function animate() {
      tbControls.update();
      // Advance virtual time
      time = new Date(time.getTime() + TIME_STEP_SECONDS * 100);
      // Update satellite positions
      const satPositions = getSatPositions(time);
      Globe.particlesData([satPositions]);
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    // Handle resize
    const handleResize = () => {
      if (!globeRef.current) return;
      camera.aspect =
        globeRef.current.clientWidth / globeRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        globeRef.current.clientWidth - 600,
        globeRef.current.clientHeight
      );
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameId) cancelAnimationFrame(frameId);
      renderer.dispose();
      if (globeRef.current) {
        globeRef.current.removeChild(renderer.domElement);
      }
    };
  }, [satellites]);

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
