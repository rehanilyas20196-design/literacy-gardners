'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { makeCoverCanvas, averageColor } from '@/lib/covers';

const VERTEX = /* glsl */ `
  uniform float uStretch;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.x *= uStretch;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFringe;
  uniform float uHaze;
  uniform vec3 uHazeColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float f = uFringe * 0.018;
    float r = texture2D(uMap, vUv + vec2(f, 0.0)).r;
    float g = texture2D(uMap, vUv).g;
    float b = texture2D(uMap, vUv - vec2(f, 0.0)).b;
    vec3 col = vec3(r, g, b);
    col += uHazeColor * uHaze * 0.35;
    gl_FragColor = vec4(col, uOpacity);
  }
`;

const ELLIPSE_A = 8.2;
const ELLIPSE_B = 2.6;
const CARD = 1.85;
const GAP = 1.06;
const MAX_TURN = 1.05;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function TunnelFoldSlider({ books }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const router = useRouter();
  const [webgl] = useState(hasWebGL);
  const [playing, setPlaying] = useState(true);
  const [live, setLive] = useState('');

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  useEffect(() => {
    if (!webgl || !books?.length || !mountRef.current) return;

    const mount = mountRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let autoPlay = !reduced;
    setPlaying(autoPlay);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0a');
    scene.fog = new THREE.Fog('#0a0a0a', 9, 18);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, 0.45, 0.9);
    camera.lookAt(0, -0.05, -ELLIPSE_B);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const floorGeo = new THREE.PlaneGeometry(40, 12);
    const floorMat = new THREE.MeshBasicMaterial({ color: '#111111' });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.35;
    scene.add(floor);

    const geo = new THREE.PlaneGeometry(CARD, CARD, 24, 1);
    geo.translate(CARD / 2, 0, 0);

    const cards = books.map((book, i) => {
      const canvas = makeCoverCanvas(book);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const hazeCol = averageColor(canvas);
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: {
          uMap: { value: tex },
          uStretch: { value: 1 },
          uFringe: { value: 0 },
          uHaze: { value: 0 },
          uHazeColor: { value: new THREE.Vector3(...hazeCol) },
          uOpacity: { value: 1 }
        }
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.book = book;
      mesh.userData.index = i;
      scene.add(mesh);
      return mesh;
    });

    const n = cards.length;
    const state = {
      angle: 0,
      vel: 0,
      cruise: 0.16,
      fold: 0,
      foldVel: 0,
      dragging: false,
      lastX: 0,
      moved: 0,
      visible: true,
      hidden: document.hidden,
      raf: 0
    };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();
    const springK = 42;
    const springC = 2 * Math.sqrt(springK);

    function resize() {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 55 : 42;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const io = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
    }, { threshold: 0.05 });
    io.observe(mount);

    function onVis() {
      state.hidden = document.hidden;
    }
    document.addEventListener('visibilitychange', onVis);

    function onDown(e) {
      state.dragging = true;
      state.moved = 0;
      state.lastX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      renderer.domElement.style.cursor = 'grabbing';
    }
    function onMove(e) {
      if (!state.dragging) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const dx = x - state.lastX;
      state.lastX = x;
      state.moved += Math.abs(dx);
      state.vel += dx * 0.0045;
    }
    function onUp(e) {
      if (!state.dragging) return;
      state.dragging = false;
      renderer.domElement.style.cursor = 'grab';
      if (state.moved < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        const cx = (e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0) - rect.left;
        const cy = (e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0) - rect.top;
        pointer.x = (cx / rect.width) * 2 - 1;
        pointer.y = -(cy / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(cards);
        if (hits.length) {
          const book = hits[0].object.userData.book;
          setLive(`${book.title} by ${book.author_name}`);
          if (book.slug) router.push(`/books/${book.slug}`);
        }
      }
    }
    function onWheel(e) {
      e.preventDefault();
      state.vel += (e.deltaY + e.deltaX) * 0.0016;
    }
    function onKey(e) {
      if (e.key === 'ArrowRight') state.vel += 0.55;
      if (e.key === 'ArrowLeft') state.vel -= 0.55;
    }

    const el = renderer.domElement;
    el.style.cursor = 'grab';
    el.style.touchAction = 'pan-y';
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    mount.addEventListener('keydown', onKey);

    const step = (Math.PI * 2) / n / GAP;

    function frame() {
      state.raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!state.visible || state.hidden) return;

      const playRef = apiRef.current;
      if (!state.dragging && playRef?.playing) {
        state.vel += (state.cruise * (playRef.speed ?? 1) - state.vel) * (1 - Math.exp(-2.2 * dt));
      } else {
        state.vel *= Math.exp(-1.8 * dt);
      }
      state.angle += state.vel * dt * 2.4;

      const foldTarget = THREE.MathUtils.clamp((state.vel - state.cruise) * 1.35, -1.4, 1.4);
      const acc = -springK * (state.fold - foldTarget) - springC * state.foldVel;
      state.foldVel += acc * dt;
      state.fold += state.foldVel * dt;

      for (let i = 0; i < n; i++) {
        const mesh = cards[i];
        const t = state.angle + i * step;
        const sinT = Math.sin(t);
        const cosT = Math.cos(t);

        mesh.position.set(ELLIPSE_A * sinT, 0, -ELLIPSE_B * cosT);
        mesh.lookAt(camera.position);

        const near = Math.max(0, cosT);
        mesh.rotateY(-Math.pow(near, 1.6) * MAX_TURN);
        mesh.rotateY(state.fold * near * 0.9);

        const exit = THREE.MathUtils.smoothstep(t, 1.15, Math.PI / 2 + 0.15);
        const u = mesh.material.uniforms;
        u.uStretch.value = 1 + exit * 3.2;
        u.uFringe.value = exit * 1.6;
        u.uHaze.value = exit * 1.1;
        u.uOpacity.value = 1 - THREE.MathUtils.smoothstep(t, 1.45, Math.PI / 2 + 0.2);

        mesh.scale.setScalar(1 + near * 0.12);
      }

      renderer.render(scene, camera);
    }

    apiRef.current = {
      playing: autoPlay,
      speed: 1,
      setPlaying(v) {
        this.playing = v;
      },
      destroy() {
        cancelAnimationFrame(state.raf);
      }
    };
    frame();

    return () => {
      apiRef.current?.destroy();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('wheel', onWheel);
      mount.removeEventListener('keydown', onKey);
      cards.forEach((m) => {
        m.material.uniforms.uMap.value?.dispose();
        m.material.dispose();
      });
      geo.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      renderer.dispose();
      if (el.parentNode === mount) mount.removeChild(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, webgl]);

  useEffect(() => {
    if (apiRef.current) apiRef.current.playing = playing;
  }, [playing]);

  return (
    <div
      className="tunnel-wrap"
      tabIndex={0}
      role="region"
      aria-label="Book gallery — drag, scroll or use arrow keys"
    >
      {!webgl ? (
        <div className="tunnel-fallback">
          {books.map((b) => (
            <button
              key={b.id}
              type="button"
              className="fallback-card"
              onClick={() => b.slug && router.push(`/books/${b.slug}`)}
            >
              <span className="text-2xl">{b.ornament}</span>
              <strong className="font-display text-base">{b.title}</strong>
              <em className="not-italic text-xs text-ink/50">{b.author_name}</em>
            </button>
          ))}
        </div>
      ) : (
        <div ref={mountRef} className="tunnel-canvas" />
      )}

      <div className="tunnel-label tl">Grow</div>
      <div className="tunnel-label tr">Write</div>
      <div className="tunnel-label bl">Publish</div>
      <div className="tunnel-label br">Read</div>

      <button type="button" className="tunnel-play" onClick={togglePlay} aria-label={playing ? 'Pause gallery' : 'Play gallery'}>
        {playing ? '❚❚' : '▶'}
      </button>

      <ul className="sr-only">
        {books.map((b) => (
          <li key={b.id}>{b.title} by {b.author_name}</li>
        ))}
      </ul>
      <div aria-live="polite" className="sr-only">{live}</div>
    </div>
  );
}
