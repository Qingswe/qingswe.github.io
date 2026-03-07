import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

interface ParsedLink {
	slug: string;
	type: "post" | "wiki";
}

function parseWikiLinks(body: string): ParsedLink[] {
	const links: ParsedLink[] = [];
	const regex = new RegExp(WIKI_LINK_REGEX.source, "g");
	let match;

	while ((match = regex.exec(body)) !== null) {
		const content = match[1];
		const pipeIdx = content.indexOf("|");
		const rawTarget = (
			pipeIdx !== -1 ? content.slice(0, pipeIdx) : content
		).trim();

		let isWiki = false;
		let target = rawTarget;
		if (target.startsWith("w/")) {
			isWiki = true;
			target = target.slice(2).trim();
		}

		// Remove anchor (#heading)
		const hashIdx = target.indexOf("#");
		if (hashIdx !== -1) target = target.slice(0, hashIdx);

		const slug = target.toLowerCase().replace(/\s+/g, "-");
		if (slug) links.push({ slug, type: isWiki ? "wiki" : "post" });
	}

	return links;
}

export const GET: APIRoute = async () => {
	const posts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const wikiEntries = await getCollection("wiki");

	// Build node map
	const nodeMap = new Map<
		string,
		{ id: string; title: string; type: "post" | "wiki"; url: string }
	>();

	for (const post of posts) {
		nodeMap.set(post.slug, {
			id: post.slug,
			title: post.data.title,
			type: "post",
			url: `/posts/${post.slug}/`,
		});
	}

	for (const entry of wikiEntries) {
		nodeMap.set(`wiki:${entry.slug}`, {
			id: `wiki:${entry.slug}`,
			title: entry.data.title,
			type: "wiki",
			url: `/wiki/${entry.slug}/`,
		});
	}

	// Parse links and deduplicate
	const linkSet = new Set<string>();
	const links: Array<{ source: string; target: string }> = [];

	for (const post of posts) {
		const wikiLinks = parseWikiLinks(post.body || "");
		for (const link of wikiLinks) {
			const targetId =
				link.type === "wiki" ? `wiki:${link.slug}` : link.slug;
			if (!nodeMap.has(targetId) || post.slug === targetId) continue;
			// Deduplicate undirected edges
			const key = [post.slug, targetId].sort().join("||");
			if (!linkSet.has(key)) {
				linkSet.add(key);
				links.push({ source: post.slug, target: targetId });
			}
		}
	}

	for (const entry of wikiEntries) {
		const nodeId = `wiki:${entry.slug}`;
		const wikiLinks = parseWikiLinks(entry.body || "");
		for (const link of wikiLinks) {
			const targetId =
				link.type === "wiki" ? `wiki:${link.slug}` : link.slug;
			if (!nodeMap.has(targetId) || nodeId === targetId) continue;
			const key = [nodeId, targetId].sort().join("||");
			if (!linkSet.has(key)) {
				linkSet.add(key);
				links.push({ source: nodeId, target: targetId });
			}
		}
	}

	// Count connections per node
	const linkCounts = new Map<string, number>();
	for (const link of links) {
		linkCounts.set(link.source, (linkCounts.get(link.source) || 0) + 1);
		linkCounts.set(link.target, (linkCounts.get(link.target) || 0) + 1);
	}

	const nodes = Array.from(nodeMap.values()).map((node) => ({
		...node,
		linkCount: linkCounts.get(node.id) || 0,
	}));

	return new Response(JSON.stringify({ nodes, links }), {
		headers: { "Content-Type": "application/json" },
	});
};
