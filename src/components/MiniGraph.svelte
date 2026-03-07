<script lang="ts">
import { onMount, onDestroy } from "svelte";

// The ID of the current page's node in the graph.
// Posts use their slug directly (e.g. "digital-garden").
// Wiki entries are prefixed: "wiki:<slug>" (e.g. "wiki:markdown").
export let currentNodeId: string;

interface GraphNode {
	id: string;
	title: string;
	type: "post" | "wiki";
	url: string;
	linkCount: number;
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

const CANVAS_HEIGHT = 220;

let container: HTMLDivElement;
let canvas: HTMLCanvasElement;

let nodes: GraphNode[] = [];
let links: GraphLink[] = [];
let nodeMap = new Map<string, GraphNode>();

let width = 400;
const height = CANVAS_HEIGHT;

let offsetX = 0;
let offsetY = 0;
let scale = 1;

let hoveredNode: GraphNode | null = null;
let draggingNode: GraphNode | null = null;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let mouseDownPos = { x: 0, y: 0 };

let rafId: number;
let alpha = 1;
let isLoading = true;
let hasConnections = false;

function nodeR(n: GraphNode): number {
	return n.id === currentNodeId ? 7 : 4.5;
}

function getColors() {
	const dark = document.documentElement.classList.contains("dark");
	return {
		edge: dark ? "rgba(148,163,184,0.25)" : "rgba(100,116,139,0.2)",
		edgeHighlight: dark ? "rgba(167,139,250,0.7)" : "rgba(109,40,217,0.5)",
		node: dark ? "#64748b" : "#94a3b8",
		nodeWiki: dark ? "#7c3aed" : "#8b5cf6",
		nodeCurrent: dark ? "#a78bfa" : "#7c3aed",
		nodeHover: dark ? "#e2e8f0" : "#1e293b",
		glowCurrent: dark ? "rgba(167,139,250,0.2)" : "rgba(124,58,237,0.14)",
		label: dark ? "#94a3b8" : "#64748b",
		labelBright: dark ? "#e2e8f0" : "#1e293b",
		labelCurrent: dark ? "#c4b5fd" : "#6d28d9",
	};
}

async function loadData() {
	try {
		const res = await fetch("/graph-data.json");
		const data = await res.json();

		const allNodes: Omit<GraphNode, "x" | "y" | "vx" | "vy" | "fx" | "fy">[] =
			data.nodes;
		const allLinks: GraphLink[] = data.links;

		// Collect IDs of directly connected nodes
		const connectedIds = new Set<string>([currentNodeId]);
		for (const l of allLinks) {
			if (l.source === currentNodeId) connectedIds.add(l.target);
			if (l.target === currentNodeId) connectedIds.add(l.source);
		}

		hasConnections = connectedIds.size > 1;

		// Only keep nodes/links within 1 hop
		const localNodes = allNodes.filter((n) => connectedIds.has(n.id));
		const localLinks = allLinks.filter(
			(l) => connectedIds.has(l.source) && connectedIds.has(l.target),
		);

		// Lay out: current node at centre, neighbors on a circle
		const neighbors = localNodes.filter((n) => n.id !== currentNodeId);
		const R = Math.min(width, height) * 0.28;

		nodes = localNodes.map((n) => {
			if (n.id === currentNodeId) {
				return { ...n, x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null };
			}
			const idx = neighbors.findIndex((nb) => nb.id === n.id);
			const angle =
				(idx / Math.max(neighbors.length, 1)) * Math.PI * 2 - Math.PI / 2;
			return {
				...n,
				x: Math.cos(angle) * R,
				y: Math.sin(angle) * R,
				vx: 0,
				vy: 0,
				fx: null,
				fy: null,
			};
		});

		links = localLinks;
		nodeMap = new Map(nodes.map((n) => [n.id, n]));
	} catch (e) {
		console.error("MiniGraph load error:", e);
	} finally {
		isLoading = false;
		alpha = 1;
	}
}

// ─── Force simulation ────────────────────────────────────────────────────────

function simulationStep() {
	if (nodes.length < 2 || alpha <= 0.002) return;

	const REPULSION = 900;
	const SPRING_LEN = 75;
	const SPRING_K = 0.05;
	const GRAVITY = 0.03;
	const DAMPING = 0.8;

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

	for (const n of nodes) {
		if (n.fx !== null) continue;
		n.vx *= DAMPING;
		n.vy *= DAMPING;
		n.x += n.vx * alpha;
		n.y += n.vy * alpha;
	}

	alpha = Math.max(0, alpha * 0.991);
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function draw() {
	if (!canvas) return;
	const ctx = canvas.getContext("2d")!;
	const C = getColors();

	ctx.clearRect(0, 0, width, height);

	if (isLoading || !hasConnections) return;

	ctx.save();
	ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
	ctx.scale(scale, scale);

	const connectedToHovered = new Set<string>();
	if (hoveredNode) {
		for (const l of links) {
			if (l.source === hoveredNode.id) connectedToHovered.add(l.target);
			if (l.target === hoveredNode.id) connectedToHovered.add(l.source);
		}
	}

	// Edges
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

	// Nodes
	for (const node of nodes) {
		const r = nodeR(node);
		const isCurrent = node.id === currentNodeId;
		const isHovered = hoveredNode?.id === node.id;

		let color: string;
		if (isCurrent) color = C.nodeCurrent;
		else if (isHovered) color = C.nodeHover;
		else if (node.type === "wiki") color = C.nodeWiki;
		else color = C.node;

		// Glow for current node
		if (isCurrent) {
			ctx.beginPath();
			ctx.arc(node.x, node.y, r * 2.4, 0, Math.PI * 2);
			ctx.fillStyle = C.glowCurrent;
			ctx.fill();
		}

		ctx.beginPath();
		ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
		ctx.fillStyle = color;
		ctx.fill();

		// Labels — always visible in the mini graph (few nodes)
		const fontSize = Math.max(9, 11 / scale);
		ctx.font = `${isCurrent ? "bold " : ""}${fontSize}px sans-serif`;
		ctx.fillStyle = isCurrent
			? C.labelCurrent
			: isHovered
				? C.labelBright
				: C.label;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(node.title, node.x, node.y + r + 3 / scale);
	}

	ctx.restore();
}

function loop() {
	simulationStep();
	draw();
	rafId = requestAnimationFrame(loop);
}

// ─── Interactions ────────────────────────────────────────────────────────────

function toWorld(sx: number, sy: number) {
	return {
		x: (sx - width / 2 - offsetX) / scale,
		y: (sy - height / 2 - offsetY) / scale,
	};
}

function hitTest(sx: number, sy: number): GraphNode | null {
	const w = toWorld(sx, sy);
	for (let i = nodes.length - 1; i >= 0; i--) {
		const n = nodes[i];
		const r = nodeR(n) * 1.8;
		const dx = n.x - w.x;
		const dy = n.y - w.y;
		if (dx * dx + dy * dy <= r * r) return n;
	}
	return null;
}

function onMouseMove(e: MouseEvent) {
	const rect = canvas.getBoundingClientRect();
	const sx = e.clientX - rect.left;
	const sy = e.clientY - rect.top;

	if (draggingNode) {
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
	// Don't show pointer for current node (clicking it does nothing)
	canvas.style.cursor =
		hoveredNode && hoveredNode.id !== currentNodeId ? "pointer" : "default";
}

function onMouseDown(e: MouseEvent) {
	const rect = canvas.getBoundingClientRect();
	mouseDownPos = { x: e.clientX, y: e.clientY };
	const n = hitTest(e.clientX - rect.left, e.clientY - rect.top);
	if (n) {
		draggingNode = n;
		n.fx = n.x;
		n.fy = n.y;
		alpha = Math.max(alpha, 0.3);
		canvas.style.cursor = "grabbing";
	} else {
		isPanning = true;
		panStart = { x: e.clientX, y: e.clientY };
		canvas.style.cursor = "grabbing";
	}
}

function onMouseUp(e: MouseEvent) {
	if (draggingNode) {
		draggingNode.fx = null;
		draggingNode.fy = null;
		draggingNode = null;
	}
	isPanning = false;
	const rect = canvas.getBoundingClientRect();
	const n = hitTest(e.clientX - rect.left, e.clientY - rect.top);
	canvas.style.cursor =
		n && n.id !== currentNodeId ? "pointer" : "default";
}

function onClick(e: MouseEvent) {
	const dx = e.clientX - mouseDownPos.x;
	const dy = e.clientY - mouseDownPos.y;
	if (Math.sqrt(dx * dx + dy * dy) > 5) return;
	const rect = canvas.getBoundingClientRect();
	const n = hitTest(e.clientX - rect.left, e.clientY - rect.top);
	if (n && n.id !== currentNodeId) window.location.href = n.url;
}

function onWheel(e: WheelEvent) {
	e.preventDefault();
	const rect = canvas.getBoundingClientRect();
	const mx = e.clientX - rect.left;
	const my = e.clientY - rect.top;
	const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
	const newScale = Math.max(0.3, Math.min(4, scale * factor));
	const ratio = newScale / scale;
	offsetX = mx - width / 2 - (mx - width / 2 - offsetX) * ratio;
	offsetY = my - height / 2 - (my - height / 2 - offsetY) * ratio;
	scale = newScale;
}

function onResize() {
	if (!container) return;
	width = container.clientWidth;
	if (canvas) canvas.width = width;
}

onMount(async () => {
	onResize();
	const ro = new ResizeObserver(onResize);
	ro.observe(container);
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

<!-- Only render when there are actual connections -->
{#if !isLoading && !hasConnections}
	<!-- Nothing to show — isolated page -->
{:else}
	<div class="mt-1 mb-6 onload-animation">
		<!-- Header row -->
		<div class="flex items-center justify-between mb-2.5">
			<div class="flex items-center gap-2 text-sm font-medium text-black/40 dark:text-white/40">
				<!-- Simple graph icon -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-4 h-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="6" cy="12" r="2" />
					<circle cx="18" cy="6" r="2" />
					<circle cx="18" cy="18" r="2" />
					<line x1="7.7" y1="10.7" x2="16.3" y2="7.3" />
					<line x1="7.7" y1="13.3" x2="16.3" y2="16.7" />
				</svg>
				Related Pages
			</div>
			<a
				href="/graph/"
				class="text-xs text-[var(--primary)] hover:underline opacity-60 hover:opacity-100 transition-opacity"
			>
				Full graph →
			</a>
		</div>

		<!-- Canvas area -->
		<div
			bind:this={container}
			class="relative w-full rounded-2xl border border-[var(--line-divider)] overflow-hidden"
			style="height: {CANVAS_HEIGHT}px;"
		>
			<canvas
				bind:this={canvas}
				{width}
				height={CANVAS_HEIGHT}
				on:mousemove={onMouseMove}
				on:mousedown={onMouseDown}
				on:mouseup={onMouseUp}
				on:mouseleave={onMouseUp}
				on:click={onClick}
				class="block"
			></canvas>

			{#if isLoading}
				<div
					class="absolute inset-0 flex items-center justify-center text-xs text-black/25 dark:text-white/25"
				>
					Loading…
				</div>
			{/if}
		</div>
	</div>
{/if}
