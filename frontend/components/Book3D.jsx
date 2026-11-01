'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { makeCoverCanvas, coverDataURL } from '@/lib/covers';

const DEFAULT_FRONT = '/images/front.jpg';
const DEFAULT_BACK = '/images/back.jpg';
const DEFAULT_SPINE = '/images/spine2.jpg';

const W = 2.2;
const H = 3.0;

const MAX_CONTEXTS = 8;
const activeContexts = new Set();
const slotWaiters = new Set();

function acquireSlot() {
  if (activeContexts.size >= MAX_CONTEXTS) return null;
  const token = {};
  activeContexts.add(token);
  return token;
}

function releaseSlot(token) {
  if (!token) return;
  activeContexts.delete(token);
  slotWaiters.forEach((fn) => {
    try { fn(); } catch { /* noop */ }
  });
}

function onSlotFree(fn) {
  slotWaiters.add(fn);
  return () => slotWaiters.delete(fn);
}

const DEFAULT_BOOK = {
  title: 'Literacy Gardeners',
  author_name: 'Youth Press',
  cover_class: 'c1',
  ornament: '❀'
};

const SPECS = {
  hardcover: { coverT: 0.09, pagesT: 0.52, inset: 0.14 },
  paperback: { coverT: 0.028, pagesT: 0.36, inset: 0.1 },
  spiral: { coverT: 0.035, pagesT: 0.4, inset: 0.1 }
};

export function templateForBook(book) {
  if (book?.category === 'Anthology') return 'spiral';
  if (book?.category === 'Poetry') return 'paperback';
  return 'hardcover';
}

function makeSpineCanvas(book) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(makeCoverCanvas({ ...book, ornament: '' }, 128), 0, 0, 128, 512);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, 128, 512);
  ctx.save();
  ctx.translate(64, 256);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(book.title || '').slice(0, 28), 0, 0);
  ctx.restore();
  return canvas;
}

function makeBackCanvas(book) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(makeCoverCanvas({ ...book, title: '', author_name: '', ornament: '' }, 512), 0, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '500 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Published with Literacy Gardeners', 256, 256);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.strokeRect(16, 16, 480, 480);
  return canvas;
}

function makePagesTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3eee1';
  ctx.fillRect(0, 0, 64, 256);
  for (let x = 0; x < 64; x += 2) {
    ctx.fillStyle = x % 4 === 0 ? 'rgba(120,105,80,0.18)' : 'rgba(160,145,115,0.1)';
    ctx.fillRect(x, 0, 1, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function canvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function disposeObject(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
}

function buildBook(template, book, pagesTex) {
  const spec = SPECS[template] || SPECS.hardcover;
  const { coverT, pagesT, inset } = spec;
  const total = pagesT + coverT * 2;
  const group = new THREE.Group();

  const frontTex = canvasTexture(makeCoverCanvas(book, 640));
  const backTex = canvasTexture(makeBackCanvas(book));
  const spineTex = canvasTexture(makeSpineCanvas(book));

  const edgeMat = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.55, metalness: 0.05 });
  const frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.5, metalness: 0.05 });
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.5, metalness: 0.05 });
  const spineMat = new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide });
  const pagesMat = new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 0.92, metalness: 0 });

  const pages = new THREE.Mesh(new THREE.BoxGeometry(W - inset, H - inset * 1.2, pagesT), pagesMat);
  pages.castShadow = true;
  pages.receiveShadow = true;
  group.add(pages);

  const coverGeo = new THREE.BoxGeometry(W, H, coverT);
  const frontMats = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, edgeMat];
  const backMats = [edgeMat, edgeMat, edgeMat, edgeMat, edgeMat, backMat];

  if (template === 'spiral') {
    const front = new THREE.Mesh(coverGeo, frontMats);
    front.position.z = pagesT / 2 + coverT / 2;
    front.castShadow = true;
    const back = new THREE.Mesh(coverGeo.clone(), backMats);
    back.position.z = -(pagesT / 2 + coverT / 2);
    back.castShadow = true;
    group.add(front, back);

    const ringMat = new THREE.MeshStandardMaterial({ color: '#b9bdc3', metalness: 0.95, roughness: 0.22 });
    const ringGeo = new THREE.TorusGeometry(total / 2 + 0.055, 0.024, 10, 36);
    const ringCount = 13;
    const top = H / 2 - 0.22;
    const bottom = -H / 2 + 0.22;
    for (let i = 0; i < ringCount; i++) {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(-W / 2 + 0.14, top - ((top - bottom) * i) / (ringCount - 1), 0);
      ring.castShadow = true;
      group.add(ring);
    }
    return group;
  }

  const frontPivot = new THREE.Group();
  frontPivot.position.set(-W / 2, 0, pagesT / 2 + coverT / 2);
  const front = new THREE.Mesh(coverGeo, frontMats);
  front.position.x = W / 2;
  front.castShadow = true;
  frontPivot.add(front);

  const backPivot = new THREE.Group();
  backPivot.position.set(-W / 2, 0, -(pagesT / 2 + coverT / 2));
  const back = new THREE.Mesh(coverGeo.clone(), backMats);
  back.position.x = W / 2;
  back.castShadow = true;
  backPivot.add(back);

  if (template === 'paperback') {
    frontPivot.rotation.y = -0.09;
    backPivot.rotation.y = 0.045;
  }

  group.add(frontPivot, backPivot);

  const r = total / 2;
  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, H, 36, 1, true, Math.PI, Math.PI),
    spineMat
  );
  spine.position.x = -W / 2;
  spine.castShadow = true;
  group.add(spine);

  const capMat = new THREE.MeshStandardMaterial({ color: '#e9e3d5', roughness: 0.9, side: THREE.DoubleSide });
  const topCap = new THREE.Mesh(new THREE.CircleGeometry(r, 24, Math.PI, Math.PI), capMat);
  topCap.rotation.x = -Math.PI / 2;
  topCap.rotation.z = Math.PI;
  topCap.position.set(-W / 2, H / 2, 0);
  const bottomCap = new THREE.Mesh(topCap.geometry, capMat);
  bottomCap.rotation.x = Math.PI / 2;
  bottomCap.position.set(-W / 2, -H / 2, 0);
  group.add(topCap, bottomCap);

  return group;
}

export default function Book3D({
  template = 'hardcover',
  frontImage,
  backImage,
  spineImage,
  book,
  height = 440,
  autoRotate = true,
  interactive = true,
  className = ''
}) {
  const mountRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const bookData = useMemo(() => ({ ...DEFAULT_BOOK, ...(book || {}) }), [book]);
  const resolvedFront = frontImage || book?.image || book?.cover_image || null;
  const resolvedBack = backImage || book?.back_image || null;
  const resolvedSpine = spineImage || book?.spine_image || null;
  const fallbackSrc = useMemo(() => {
    try { return coverDataURL(bookData); } catch { return ''; }
  }, [bookData]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '260px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let slot = null;
    let detachWaiter = null;
    let cleanupScene = null;

    const start = () => {
      if (disposed || slot || cleanupScene) return;
      slot = acquireSlot();
      if (!slot) {
        detachWaiter = onSlotFree(start);
        return;
      }
      try {
        cleanupScene = createScene();
      } catch {
        releaseSlot(slot);
        slot = null;
        setFailed(true);
      }
    };

    function createScene() {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
      camera.position.set(0, 0.3, 7.4);
      camera.lookAt(0, 0, 0);

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        throw new Error('webgl');
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, interactive ? 2 : 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.touchAction = 'none';
      renderer.domElement.style.cursor = interactive ? 'grab' : 'default';
      if (!interactive) renderer.domElement.style.pointerEvents = 'none';
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.85));
      const key = new THREE.DirectionalLight(0xffffff, 1.35);
      key.position.set(3.2, 4.5, 4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -4;
      key.shadow.camera.right = 4;
      key.shadow.camera.top = 4;
      key.shadow.camera.bottom = -4;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xc5d3e8, 0.45);
      fill.position.set(-4, 1.5, -2.5);
      scene.add(fill);

      const pagesTex = makePagesTexture();
      const bookGroup = buildBook(template, bookData, pagesTex);
      bookGroup.rotation.y = 0.55;
      bookGroup.rotation.x = -0.06;
      scene.add(bookGroup);

      const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.16 }));
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -H / 2 - 0.05;
      shadowPlane.receiveShadow = true;
      scene.add(shadowPlane);

      const loader = new THREE.TextureLoader();
      const extraTextures = [];
      let dirty = true;

      const frontMats = [];
      const backMats = [];
      const spineMats = [];
      bookGroup.traverse((obj) => {
        if (!obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m.map === pagesTex) return;
          if (m.side === THREE.DoubleSide && obj.geometry?.type === 'CylinderGeometry') spineMats.push(m);
          else if (m.map && m.map.image?.width === 640) frontMats.push(m);
          else if (m.map && m.map.image?.width === 512 && m.map.image?.height === 512) backMats.push(m);
        });
      });

      function applyImage(url, mats) {
        if (!url || !mats.length) return;
        loader.load(
          url,
          (tex) => {
            if (disposed) {
              tex.dispose();
              return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            extraTextures.push(tex);
            mats.forEach((m) => {
              if (m.map) m.map.dispose();
              m.map = tex;
              m.needsUpdate = true;
            });
            dirty = true;
          },
          undefined,
          () => {}
        );
      }
      if (resolvedFront) applyImage(resolvedFront, frontMats);
      if (resolvedBack) applyImage(resolvedBack, backMats);
      if (resolvedSpine) applyImage(resolvedSpine, spineMats);

      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let targetY = bookGroup.rotation.y;
      let targetX = bookGroup.rotation.x;
      let idleUntil = 0;

      function onDown(e) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        renderer.domElement.style.cursor = 'grabbing';
        renderer.domElement.setPointerCapture?.(e.pointerId);
      }
      function onMove(e) {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        targetY += dx * 0.008;
        targetX = Math.max(-0.7, Math.min(0.7, targetX + dy * 0.005));
        idleUntil = performance.now() + 2200;
        dirty = true;
      }
      function onUp(e) {
        if (!dragging) return;
        dragging = false;
        renderer.domElement.style.cursor = 'grab';
        renderer.domElement.releasePointerCapture?.(e.pointerId);
      }
      if (interactive) {
        renderer.domElement.addEventListener('pointerdown', onDown);
        renderer.domElement.addEventListener('pointermove', onMove);
        renderer.domElement.addEventListener('pointerup', onUp);
        renderer.domElement.addEventListener('pointercancel', onUp);
      }

      function resize() {
        const w = mount.clientWidth || 1;
        const h = mount.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        dirty = true;
      }
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(mount);

      let raf = 0;
      function tick() {
        raf = requestAnimationFrame(tick);
        if (autoRotate && !reduced && !dragging && performance.now() > idleUntil) {
          targetY += 0.0035;
          dirty = true;
        }
        if (!dirty) return;
        bookGroup.rotation.y += (targetY - bookGroup.rotation.y) * 0.12;
        bookGroup.rotation.x += (targetX - bookGroup.rotation.x) * 0.12;
        renderer.render(scene, camera);
        if (Math.abs(targetY - bookGroup.rotation.y) < 0.0005 && Math.abs(targetX - bookGroup.rotation.x) < 0.0005) {
          dirty = false;
        }
      }
      raf = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        if (interactive) {
          renderer.domElement.removeEventListener('pointerdown', onDown);
          renderer.domElement.removeEventListener('pointermove', onMove);
          renderer.domElement.removeEventListener('pointerup', onUp);
          renderer.domElement.removeEventListener('pointercancel', onUp);
        }
        disposeObject(scene);
        pagesTex.dispose();
        extraTextures.forEach((t) => t.dispose());
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    }

    start();

    return () => {
      disposed = true;
      if (detachWaiter) detachWaiter();
      if (cleanupScene) cleanupScene();
      if (slot) {
        releaseSlot(slot);
        slot = null;
      }
    };
  }, [visible, template, resolvedFront, resolvedBack, resolvedSpine, bookData, autoRotate, interactive]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
      role="img"
      aria-label={`3D ${template} model of ${bookData.title}`}
    >
      {failed && fallbackSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fallbackSrc} alt={`Cover of ${bookData.title}`} className="w-full h-full object-cover" />
      ) : null}
    </div>
  );
}
