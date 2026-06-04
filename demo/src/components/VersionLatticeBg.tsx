import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  isMajor: boolean;
  pulseOffset: number;
}

export default function VersionLatticeBg() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 180 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic resizing
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Pool of trending/popular GitHub repositories across Web, AI, Mobile, and Systems
    const trendingRepos = [
      'facebook/react',
      'vercel/next.js',
      'vuejs/core',
      'tailwindlabs/tailwindcss',
      'microsoft/vscode',
      'ollama/ollama',
      'vllm-project/vllm',
      'huggingface/transformers',
      'vitejs/vite',
      'bun-community/bun',
      'denoland/deno',
      'pnpm/pnpm',
      'nodejs/node',
      'rust-lang/rust',
      'golang/go',
      'pytorch/pytorch',
      'tensorflow/tensorflow',
      'django/django',
      'fastapi/fastapi',
      'flutter/flutter',
      'facebook/react-native',
      'electron/electron',
      'shadcn-ui/ui',
      'supabase/supabase',
      'prisma/prisma',
      'mrdoob/three.js',
      'sveltejs/svelte',
      'solidjs/solid',
      'reduxjs/redux',
      'expressjs/express',
      'axios/axios',
      'lodash/lodash',
      'd3/d3',
      'recharts/recharts',
      'framer/motion',
      'kubernetes/kubernetes',
      'docker/cli',
      'meta-llama/llama',
      'openai/openai-node',
      'google/generative-ai-js',
      'spring-projects/spring-boot',
      'elastic/elasticsearch',
      'angular/angular',
      'webpack/webpack',
      'git/git',
      'homebrew/brew',
      'ohmyzsh/ohmyzsh',
      'eslint/eslint',
      'moby/moby',
      'npm/cli'
    ];

    // Shuffled pool to ensure randomness on each refresh
    const shuffledRepos = [...trendingRepos].sort(() => Math.random() - 0.5);

    // Seed floating nodes
    const nodeCount = Math.min(22, Math.floor((width * height) / 45000));
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const isMajor = Math.random() > 0.7;
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: isMajor ? 5 : 3,
        label: shuffledRepos[i % shuffledRepos.length],
        isMajor,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    // Capture mouse actions
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    let tick = 0;


    const render = () => {
      tick += 0.01;
      ctx.clearRect(0, 0, width, height);

      // 获取 CSS 变量值
      const style = getComputedStyle(document.documentElement);
      const accentRgb = (style.getPropertyValue('--accent-color-rgb') || '79, 70, 229').trim();
      const charcoalRgb = (style.getPropertyValue('--text-charcoal-rgb') || '26, 26, 26').trim();

      // 1. Draw elegant blueprint grid
      const drawGrid = (context: CanvasRenderingContext2D) => {
        const gridSize = 45;
        context.strokeStyle = `rgba(${charcoalRgb}, 0.02)`;
        context.lineWidth = 1;

        for (let x = 0; x < width; x += gridSize) {
          context.beginPath();
          context.moveTo(x, 0);
          context.lineTo(x, height);
          context.stroke();
        }

        for (let y = 0; y < height; y += gridSize) {
          context.beginPath();
          context.moveTo(0, y);
          context.lineTo(width, y);
          context.stroke();
        }
      };

      drawGrid(ctx);

      // 2. Process forces and update positions
      nodes.forEach((node) => {
        // Drifting boundaries wrap-around
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;

        // Mouse displacement effect
        const dx = mouseRef.current.x - node.x;
        const dy = mouseRef.current.y - node.y;
        const dist = Math.hypot(dx, dy);

        if (dist < mouseRef.current.radius) {
          const force = (mouseRef.current.radius - dist) / mouseRef.current.radius;
          // Slowly push nodes away
          node.x -= (dx / dist) * force * 0.8;
          node.y -= (dy / dist) * force * 0.8;
        }
      });

      // 3. Draw Git Branch links (Connecting nodes that are reasonably close)
      ctx.lineWidth = 0.55;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const distance = Math.hypot(n1.x - n2.x, n1.y - n2.y);

          if (distance < 190) {
            // Visual fade based on distance
            const alpha = (1 - distance / 190) * 0.12;
            ctx.strokeStyle = `rgba(${accentRgb}, ${alpha})`; // Indigo trace
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      // 4. Draw Version Nodes, labels, and pulses
      nodes.forEach((node) => {
        const pulse = Math.sin(tick * 1.5 + node.pulseOffset) * 0.4 + 1; // gentle pulsing

        // Pulsing hollow ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * (1 + pulse * 0.6), 0, Math.PI * 2);
        ctx.strokeStyle = node.isMajor ? `rgba(${accentRgb}, 0.08)` : `rgba(${charcoalRgb}, 0.03)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Node center core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = node.isMajor ? `rgba(${accentRgb}, 0.45)` : `rgba(${charcoalRgb}, 0.2)`;
        ctx.fill();

        // Semantic Version Label (Monospace typography)
        ctx.fillStyle = `rgba(${charcoalRgb}, 0.25)`;
        ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(node.label, node.x + 8, node.y + 3);
      });

      // 5. Draw Cursor Gravity ring
      if (mouseRef.current.x > 0) {
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, mouseRef.current.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          mouseRef.current.radius
        );
        gradient.addColorStop(0, `rgba(${accentRgb}, 0.025)`);
        gradient.addColorStop(1, `rgba(${accentRgb}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-10 bg-paper-light transition-colors duration-500"
    />
  );
}
