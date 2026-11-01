'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import * as THREE from 'three';

export const YOUNG_AUTHORS_BOOKS = [
  {
    id: 1,
    title: 'Death Before Breakfast',
    author: 'George Bellairs',
    role: 'Young Author Debut',
    category: 'Mystery & Crime',
    badge: 'Bestseller',
    year: '2026',
    pages: 284,
    rating: 4.9,
    description:
      'A gripping, atmospheric mystery unfolding in the misty morning streets of Paris. When dawn breaks over the Seine, an unexpected shadow reveals a decades-old puzzle.',
    image: '/images/animationimages/3.jfif',
    accentColor: '#9f1239',
    spineColor: '#4c0519',
    slug: 'the-imposters-mirror'
  },
  {
    id: 2,
    title: 'The Beauty Within',
    author: 'Samantha Donald',
    role: 'Youth Poetry Fellow',
    category: 'Poetry & Reflection',
    badge: 'Editor’s Choice',
    year: '2026',
    pages: 148,
    rating: 5.0,
    description:
      'A delicate yet fierce anthology of contemporary verse exploring grace, identity, vulnerability, and the courage to blossom from within.',
    image: '/images/animationimages/5.png',
    accentColor: '#1d4ed8',
    spineColor: '#172554',
    slug: 'the-invisible-me'
  },
  {
    id: 3,
    title: 'Of Witches and Cows',
    author: 'L.R. Bakker',
    role: 'Competition Winner',
    category: 'Fantasy Adventure',
    badge: 'Trending',
    year: '2025',
    pages: 310,
    rating: 4.8,
    description:
      'A whimsical and spellbinding highland fantasy where ancient folklore, arcane secrets, and an extraordinary highland guardian collide.',
    image: '/images/animationimages/6.jfif',
    accentColor: '#0284c7',
    spineColor: '#082f49',
    slug: 'the-paper-kingdom'
  },
  {
    id: 4,
    title: 'The Raven King',
    author: 'Maggie Stiefvater',
    role: 'Mentorship Spotlight',
    category: 'YA Fantasy',
    badge: 'Featured',
    year: '2026',
    pages: 368,
    rating: 5.0,
    description:
      'The breathtaking culmination of destiny, slumbering kings, and fiercely loyal young friends seeking ancient magic just beneath the surface of the ordinary.',
    image: '/images/animationimages/7.jfif',
    accentColor: '#4f46e5',
    spineColor: '#1e1b4b',
    slug: 'after-the-long-night'
  },
  {
    id: 5,
    title: 'Who Am I?',
    author: 'Michelle Rice-Gauvreau',
    role: 'Memoir Fellow',
    category: 'Memoir & True Story',
    badge: 'Award Winner',
    year: '2025',
    pages: 232,
    rating: 4.9,
    description:
      'A moving and resilient true story of tracing ancestral roots, overcoming adversity, and discovering healing and identity through the written word.',
    image: '/images/animationimages/9.jpg',
    accentColor: '#d97706',
    spineColor: '#451a03',
    slug: 'the-fracture-of-time'
  },
  {
    id: 6,
    title: 'Create Your Own Business',
    author: 'James Murdor',
    role: 'Young Entrepreneur',
    category: 'Leadership & Guide',
    badge: 'Must Read',
    year: '2026',
    pages: 196,
    rating: 4.9,
    description:
      'A clear, inspiring, and actionable blueprint empowering ambitious youth to turn visionary ideas into sustainable, thriving creative enterprises.',
    image: '/images/animationimages/10.jpg',
    accentColor: '#334155',
    spineColor: '#0f172a',
    slug: 'seeds-of-the-untold'
  }
];

function shadeColor(color, percent) {
  try {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  } catch {
    return color;
  }
}

function makeSpineTexture(title, author, colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const base = colorHex || '#1e293b';
  const grad = ctx.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, shadeColor(base, -35));
  grad.addColorStop(0.18, base);
  grad.addColorStop(0.5, shadeColor(base, 15));
  grad.addColorStop(0.82, base);
  grad.addColorStop(1, shadeColor(base, -40));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 1024);

  // Decorative debossed lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 3;
  [70, 78, 930, 938].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(112, y);
    ctx.stroke();
  });

  ctx.save();
  ctx.translate(64, 512);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Times New Roman", Georgia, serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 6;
  const displayTitle = title.length > 26 ? title.slice(0, 24) + '…' : title;
  ctx.fillText(displayTitle.toUpperCase(), 0, -8);

  ctx.font = '500 22px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.shadowBlur = 0;
  ctx.fillText(author, 0, 28);
  ctx.restore();

  // Emblem
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.fillText('❀', 64, 980);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBackTexture(book) {
  const canvas = document.createElement('canvas');
  canvas.width = 680;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const base = book.spineColor || '#0f172a';
  const grad = ctx.createLinearGradient(0, 0, 680, 1024);
  grad.addColorStop(0, base);
  grad.addColorStop(1, shadeColor(base, -25));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 680, 1024);

  // Border inlay
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, 608, 952);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.strokeRect(44, 44, 592, 936);

  // Content
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '34px serif';
  ctx.fillText('◈', 340, 160);

  ctx.font = 'italic 24px "Times New Roman", Georgia, serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';

  // Manual wrap
  const words = `"${book.description}"`.split(' ');
  let line = '';
  let y = 250;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 480 && n > 0) {
      ctx.fillText(line.trim(), 340, y);
      line = words[n] + ' ';
      y += 38;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), 340, y);

  ctx.font = '500 20px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillText(`— ${book.author}`, 340, y + 60);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '15px monospace';
  ctx.fillText('LITERACY GARDENERS PRESS', 340, 840);
  ctx.fillText('YOUNG AUTHORS INITIATIVE • 2026', 340, 868);

  // Mock Barcode
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(240, 905, 200, 48);
  ctx.fillStyle = '#000000';
  for (let x = 248; x < 432; x += 3 + (x % 4)) {
    ctx.fillRect(x, 911, x % 2 === 0 ? 2 : 1, 36);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePagesTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f8f4ec';
  ctx.fillRect(0, 0, 128, 512);

  for (let y = 0; y < 512; y += 2) {
    const shade = y % 6 === 0 ? 'rgba(120, 100, 75, 0.16)' : 'rgba(160, 140, 110, 0.08)';
    ctx.fillStyle = shade;
    ctx.fillRect(0, y, 128, 1);
  }

  const grad = ctx.createLinearGradient(0, 0, 40, 0);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 40, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
  grad.addColorStop(0.35, 'rgba(15, 23, 42, 0.22)');
  grad.addColorStop(0.7, 'rgba(15, 23, 42, 0.06)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function checkWebGL() {
  if (typeof window === 'undefined') return true;
  try {
    const testCanvas = document.createElement('canvas');
    return !!(testCanvas.getContext('webgl2') || testCanvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function BookShowcase3D({
  books = YOUNG_AUTHORS_BOOKS,
  height = 560,
  className = ''
}) {
  const mountRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inspectMode, setInspectMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasWebGL, setHasWebGL] = useState(checkWebGL);
  const [isLoaded, setIsLoaded] = useState(false);

  const activeBook = books[activeIndex] || books[0];
  const controlsRef = useRef(null);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !hasWebGL) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Dimensions
    let W = mount.clientWidth || 800;
    let H = mount.clientHeight || height;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.set(0, 0.5, 9.8);
    camera.lookAt(0, -0.1, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      requestAnimationFrame(() => setHasWebGL(false));
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'pan-y';
    canvas.setAttribute('aria-label', '3D Book Carousel - drag to spin or click book to inspect');
    mount.appendChild(canvas);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    keyLight.position.set(5.5, 8.0, 7.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.6);
    fillLight.position.set(-6.0, 3.5, -3.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffedd5, 0.45);
    rimLight.position.set(0, 5.0, -7.0);
    scene.add(rimLight);

    // Common Textures
    const pagesTex = makePagesTexture();
    const shadowTex = makeShadowTexture();

    // Floor Pedestal Disc
    const floorGeo = new THREE.RingGeometry(1.5, 5.4, 64);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.035,
      side: THREE.DoubleSide
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.72;
    scene.add(floorMesh);

    // Book Geometries
    const BOOK_W = 2.15;
    const BOOK_H = 3.2;
    const BOOK_T = 0.35;
    const COVER_T = 0.04;
    const INSET = 0.08;

    const coverGeo = new THREE.BoxGeometry(BOOK_W, BOOK_H, COVER_T);
    const pagesGeo = new THREE.BoxGeometry(BOOK_W - INSET, BOOK_H - INSET * 2, BOOK_T - COVER_T * 2);
    const spineGeo = new THREE.CylinderGeometry(BOOK_T / 2, BOOK_T / 2, BOOK_H, 24, 1, false, Math.PI / 2, Math.PI);
    const shadowGeo = new THREE.PlaneGeometry(BOOK_W * 1.35, BOOK_T * 3.2);

    const textureLoader = new THREE.TextureLoader();
    const allDisposables = [pagesTex, shadowTex, floorGeo, floorMat, coverGeo, pagesGeo, spineGeo, shadowGeo];

    const N = books.length;
    const bookMeshes = [];
    const booksGroup = new THREE.Group();
    scene.add(booksGroup);

    books.forEach((book, i) => {
      const bookGroup = new THREE.Group();
      bookGroup.userData = { index: i, book };

      // Spine & Back textures
      const spineTex = makeSpineTexture(book.title, book.author, book.spineColor);
      const backTex = makeBackTexture(book);
      allDisposables.push(spineTex, backTex);

      // Default edge material
      const edgeMat = new THREE.MeshStandardMaterial({
        color: shadeColor(book.spineColor || '#1e293b', -30),
        roughness: 0.5,
        metalness: 0.05
      });
      allDisposables.push(edgeMat);

      // Front Cover
      const frontTex = textureLoader.load(
        book.image,
        () => {
          frontTex.colorSpace = THREE.SRGBColorSpace;
          frontTex.anisotropy = 16;
          frontTex.needsUpdate = true;
        },
        undefined,
        () => {
          // Fallback if image fails to load
        }
      );
      allDisposables.push(frontTex);

      const frontMat = new THREE.MeshStandardMaterial({
        map: frontTex,
        roughness: 0.38,
        metalness: 0.06
      });
      allDisposables.push(frontMat);

      const frontBoxMats = [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, edgeMat];
      const frontMesh = new THREE.Mesh(coverGeo, frontBoxMats);
      frontMesh.position.z = BOOK_T / 2 - COVER_T / 2;
      bookGroup.add(frontMesh);

      // Pages Block
      const pagesMat = new THREE.MeshStandardMaterial({
        map: pagesTex,
        roughness: 0.88,
        metalness: 0.0
      });
      allDisposables.push(pagesMat);

      const pagesMesh = new THREE.Mesh(pagesGeo, pagesMat);
      pagesMesh.position.set(-INSET / 2, 0, 0);
      bookGroup.add(pagesMesh);

      // Back Cover
      const backMat = new THREE.MeshStandardMaterial({
        map: backTex,
        roughness: 0.45,
        metalness: 0.05
      });
      allDisposables.push(backMat);

      const backBoxMats = [edgeMat, edgeMat, edgeMat, edgeMat, edgeMat, backMat];
      const backMesh = new THREE.Mesh(coverGeo, backBoxMats);
      backMesh.position.z = -BOOK_T / 2 + COVER_T / 2;
      bookGroup.add(backMesh);

      // Spine Cylinder
      const spineMat = new THREE.MeshStandardMaterial({
        map: spineTex,
        roughness: 0.45,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
      allDisposables.push(spineMat);

      const spineMesh = new THREE.Mesh(spineGeo, spineMat);
      spineMesh.position.set(-BOOK_W / 2, 0, 0);
      bookGroup.add(spineMesh);

      // Contact Shadow
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.38
      });
      allDisposables.push(shadowMat);

      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -BOOK_H / 2 - 0.08;
      bookGroup.add(shadowMesh);

      bookMeshes.push({
        group: bookGroup,
        shadow: shadowMesh,
        index: i,
        baseAngle: (i * (Math.PI * 2)) / N
      });

      booksGroup.add(bookGroup);
    });

    requestAnimationFrame(() => {
      setIsLoaded(true);
    });

    // Animation & Interaction state
    const state = {
      angle: 0,
      targetAngle: 0,
      vel: 0,
      dragging: false,
      lastX: 0,
      lastY: 0,
      moved: 0,
      hovered: false,
      playing: true,
      inspecting: false,
      inspectRotX: 0,
      inspectRotY: 0.25,
      inspectVelX: 0,
      inspectVelY: 0,
      mouseNormX: 0,
      mouseNormY: 0,
      radiusX: 4.6,
      radiusZ: 2.3,
      raf: 0
    };

    function updateResponsiveRadius() {
      W = mount.clientWidth || 800;
      H = mount.clientHeight || height;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;

      if (W < 640) {
        state.radiusX = 3.2;
        state.radiusZ = 1.6;
        camera.position.set(0, 0.4, 11.2);
        camera.fov = 44;
      } else if (W < 1024) {
        state.radiusX = 4.1;
        state.radiusZ = 2.0;
        camera.position.set(0, 0.45, 10.4);
        camera.fov = 40;
      } else {
        state.radiusX = 4.7;
        state.radiusZ = 2.4;
        camera.position.set(0, 0.5, 9.8);
        camera.fov = 38;
      }
      camera.updateProjectionMatrix();
    }
    updateResponsiveRadius();
    const ro = new ResizeObserver(updateResponsiveRadius);
    ro.observe(mount);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onPointerDown(e) {
      state.dragging = true;
      state.moved = 0;
      state.vel = 0;
      state.inspectVelX = 0;
      state.inspectVelY = 0;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
      canvas.setPointerCapture?.(e.pointerId);
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      state.mouseNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      state.mouseNormY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (!state.dragging) return;
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      state.moved += Math.abs(dx) + Math.abs(dy);

      if (state.inspecting) {
        state.inspectRotY += dx * 0.01;
        state.inspectRotX = Math.max(-0.6, Math.min(0.6, state.inspectRotX + dy * 0.008));
        state.inspectVelY = dx * 0.008;
        state.inspectVelX = dy * 0.006;
      } else {
        const dAngle = (dx / (W * 0.45)) * 1.5;
        state.angle += dAngle;
        state.targetAngle += dAngle;
        state.vel = dAngle * 0.6;
      }
    }

    function onPointerUp(e) {
      if (!state.dragging) return;
      state.dragging = false;
      canvas.style.cursor = 'grab';
      canvas.releasePointerCapture?.(e.pointerId);

      // Check click
      if (state.moved < 8) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        raycaster.setFromCamera(pointer, camera);

        const allMeshes = [];
        bookMeshes.forEach((bm) => {
          bm.group.traverse((obj) => {
            if (obj.isMesh && obj.geometry !== shadowGeo && obj.geometry !== floorGeo) {
              allMeshes.push(obj);
            }
          });
        });

        const hits = raycaster.intersectObjects(allMeshes, false);
        if (hits.length > 0) {
          let p = hits[0].object;
          while (p && !p.userData?.book && p.parent) {
            p = p.parent;
          }
          if (p?.userData?.index !== undefined) {
            const clickedIdx = p.userData.index;
            if (clickedIdx === activeIndexRef.current && !state.inspecting) {
              state.inspecting = true;
              state.inspectRotX = 0;
              state.inspectRotY = 0.25;
              state.inspectVelX = 0;
              state.inspectVelY = 0;
              setInspectMode(true);
            } else {
              goToIndex(clickedIdx);
            }
          }
        }
      }
    }

    function onWheel(e) {
      if (state.inspecting) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      e.preventDefault();
      state.targetAngle += (delta > 0 ? -1 : 1) * 0.28;
    }

    function onPointerEnter() {
      state.hovered = true;
    }
    function onPointerLeave() {
      state.hovered = false;
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointerleave', onPointerLeave);

    activeIndexRef.current = 0;

    function goToIndex(idx) {
      const step = (Math.PI * 2) / N;
      // Target angle such that angle + idx * step = 0 (modulo 2pi)
      let currentModulo = state.angle % (Math.PI * 2);
      if (currentModulo < 0) currentModulo += Math.PI * 2;
      const targetModulo = (Math.PI * 2 - (idx * step) % (Math.PI * 2)) % (Math.PI * 2);

      let diff = targetModulo - currentModulo;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;

      state.targetAngle = state.angle + diff;
      state.vel = 0;
      activeIndexRef.current = idx;
      setActiveIndex(idx);

      if (state.inspecting) {
        state.inspectRotX = 0;
        state.inspectRotY = 0.25;
        state.inspectVelX = 0;
        state.inspectVelY = 0;
      }
    }

    // Expose controls to React
    controlsRef.current = {
      next: () => {
        goToIndex((activeIndexRef.current + 1) % N);
      },
      prev: () => {
        goToIndex((activeIndexRef.current - 1 + N) % N);
      },
      goTo: (idx) => {
        goToIndex(idx);
      },
      setPlaying: (v) => {
        state.playing = v;
      },
      setInspecting: (v) => {
        state.inspecting = v;
        if (v) {
          state.inspectRotX = 0;
          state.inspectRotY = 0.25;
          state.inspectVelX = 0;
          state.inspectVelY = 0;
        }
      }
    };

    let clock = performance.now();
    let lastSnapCheck = clock;

    function renderLoop() {
      state.raf = requestAnimationFrame(renderLoop);
      const now = performance.now();
      const dt = Math.min((now - clock) / 1000, 0.05);
      clock = now;

      // Auto-rotation
      if (
        !reducedMotion &&
        !state.dragging &&
        !state.hovered &&
        !state.inspecting &&
        state.playing &&
        Math.abs(state.vel) < 0.005
      ) {
        state.targetAngle += 0.12 * dt;
      }

      // Physics damping
      if (!state.dragging) {
        state.angle += (state.targetAngle - state.angle) * Math.min(1, 4.5 * dt);
        if (Math.abs(state.vel) > 0.0001) {
          state.angle += state.vel;
          state.targetAngle += state.vel;
          state.vel *= Math.exp(-3.5 * dt);
        }
      }

      // Smooth camera tilt with mouse
      if (!state.inspecting) {
        const targetCamX = state.mouseNormX * 0.45;
        const targetCamY = 0.5 + state.mouseNormY * 0.25;
        camera.position.x += (targetCamX - camera.position.x) * 0.06;
        camera.position.y += (targetCamY - camera.position.y) * 0.06;
        camera.lookAt(0, -0.1, 0);
      }

      const step = (Math.PI * 2) / N;
      let closestIdx = 0;
      let maxCos = -2;

      bookMeshes.forEach((bm) => {
        const theta = state.angle + bm.baseAngle;
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);

        if (cos > maxCos) {
          maxCos = cos;
          closestIdx = bm.index;
        }

        const frontness = (cos + 1) / 2; // 0 (back) to 1 (front)

        if (state.inspecting) {
          if (bm.index === activeIndexRef.current) {
            // Inspect hero transition
            bm.group.position.x += (0 - bm.group.position.x) * 0.12;
            bm.group.position.y += (0.1 - bm.group.position.y) * 0.12;
            bm.group.position.z += (3.2 - bm.group.position.z) * 0.12;
            bm.group.scale.setScalar(1.22);
            bm.group.rotation.x = state.inspectRotX;
            bm.group.rotation.y = state.inspectRotY;
            bm.shadow.material.opacity = 0.42;

            if (!state.dragging) {
              state.inspectRotY += state.inspectVelY;
              state.inspectRotX += state.inspectVelX;
              state.inspectVelX *= 0.92;
              state.inspectVelY *= 0.92;
            }
          } else {
            // Push side books back smoothly into an aesthetic gallery arc
            const targetX = state.radiusX * sin * 1.1;
            const targetY = -0.4;
            const targetZ = -4.5 + cos * 1.2;
            bm.group.position.x += (targetX - bm.group.position.x) * 0.12;
            bm.group.position.y += (targetY - bm.group.position.y) * 0.12;
            bm.group.position.z += (targetZ - bm.group.position.z) * 0.12;
            bm.group.scale.setScalar(0.68);
            const targetRotY = -Math.atan2(targetX * 0.28, 8);
            bm.group.rotation.y += (targetRotY - bm.group.rotation.y) * 0.12;
            bm.group.rotation.x += (-0.05 - bm.group.rotation.x) * 0.12;
            bm.shadow.material.opacity = 0.08;
          }
        } else {
          // Carousel Orbit Mode
          const x = state.radiusX * sin;
          const z = state.radiusZ * cos;
          const floatY = Math.sin(now * 0.0018 + bm.index * 1.05) * 0.07;
          const elevation = (frontness - 0.5) * 0.22;

          bm.group.position.x += (x - bm.group.position.x) * 0.18;
          bm.group.position.y += (floatY + elevation - bm.group.position.y) * 0.18;
          bm.group.position.z += (z - bm.group.position.z) * 0.18;

          // Natural rotation facing front & subtly curved to center
          const targetRotY = -Math.atan2(x * 0.28, z + 4.5);
          const targetRotX = -0.04 - (1 - frontness) * 0.06;

          bm.group.rotation.y += (targetRotY - bm.group.rotation.y) * 0.15;
          bm.group.rotation.x += (targetRotX - bm.group.rotation.x) * 0.15;

          const scale = 0.8 + 0.3 * frontness;
          bm.group.scale.set(scale, scale, scale);

          bm.shadow.material.opacity = 0.12 + 0.3 * frontness;
        }
      });

      // Update active index in React
      if (closestIdx !== activeIndexRef.current && !state.inspecting) {
        activeIndexRef.current = closestIdx;
        setActiveIndex(closestIdx);
      }

      renderer.render(scene, camera);
    }
    state.raf = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(state.raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointerleave', onPointerLeave);

      allDisposables.forEach((d) => {
        try {
          d.dispose();
        } catch {
          // ignore
        }
      });
      renderer.dispose();
      if (canvas.parentNode === mount) {
        mount.removeChild(canvas);
      }
      setIsLoaded(false);
      controlsRef.current = null;
    };
  }, [books, height, hasWebGL]);

  const toggleInspect = useCallback(() => {
    setInspectMode((prev) => {
      const next = !prev;
      controlsRef.current?.setInspecting(next);
      return next;
    });
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      controlsRef.current?.setPlaying(next);
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.next();
    } else {
      setActiveIndex((prev) => (prev + 1) % books.length);
    }
  }, [books.length]);

  const handlePrev = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.prev();
    } else {
      setActiveIndex((prev) => (prev - 1 + books.length) % books.length);
    }
  }, [books.length]);

  const handleSelectBook = useCallback((idx) => {
    if (controlsRef.current) {
      controlsRef.current.goTo(idx);
    } else {
      setActiveIndex(idx);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape' && inspectMode) {
        e.preventDefault();
        toggleInspect();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNext, handlePrev, inspectMode, toggleInspect]);

  return (
    <div className={`relative w-full select-none ${className}`}>
      {/* 3D EXHIBITION STAGE */}
      <div
        className="relative w-full rounded-2xl border border-border/80 bg-gradient-to-b from-[#fbfbfa] via-[#f7f6f2] to-[#fbfbfa] overflow-hidden shadow-inner"
        style={{ height: `${height}px` }}
      >
        {/* Subtle Decorative Stage Ring */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[520px] h-[520px] rounded-full border border-ink/[0.04] opacity-80" />
          <div className="absolute w-[360px] h-[360px] rounded-full border border-ink/[0.03] opacity-60" />
          <div className="absolute bottom-10 w-[70%] h-[120px] bg-gradient-to-t from-primary/[0.025] to-transparent blur-2xl rounded-full" />
        </div>

        {/* 3D WebGL Canvas Mount */}
        {hasWebGL ? (
          <>
            <div ref={mountRef} className="absolute inset-0 w-full h-full" />
            {!isLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#fbfbfa] to-[#f7f6f2] pointer-events-none z-10 transition-opacity duration-300">
                <div className="w-7 h-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <span className="font-mono text-[11px] tracking-wider uppercase text-ink/40">
                  Loading 3D Gallery...
                </span>
              </div>
            )}
          </>
        ) : (
          /* High-Fidelity CSS 3D Fallback */
          <div className="absolute inset-0 flex items-center justify-center gap-6 overflow-x-auto px-8">
            {books.map((b, i) => (
              <div
                key={b.id}
                onClick={() => handleSelectBook(i)}
                className={`flex-shrink-0 cursor-pointer transition-all duration-300 ${
                  i === activeIndex ? 'scale-105 shadow-2xl border-primary' : 'scale-90 opacity-70'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.image}
                  alt={b.title}
                  className="w-48 h-72 object-cover rounded-md shadow-lg border border-border"
                />
              </div>
            ))}
          </div>
        )}

        {/* TOP CONTROLS */}
        <div className="absolute top-4 right-5 flex items-center gap-2 pointer-events-none z-10">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={toggleInspect}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shadow-sm ${
                inspectMode
                  ? 'bg-primary text-white border-primary shadow-primary/20'
                  : 'bg-surface/85 backdrop-blur-md border-border text-ink hover:border-primary/50'
              }`}
              title={inspectMode ? 'Return to carousel orbit' : 'Inspect active book in 360°'}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>{inspectMode ? 'Exit 360° View' : '360° Inspect'}</span>
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="w-8 h-8 rounded-full bg-surface/85 backdrop-blur-md border border-border flex items-center justify-center text-ink/70 hover:text-ink hover:border-primary/50 text-xs shadow-sm transition-all"
              aria-label={isPlaying ? 'Pause rotation' : 'Play rotation'}
              title={isPlaying ? 'Pause auto-rotation' : 'Play auto-rotation'}
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>
          </div>
        </div>

        {/* PREV / NEXT FLOATING BUTTONS */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous Book"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-surface/80 hover:bg-surface border border-border/80 hover:border-primary hover:text-primary text-ink/80 flex items-center justify-center backdrop-blur-md shadow-md hover:shadow-lg transition-all duration-200"
        >
          <svg className="w-5 h-5 -translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next Book"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-surface/80 hover:bg-surface border border-border/80 hover:border-primary hover:text-primary text-ink/80 flex items-center justify-center backdrop-blur-md shadow-md hover:shadow-lg transition-all duration-200"
        >
          <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>


      </div>

      {/* ACTIVE BOOK SPOTLIGHT CARD */}
      <div className="mt-8 rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-sm transition-all duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider font-semibold bg-primary/10 text-primary border border-primary/20">
                {activeBook.category}
              </span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider text-ink/60 bg-muted border border-border">
                {activeBook.badge}
              </span>
              <span className="text-xs text-amber-500 font-semibold flex items-center gap-1">
                <span>★</span>
                <span>{activeBook.rating}</span>
                <span className="text-ink/40 font-normal">({activeBook.year})</span>
              </span>
            </div>

            <h3 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-ink">
              {activeBook.title}
            </h3>

            <p className="mt-1 text-sm md:text-base font-medium text-primary">
              by {activeBook.author}
              <span className="text-ink/40 font-normal ml-2">· {activeBook.role}</span>
            </p>

            <p className="mt-3 text-sm md:text-base leading-relaxed text-ink/70">
              {activeBook.description}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 lg:self-center">
            <button
              type="button"
              onClick={toggleInspect}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all ${
                inspectMode
                  ? 'bg-ink text-white hover:bg-primary'
                  : 'bg-muted hover:bg-secondary/40 text-ink border border-border'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>{inspectMode ? 'Carousel Mode' : 'Inspect 3D'}</span>
            </button>

            <Link
              href={`/books/${activeBook.slug}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-ink text-white text-sm font-medium transition-colors shadow-sm"
            >
              <span>Explore Book</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* 6-BOOK THUMBNAIL SELECTOR STRIP */}
        <div className="mt-6 pt-6 border-t border-border/80">
          <p className="font-mono text-[10px] tracking-wider uppercase text-ink/45 mb-3">
            Select young author title:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {books.map((b, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBook(idx)}
                  className={`group flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-sm'
                      : 'border-border bg-surface hover:bg-muted/60 hover:border-ink/20'
                  }`}
                >
                  <div className="w-9 h-13 flex-shrink-0 rounded overflow-hidden shadow-sm border border-border/70 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.image}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-primary' : 'text-ink group-hover:text-primary transition-colors'
                      }`}
                    >
                      {b.title}
                    </p>
                    <p className="text-[11px] text-ink/50 truncate">
                      {b.author}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
