<script lang="ts">
import { onMount, onDestroy } from "svelte";

// Optionally highlight a specific node (e.g., the current page's slug)
export let currentNodeId: string | null = null;

interface GraphNode {
	id: string;
	title: string;
	type: "post" | "wiki";
	url: string;
	linkCount: number;
	// simulation state
	x: number;
	y: number;
	vx: number;
	vy: number;
	fx: number | null;
	fy: number | null;
}

interface GraphLink {
	source: string;
	target: string;
}

// DOM refs
let container: HTMLDivElement;
let canvas: HTMLCanvasElement;

// Graph data
let nodes: GraphNode[] = [];
let links: GraphLink[] = [];
let nodeMap = new Map<string, GraphNode>();

// Viewport
let width = 800;
let height = 600;
let offsetX = 0;
let offsetY = 0;
let scale = 1;

// Interaction
let hoveredNode: GraphNode | null = null;
let draggingNode: GraphNode | null = null;
let isDragging = false; // true once pointer actually moved after mousedown on node
let isPanning = false;
let panStart = { x: 0, y: 0 };
let mouseDownPos = { x: 0, y: 0 };

// Animation
let rafId: number;
let alpha = 1; // simulation heat — cools toward 0

// UI state
let isLoading = true;
let tooltipX = 0;
let tooltipY = 0;

function nodeRadius(n: GraphNode): number {
	return 4 + Math.min(n.linkCount * 2, 10);
}

function getColors() {
	const dark = document.documentElement.classList.contains("dark");
	return {
		bg: dark ? "#1a1b26" : "#f1f5f9",
		edge: dark ? "rgba(148,163,184,0.22)" : "rgba(100,116,139,0.18)",
		edgeHighlight: dark
			? "rgba(167,139,250,0.75)"
			: "rgba(109,40,217,0.55)",
		node: dark ? "#64748b" : "#94a3b8",
		nodeWiki: dark ? "#7c3aed" : "#8b5cf6",
		nodeCurrent: dark ? "#a78bfa" : "#7c3aed",
		nodeHover: dark ? "#e2e8f0" : "#1e293b",
		nodeConnected: dark ? "#94a3b8" : "#64748b",
		glowCurrent: dark
			? "rgba(167,139,250,0.18)"
			: "rgba(124,58,237,0.12)",
		glowHover: dark ? "rgba(226,232,240,0.12)" : "rgba(30,41,59,0.08)",
		label: dark ? "#94a3b8" : "#64748b",
		labelBright: dark ? "#e2e8f0" : "#1e293b",
		labelCurrent: dark ? "#c4b5fd" : "#6d28d9",
	};
}

async function loadData() {
	try {
		const res = await fetch("/graph-data.json");
		const data = await res.json();

		const spreadR = Math.max(160, Math.sqrt(data.nodes.length) * 65);

		nodes = (data.nodes as Omit<GraphNode, "x" | "y" | "vx" | "vy" | "fx" | "fy">[]).map(
			(n, i) => {
				const angle = (i / data.nodes.length) * Math.PI * 2;
				const r = spreadR * (0.4 + Math.random() * 0.6);
				return {
					...n,
					x: Math.cos(angle) * r,
					y: Math.sin(angle) * r,
					vx: 0,
					vy: 0,
					fx: null,
					fy: null,
				};
			},
		);

		links = data.links as GraphLink[];
		nodeMap = new Map(nodes.map((n) => [n.id, n]));
	} catch (e) {
		console.error("Failed to load graph data:", e);
	} finally {
		isLoading = false;
		alpha = 1;
	}
}

// ─── Force simulation ───────────────────────────────────────────────────────

function simulationStep() {
	if (nodes.length < 2 || alpha <= 0.002) return;

	const REPULSION = 1400;
	const SPRING_LEN = 90;
	const SPRING_K = 0.04;
	const GRAVITY = 0.018;
	const DAMPING = 0.82;

	// Gravity to centre + zero-out pinned nodes
	for (const n of nodes) {
		if (n.fx !== null) {
			n.x = n.fx;
			n.vx = 0;
		}
		if (n.fy !== null) {
			n.y = n.fy;
			n.vy = 0;
		}
		if (n.fx === null) {
			n.vx -= n.x * GRAVITY;
			n.vy -= n.y * GRAVITY;
		}
	}

	// Pairwise repulsion
	for (let i = 0; i < nodes.length; i++) {
		const a = nodes[i];
		for (let j = i + 1; j < nodes.length; j++) {
			const b = nodes[j];
			const dx = a.x - b.x;
			const dy = a.y - b.y;
			const dist2 = dx * dx + dy * dy || 1;
			const dist = Math.sqrt(dist2);
			const f = REPULSION / dist2;
			const fx = (dx / dist) * f;
			const fy = (dy / dist) * f;
			if (a.fx === null) {
				a.vx += fx;
				a.vy += fy;
			}
			if (b.fx === null) {
				b.vx -= fx;
				b.vy -= fy;
			}
		}
	}

	// Spring forces along edges
	for (const link of links) {
		const a = nodeMap.get(link.source);
		const b = nodeMap.get(link.target);
		if (!a || !b) continue;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const dist = Math.sqrt(dx * dx + dy * dy) || 1;
		const f = (dist - SPRING_LEN) * SPRING_K;
		const fx = (dx / dist) * f;
		const fy = (dy / dist) * f;
		if (a.fx === null) {
			a.vx += fx;
			a.vy += fy;
		}
		if (b.fx === null) {
			b.vx -= fx;
			b.vy -= fy;
		}
	}

	// Integrate
	for (const n of nodes) {
		if (n.fx !== null) continue;
		n.vx *= DAMPING;
		n.vy *= DAMPING;
		n.x += n.vx * alpha;
		n.y += n.vy * alpha;
	}

	alpha = Math.max(0, alpha * 0.994);
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function draw() {
	if (!canvas) return;
	const ctx = canvas.getContext("2d")!;
	const C = getColors();

	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = C.bg;
	ctx.fillRect(0, 0, width, height);

	if (isLoading) {
		ctx.fillStyle = C.label;
		ctx.font = "14px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("Loading graph…", width / 2, height / 2);
		return;
	}

	if (nodes.length === 0) {
		ctx.fillStyle = C.label;
		ctx.font = "14px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("No content found.", width / 2, height / 2);
		return;
	}

	ctx.save();
	ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
	ctx.scale(scale, scale);

	// Collect connected node IDs for the hovered node
	const connectedIds = new Set<string>();
	if (hoveredNode) {
		for (const l of links) {
			if (l.source === hoveredNode.id) connectedIds.add(l.target);
			if (l.target === hoveredNode.id) connectedIds.add(l.source);
		}
	}

	// ── Draw edges ──
	for (const link of links) {
		const a = nodeMap.get(link.source);
		const b = nodeMap.get(link.target);
		if (!a || !b) continue;
		const highlight =
			hoveredNode &&
			(link.source === hoveredNode.id || link.target === hoveredNode.id);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.strokeStyle = highlight ? C.edgeHighlight : C.edge;
		ctx.lineWidth = highlight ? 1.5 / scale : 1 / scale;
		ctx.stroke();
	}

	// ── Draw nodes in layers (dim → connected → hovered/current) ──
	const renderNode = (node: GraphNode) => {
		const r = nodeRadius(node);
		const isCurrent = node.id === currentNodeId;
		const isHovered = hoveredNode?.id === node.id;
		const isConn = connectedIds.has(node.id);

		let color: string;
		if (isCurrent) color = C.nodeCurrent;
		else if (isHovered) color = C.nodeHover;
		else if (isConn) color = C.nodeConnected;
		else if (node.type === "wiki") color = C.nodeWiki;
		else color = C.node;

		// Soft glow
		if (isCurrent || isHovered) {
			ctx.beginPath();
			ctx.arc(node.x, node.y, r * 2.2, 0, Math.PI * 2);
			ctx.fillStyle = isCurrent ? C.glowCurrent : C.glowHover;
			ctx.fill();
		}

		// Node circle
		ctx.beginPath();
		ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();

		// Label
		const showLabel =
			isCurrent ||
			isHovered ||
			isConn ||
			node.linkCount >= 2 ||
			scale >= 2;
		if (showLabel) {
			const fontSize = Math.max(9, 12 / scale);
			ctx.font = `${isCurrent || isHovered ? "bold " : ""}${fontSize}px sans-serif`;
			ctx.fillStyle = isCurrent
				? C.labelCurrent
				: isHovered
					? C.labelBright
					: C.label;
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillText(node.title, node.x, node.y + r + 3 / scale);
		}
	};

	// layer 1: regular nodes
	for (const n of nodes) {
		if (
			n.id !== hoveredNode?.id &&
			!connectedIds.has(n.id) &&
			n.id !== currentNodeId
		)
			renderNode(n);
	}
	// layer 2: connected nodes
	for (const n of nodes) {
		if (connectedIds.has(n.id) && n.id !== hoveredNode?.id) renderNode(n);
	}
	// layer 3: current page node
	const curNode = currentNodeId ? nodeMap.get(currentNodeId) : null;
	if (curNode && curNode !== hoveredNode) renderNode(curNode);
	// layer 4: hovered node (always on top)
	if (hoveredNode) renderNode(hoveredNode);

	ctx.restore();
}

function loop() {
	simulationStep();
	draw();
	rafId = requestAnimationFrame(loop);
}

// ─── Coordinate helpers ──────────────────────────────────────────────────────

function toWorld(sx: number, sy: number) {
	return {
		x: (sx - width / 2 - offsetX) / scale,
		y: (sy - height / 2 - offsetY) / scale,
	};
}

function hitTest(sx: number, sy: number): GraphNode | null {
	const w = toWorld(sx, sy);
	// Iterate in reverse so top-rendered nodes are hit first
	for (let i = nodes.length - 1; i >= 0; i--) {
		const n = nodes[i];
		const r = nodeRadius(n) * 1.6;
		const dx = n.x - w.x;
		const dy = n.y - w.y;
		if (dx * dx + dy * dy <= r * r) return n;
	}
	return null;
}

// ─── Event handlers ──────────────────────────────────────────────────────────

function onMouseMove(e: MouseEvent) {
	const rect = canvas.getBoundingClientRect();
	const sx = e.clientX - rect.left;
	const sy = e.clientY - rect.top;

	if (draggingNode) {
		isDragging = true;
		const w = toWorld(sx, sy);
		draggingNode.x = w.x;
		draggingNode.y = w.y;
		draggingNode.fx = w.x;
		draggingNode.fy = w.y;
		return;
	}

	if (isPanning) {
		offsetX += e.clientX - panStart.x;
		offsetY += e.clientY - panStart.y;
		panStart = { x: e.clientX, y: e.clientY };
		return;
	}

	hoveredNode = hitTest(sx, sy);
	canvas.style.cursor = hoveredNode ? "pointer" : "grab";

	if (hoveredNode) {
		// Keep tooltip inside canvas
		tooltipX = Math.min(sx + 14, width - 180);
		tooltipY = Math.max(sy - 10, 4);
	}
}

function onMouseDown(e: MouseEvent) {
	const rect = canvas.getBoundingClientRect();
	const sx = e.clientX - rect.left;
	const sy = e.clientY - rect.top;
	mouseDownPos = { x: e.clientX, y: e.clientY };
	isDragging = false;
	const n = hitTest(sx, sy);
	if (n) {
		draggingNode = n;
		n.fx = n.x;
		n.fy = n.y;
		alpha = Math.max(alpha, 0.3); // re-heat briefly
		canvas.style.cursor = "grabbing";
	} else {
		isPanning = true;
		panStart = { x: e.clientX, y: e.clientY };
		canvas.style.cursor = "grabbing";
	}
}

function onMouseUp(e: MouseEvent) {
	if (draggingNode) {
		// Release pin so node can drift freely again
		draggingNode.fx = null;
		draggingNode.fy = null;
		draggingNode = null;
	}
	isPanning = false;
	const rect = canvas.getBoundingClientRect();
	const n = hitTest(e.clientX - rect.left, e.clientY - rect.top);
	canvas.style.cursor = n ? "pointer" : "grab";
}

function onClick(e: MouseEvent) {
	// Only navigate if the mouse didn't move much (i.e. not a drag)
	const dx = e.clientX - mouseDownPos.x;
	const dy = e.clientY - mouseDownPos.y;
	if (Math.sqrt(dx * dx + dy * dy) > 5 || isDragging) return;

	const rect = canvas.getBoundingClientRect();
	const n = hitTest(e.clientX - rect.left, e.clientY - rect.top);
	if (n) window.location.href = n.url;
}

function onWheel(e: WheelEvent) {
	e.preventDefault();
	const rect = canvas.getBoundingClientRect();
	const mx = e.clientX - rect.left;
	const my = e.clientY - rect.top;
	const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
	const newScale = Math.max(0.15, Math.min(8, scale * factor));
	const ratio = newScale / scale;
	offsetX = mx - width / 2 - (mx - width / 2 - offsetX) * ratio;
	offsetY = my - height / 2 - (my - height / 2 - offsetY) * ratio;
	scale = newScale;
}

function resetView() {
	offsetX = 0;
	offsetY = 0;
	scale = 1;
}

function onResize() {
	if (!container) return;
	width = container.clientWidth;
	height = container.clientHeight;
	if (canvas) {
		canvas.width = width;
		canvas.height = height;
	}
}

onMount(async () => {
	onResize();

	const ro = new ResizeObserver(onResize);
	ro.observe(container);

	// Register wheel listener as non-passive so we can call preventDefault
	canvas.addEventListener("wheel", onWheel, { passive: false });

	await loadData();
	loop();

	return () => {
		ro.disconnect();
		canvas.removeEventListener("wheel", onWheel);
	};
});

onDestroy(() => {
	cancelAnimationFrame(rafId);
});
</script>

<!-- Container fills whatever space the parent gives it -->
<div bind:this={container} class="relative w-full h-full select-none overflow-hidden">
	<canvas
		bind:this={canvas}
		{width}
		{height}
		on:mousemove={onMouseMove}
		on:mousedown={onMouseDown}
		on:mouseup={onMouseUp}
		on:mouseleave={onMouseUp}
		on:click={onClick}
		class="block"
		style="cursor: grab;"
	></canvas>

	<!-- Hover tooltip -->
	{#if hoveredNode}
		<div
			class="pointer-events-none absolute z-10 rounded-xl px-3 py-2 text-sm shadow-lg
                   bg-[var(--card-bg)] border border-[var(--line-divider)]"
			style="left: {tooltipX}px; top: {tooltipY}px; max-width: 200px;"
		>
			<div class="font-semibold truncate text-[var(--text-color)]">
				{hoveredNode.title}
			</div>
			<div class="text-xs mt-0.5 opacity-60 text-[var(--text-color)]">
				{hoveredNode.type === "wiki" ? "Wiki" : "Post"} · {hoveredNode.linkCount}
				{hoveredNode.linkCount === 1 ? "link" : "links"}
			</div>
		</div>
	{/if}

	<!-- Reset view button -->
	<button
		on:click={resetView}
		class="absolute top-3 right-3 z-10 rounded-lg px-2.5 py-1.5 text-xs
               opacity-50 hover:opacity-90 transition-opacity
               bg-[var(--card-bg)] border border-[var(--line-divider)] text-[var(--text-color)]"
		aria-label="Reset view"
		title="Reset view"
	>
		⊙ Reset
	</button>

	<!-- Hint -->
	<div
		class="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs opacity-30
               pointer-events-none text-[var(--text-color)] whitespace-nowrap"
	>
		Scroll to zoom · Drag to pan · Click node to open
	</div>
</div>
