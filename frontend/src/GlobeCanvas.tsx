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
interface Satellite {
  id: string;
  displayName: string;
  form: any;
  results?: any[];
  createdAt: string;
  color: string;
}

interface GlobeCanvasProps {
  satellites: Satellite[];
}

const GlobeCanvas: React.FC<GlobeCanvasProps> = ({ satellites }) => {
  const globeRef = useRef<HTMLDivElement>(null);
  const globeInstance = useRef<any>(null); // Store Globe instance
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const timeRef = useRef<Date>(new Date());
  const frameIdRef = useRef<number>();
  const satellitesRef = useRef(satellites); // Always up-to-date satellites

  // Keep satellitesRef in sync with latest satellites prop
  useEffect(() => {
    satellitesRef.current = satellites;
  }, [satellites]);

  // Only set up Three.js scene and Globe once
  useEffect(() => {
    if (!globeRef.current) return;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - 600, window.innerHeight - 200);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xffffff, 1); // Set background to white
    globeRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup scene
    const scene = new THREE.Scene();

    // Setup camera
    const camera = new THREE.PerspectiveCamera();
    camera.aspect = (window.innerWidth - 600) / (window.innerHeight - 200);
    camera.updateProjectionMatrix();
    camera.position.z = 400;
    cameraRef.current = camera;

    // Add camera controls
    const tbControls = new OrbitControls(camera, renderer.domElement);
    tbControls.minDistance = 200;
    tbControls.maxDistance = 500;
    tbControls.rotateSpeed = 5;
    tbControls.zoomSpeed = 0.8;
    controlsRef.current = tbControls;

    // Add lights
    scene.add(new THREE.AmbientLight(0xcccccc, Math.PI));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI));

    const pathsData = satellites
      .map((sat) => ({
        color: sat.color,
        path: Array.isArray(sat.results)
          ? sat.results
              .filter((row) => Array.isArray(row.lla) && row.lla.length === 3)
              .map((row) => ({
                lat: row.lla[0],
                lng: row.lla[1],
                alt: row.lla[2] / 6371,
              }))
          : [],
      }))
      .filter((p) => p.path.length > 1);
    const paths = pathsData.map((p) =>
      p.path.map((pt) => [pt.lat, pt.lng, pt.alt])
    );
    console.log(paths);
    const colors = pathsData.map((p) => p.color);
    console.log("colors", colors);
    // Setup globe
    const Globe = new ThreeGlobe()
      .globeImageUrl("/assets/earth-blue-marble-desaturated.jpg")
      .particleLat("lat")
      .particleLng("lng")
      .particleAltitude("alt")
      .particlesSize(2)
      .pathsData(paths)
      .pathColor((...args: any[]) => {
        console.log("color args", args);
        return "red";
      })
      .pathStroke(10);
    globeInstance.current = Globe;

    // Satellite icon
    new THREE.TextureLoader().load("/assets/sat-icon.png", (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      Globe.particlesTexture(texture);
    });

    scene.add(Globe);

    // Animation loop
    function animate() {
      tbControls.update();
      // Advance virtual time
      timeRef.current = new Date(
        timeRef.current.getTime() + TIME_STEP_SECONDS * 10
      );
      // Update satellite positions
      if (globeInstance.current) {
        const satPositions = getSatPositions(
          timeRef.current,
          satellitesRef.current
        );
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
    if (globeInstance.current) {
      const satPositions = getSatPositions(timeRef.current, satellites);
      globeInstance.current.particlesData([satPositions]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satellites]);

  // Update paths when satellites change
  useEffect(() => {
    if (globeInstance.current && satellites.length > 0) {
      const pathsData = satellites
        .map((sat) => ({
          color: sat.color,
          path: Array.isArray(sat.results)
            ? sat.results
                .filter((row) => Array.isArray(row.lla) && row.lla.length === 3)
                .map((row) => ({
                  lat: row.lla[0],
                  lng: row.lla[1],
                  alt: row.lla[2] / 6371,
                }))
            : [],
        }))
        .filter((p) => p.path.length > 1);
      console.log("pathsdata", pathsData);
      const paths = pathsData.map((p) =>
        p.path.map((pt) => [pt.lat, pt.lng, pt.alt])
      );
      console.log(paths);
      const colors = pathsData.map((p) => p.color);
      console.log("colors", colors);
      globeInstance.current.pathsData(paths);
      globeInstance.current.pathColor((...args: any[]) => {
        console.log("color args", args);
        // get the index of the path
        const pathIndex = paths.indexOf(args[0]);
        let color = "white";
        if (pathIndex >= 0) {
          console.log("pathIndex", pathIndex);
          color = colors[pathIndex];
        }
        return color;
      });
    }
  }, [satellites]);

  function getSatPositions(
    currentTime: Date,
    sats: GlobeCanvasProps["satellites"]
  ) {
    const gmst = satellite.gstime(currentTime);
    return sats
      .map((sat) => {
        try {
          const satrec = satellite.twoline2satrec(
            sat.form.tle_line1,
            sat.form.tle_line2
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

  return (
    <div className="bg-white flex items-center justify-center border-l-1">
      <div
        ref={globeRef}
        style={{ height: "calc(100vh - 200px)", width: "calc(100vw - 600px)" }}
        className=""
      />
    </div>
  );
};

export default GlobeCanvas;
