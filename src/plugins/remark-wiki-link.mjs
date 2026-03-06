import { SKIP, visit } from "unist-util-visit";

/**
 * Remark plugin to transform Obsidian-style wiki links [[...]] into HTML links.
 *
 * Supported syntax:
 *   [[slug]]               → /posts/slug/  (display: "slug")
 *   [[slug|Display Text]]  → /posts/slug/  (display: "Display Text")
 *   [[slug#heading]]       → /posts/slug/#heading  (display: "slug")
 *   [[slug#heading|Text]]  → /posts/slug/#heading  (display: "Text")
 *
 *   Wiki article links (prefix with "w/"):
 *   [[w/slug]]             → /wiki/slug/   (display: "slug")
 *   [[w/slug|Display Text]]→ /wiki/slug/   (display: "Display Text")
 *   [[w/slug#heading]]     → /wiki/slug/#heading
 *
 *   NOTE: Do NOT use "w:" as prefix — remark-directive parses ":name" as
 *   text directives at the micromark tokenization level, which would break
 *   the [[...]] pattern before this plugin runs.
 *
 * @param {object} options
 * @param {string} options.basePath       Base path for post links. Default: "/posts/"
 * @param {string} options.wikiBasePath   Base path for wiki links. Default: "/wiki/"
 */
export function remarkWikiLink(options = {}) {
	const { basePath = "/posts/", wikiBasePath = "/wiki/" } = options;
	const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

	return (tree) => {
		visit(tree, "text", (node, index, parent) => {
			if (!node.value.includes("[[") || index === null || !parent) return;

			const text = node.value;
			const newNodes = [];
			let lastIndex = 0;

			WIKI_LINK_REGEX.lastIndex = 0;
			let match;

			while ((match = WIKI_LINK_REGEX.exec(text)) !== null) {
				const [fullMatch, content] = match;
				const start = match.index;

				// Text segment before this wiki link
				if (start > lastIndex) {
					newNodes.push({ type: "text", value: text.slice(lastIndex, start) });
				}

				// Parse the content inside [[ ]]
				const pipeIdx = content.indexOf("|");
				let rawTarget, displayText;

				if (pipeIdx !== -1) {
					rawTarget = content.slice(0, pipeIdx).trim();
					displayText = content.slice(pipeIdx + 1).trim();
				} else {
					rawTarget = content.trim();
					displayText = rawTarget;
				}

				// Detect wiki article prefix "w/" (use slash, not colon, to avoid
				// conflict with remark-directive which parses ":name" as text directives)
				let isWikiLink = false;
				if (rawTarget.startsWith("w/")) {
					isWikiLink = true;
					rawTarget = rawTarget.slice(2).trim();
					// If no custom display text was provided, use the bare slug
					if (displayText === content.trim()) {
						displayText = rawTarget;
					}
				}

				// Separate optional anchor (#heading)
				const hashIdx = rawTarget.indexOf("#");
				let slug, anchor;

				if (hashIdx !== -1) {
					slug = rawTarget.slice(0, hashIdx);
					anchor = rawTarget.slice(hashIdx + 1);
					// Strip the anchor from display text if it was auto-generated
					if (displayText === rawTarget) {
						displayText = slug;
					}
				} else {
					slug = rawTarget;
					anchor = null;
				}

				// Normalise slug: lowercase + spaces → hyphens
				const normalizedSlug = slug.toLowerCase().replace(/\s+/g, "-");

				// Build href
				const linkBase = isWikiLink ? wikiBasePath : basePath;
				let href = `${linkBase}${normalizedSlug}/`;
				if (anchor) {
					href += `#${anchor.toLowerCase().replace(/\s+/g, "-")}`;
				}

				newNodes.push({
					type: "link",
					url: href,
					data: {
						hProperties: {
							class: "wiki-link",
							"data-wiki-slug": normalizedSlug,
							"data-wiki-type": isWikiLink ? "wiki" : "post",
						},
					},
					children: [{ type: "text", value: displayText }],
				});

				lastIndex = start + fullMatch.length;
			}

			// Remaining text after last wiki link
			if (lastIndex < text.length) {
				newNodes.push({ type: "text", value: text.slice(lastIndex) });
			}

			// Replace this text node with the expanded node list
			parent.children.splice(index, 1, ...newNodes);
			return [SKIP, index + newNodes.length];
		});
	};
}
