import type { APIRoute } from "astro";
import { getSortedPostsList } from "@utils/content-utils";

export const GET: APIRoute = async () => {
	const posts = await getSortedPostsList();

	const index: Record<string, { title: string; description: string }> = {};
	for (const post of posts) {
		index[post.slug] = {
			title: post.data.title,
			description: post.data.description ?? "",
		};
	}

	return new Response(JSON.stringify(index), {
		headers: { "Content-Type": "application/json" },
	});
};
