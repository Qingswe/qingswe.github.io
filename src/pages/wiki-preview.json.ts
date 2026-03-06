import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPostsList } from "@utils/content-utils";

export const GET: APIRoute = async () => {
	const posts = await getSortedPostsList();
	const wikiEntries = await getCollection("wiki");

	const index: Record<string, { title: string; description: string; type: "post" | "wiki" }> = {};

	for (const post of posts) {
		index[post.slug] = {
			title: post.data.title,
			description: post.data.description ?? "",
			type: "post",
		};
	}

	for (const entry of wikiEntries) {
		index[`wiki:${entry.slug}`] = {
			title: entry.data.title,
			description: entry.data.description ?? "",
			type: "wiki",
		};
	}

	return new Response(JSON.stringify(index), {
		headers: { "Content-Type": "application/json" },
	});
};
