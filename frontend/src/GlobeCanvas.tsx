import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
// @ts-ignore
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as satellite from "satellite.js";

const EARTH_RADIUS_KM = 6371; // km

const GlobeCanvas: React.FC = () => {
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
    fetch("/assets/space-track-leo.txt")
      .then((r) => r.text())
      .then((rawData) => {
        const tleData = rawData
          .replace(/\r/g, "")
          .split(/\n(?=[^12])/) // split on newlines not followed by 1 or 2
          .map((tle) => tle.split("\n"));
        const satData: any[] = tleData
          .map(([name, ...tle]) => ({
            satrec: satellite.twoline2satrec(...(tle as [string, string])),
            name: name.trim().replace(/^0 /, ""),
          }))
          // exclude those that can't be propagated
          .filter((d) => !!satellite.propagate(d.satrec, new Date())?.position);

        // time ticker
        let time = new Date();
        function frameTicker() {
          frameId = requestAnimationFrame(frameTicker);

          // Update satellite positions
          const gmst = satellite.gstime(time);
          satData.forEach((d) => {
            const eci = satellite.propagate(d.satrec, time);
            if (eci && eci.position) {
              const gdPos = satellite.eciToGeodetic(eci.position, gmst);
              d.lat = satellite.radiansToDegrees(gdPos.latitude);
              d.lng = satellite.radiansToDegrees(gdPos.longitude);
              d.alt = gdPos.height / EARTH_RADIUS_KM;
            }
          });

          const filteredSatData = satData.filter(
            (d) => !isNaN(d.lat) && !isNaN(d.lng) && !isNaN(d.alt)
          );
          if (Array.isArray(filteredSatData)) {
            Globe.particlesData([filteredSatData]);
          }
        }
        frameTicker();
      });

    // Animation loop
    function animate() {
      tbControls.update();
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
  }, []);

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
