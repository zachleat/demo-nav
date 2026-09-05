import fs from "node:fs";
import { transform } from "lightningcss";

/* Builds the two generated files:
     demo-nav.html  the self-contained copy-paste snippet
     index.html     the builder page and samples

   demo-nav.css is the source of truth. It is minified here with lightningcss
   and inlined into both outputs; the minified stylesheet is a build artifact
   and is never written to disk on its own. */

const AVATAR = "https://v1.indieweb-avatar.11ty.dev/";

/* Each profile is an identity the nav can wear: the wordmark, where it links,
   and the trailing link that is always present. */
const PROFILES = {
	zachleat: {
		label: "zachleat",
		home: "https://www.zachleat.com/",
		trailingLabel: "All Projects",
		trailingUrl: "https://www.zachleat.com/projects/"
	},
	eleventy: {
		label: "11ty",
		home: "https://11ty.dev/",
		trailingLabel: "Docs",
		trailingUrl: "https://11ty.dev/docs/"
	},
	buildawesome: {
		label: "Build Awesome",
		home: "https://build.awesome.me/",
		trailingLabel: "Docs",
		trailingUrl: "https://build.awesome.me/docs/"
	}
};

const DEFAULT_PROFILE = "zachleat";
// npmjs.com blocks the avatar service, so read npm's mark from the docs site.
const NPM_ICON = "https://docs.npmjs.com/";
/* Delimiters around the pasted block, so it can be found in a demo's source
   later — by eye, or by a script that swaps in a newer copy. The date says how
   old a copy pasted years ago has become. Single hyphens only: a double hyphen
   would close the comment early. */
const BUILD_DATE = new Date().toISOString().slice(0, 10);

function commentStart(profile) {
	return `<!-- ${profile.label} nav (${BUILD_DATE}) -->`;
}

function commentEnd(profile) {
	return `<!-- /${profile.label} nav -->`;
}

/* Ultra-minify renames every class and custom property to <prefix><suffix>.
   Only the suffixes are fixed here — the prefix is a field in the builder, so
   the rename runs in the browser. A prefix is kept at all (rather than going
   to single letters) because the long `demo-nav` prefix is what stops a host
   page's own selectors from colliding with the nav. */
const SAMPLE_PREFIX = "zn"; // only used for the build's size report

const CLASS_SUFFIXES = {
	"demo-nav": "",
	"demo-nav-static": "-s",
	"demo-nav-icon": "-i",
	"demo-nav-home": "-h",
	"demo-nav-suffix": "-x",
	"demo-nav-heading": "-g",
	"demo-nav-title": "-t",
	"demo-nav-description": "-p",
	"demo-nav-links": "-u",
	"demo-nav-code": "-c",
	"demo-nav-skip": "-k"
};

const PROP_SUFFIXES = {
	"--demo-nav-bg-solid": "-bgs",
	"--demo-nav-bg": "-bg",
	"--demo-nav-text": "-fg",
	"--demo-nav-muted": "-mu",
	"--demo-nav-border": "-bd",
	"--demo-nav-green": "-gr",
	"--demo-nav-primary": "-pr",
	"--demo-nav-accent": "-ac",
	"--demo-nav-icon-bg": "-ib",
	"--demo-nav-icon-radius": "-ir",
	"--demo-nav-radius": "-r",
	"--demo-nav-font-mono": "-fm",
	"--demo-nav-font": "-ff"
};

/* Longest first, so --demo-nav-bg-solid is never clipped to --demo-nav-bg and
   demo-nav-description is never clipped to demo-nav. */
function byLengthDesc(pairs) {
	return Object.entries(pairs).sort((a, b) => b[0].length - a[0].length);
}

function ultraMinifyCss(css, prefix) {
	for(let [ from, to ] of byLengthDesc(PROP_SUFFIXES)) {
		css = css.split(from).join("--" + prefix + to);
	}
	for(let [ from, to ] of byLengthDesc(CLASS_SUFFIXES)) {
		css = css.split("." + from).join("." + prefix + to);
	}
	return css;
}

function minifyCss(file) {
	let { code, warnings } = transform({
		filename: file,
		code: fs.readFileSync(file),
		minify: true
	});

	for(let warning of warnings) {
		console.warn(`[${file}] ${warning.message}`);
	}

	// No banner comment here: COMMENT_START says the same thing just outside
	// the <style>, and saying it twice is bytes for nothing.
	return code.toString();
}

function icon(url, size = 24, iconUrl) {
	let src = AVATAR + encodeURIComponent(iconUrl || url) + "/";
	return `<img class="demo-nav-icon" src="${src}" alt="" width="${size}" height="${size}" decoding="async">`;
}

/* The home link text is a template: {name} stands in for the profile name, and
   everything around it is muted, so "{name} Demo" reads as a bold name with a
   quiet word after it. */
function homeText(profile, template) {
	let text = template || "{name}";
	if(!text.includes("{name}")) {
		return text;
	}
	return text
		.split("{name}")
		.map(part => part ? `<span class="demo-nav-suffix">${part}</span>` : "")
		.join(profile.label);
}

function nav({ title, description, links = [], tag = "h1", isStatic = false, skip = false,
		profile = PROFILES[DEFAULT_PROFILE], template = "{name} Demo" }) {
	let lines = [ `<header class="demo-nav${isStatic ? " demo-nav-static" : ""}">` ];

	if(skip) {
		lines.push(`\t<a class="demo-nav-skip" href="#demo">Skip to the demo</a>`);
	}

	lines.push(`\t<a class="demo-nav-home" href="${profile.home}">`);
	lines.push(`\t\t${icon(profile.home, 48)}`);
	lines.push(`\t\t<span>${homeText(profile, template)}</span>`);
	lines.push(`\t</a>`);

	if(title) {
		lines.push(`\t<div class="demo-nav-heading">`);
		lines.push(`\t\t<${tag} class="demo-nav-title">${title}</${tag}>`);
		if(description) {
			lines.push(`\t\t<p class="demo-nav-description">${description}</p>`);
		}
		lines.push(`\t</div>`);
	}

	lines.push(`\t<nav class="demo-nav-links" aria-label="Demo links">`);
	for(let [ label, url, iconUrl ] of links) {
		lines.push(`\t\t<a href="${url}">${icon(url, 24, iconUrl)}${label}</a>`);
	}
	lines.push(`\t\t<a href="${profile.trailingUrl}">${icon(profile.trailingUrl)}${profile.trailingLabel}</a>`);
	lines.push(`\t</nav>`);
	lines.push(`</header>`);

	return lines;
}

function indent(lines, depth) {
	return lines.map(line => "\t".repeat(depth) + line).join("\n");
}

function sample(heading, navLines, wrapper = "example") {
	return [ `\t<section>`,
		`\t\t<h3 class="sub">${heading}</h3>`,
		`\t\t<div class="${wrapper}">`,
		indent(navLines, 3),
		`\t\t</div>`,
		`\t</section>` ].join("\n");
}

let navCss = minifyCss("demo-nav.css");

/* ---------------------------------------------------------------- snippet */

let snippet = nav({
	title: "Demo title",
	description: "One line about what this demo shows.",
	skip: true,
	links: [
		[ "Demo", "https://demo.zachleat.com/" ],
		[ "Source", "https://github.com/zachleat/demo-repo" ],
		[ `<code class="demo-nav-code">package-name</code> on npm`, "https://www.npmjs.com/package/package-name", NPM_ICON ],
		[ "npmx", "https://npmx.dev/package/package-name" ],
		[ "Blog Post", "https://www.zachleat.com/web/blog-post/" ]
	]
});

fs.writeFileSync("demo-nav.html", `<!-- Generated by build.js. Edit demo-nav.css, then: npm run build -->
<!-- Paste everything below, from the comment down, at the top of <body>.
     It carries its own styles, so there is nothing else to add.
     Every link except "All Projects" is optional; delete what you don't need.
     The nav is sticky on viewports at least 30em tall; add the class
     demo-nav-static to let it scroll away instead. -->
${commentStart(PROFILES[DEFAULT_PROFILE])}
<style>
${navCss}
</style>
${snippet.join("\n")}
${commentEnd(PROFILES[DEFAULT_PROFILE])}
`);
console.log(`demo-nav.html  ${fs.statSync("demo-nav.html").size} bytes`);

/* ------------------------------------------------------------------- page */

let SPEEDLIFY = [
	[ "Source", "https://github.com/zachleat/speedlify" ],
	[ `<code class="demo-nav-code">speedlify</code> on npm`, "https://www.npmjs.com/package/speedlify", NPM_ICON ],
	[ "npmx", "https://npmx.dev/package/speedlify" ],
	[ "Blog Post", "https://www.zachleat.com/web/speedlify/" ]
];

let samples = [
	sample("Everything on", nav({
		title: "Speedlify scores",
		description: "Continuously measuring performance of a bunch of sites.",
		links: SPEEDLIFY, tag: "p", isStatic: true
	})),
	sample("Title only", nav({
		title: "Details element inclusively hidden", tag: "p", isStatic: true
	})),
	sample("No title at all", nav({
		links: [ [ "Source", "https://github.com/zachleat/demo-repo" ] ], isStatic: true
	})),
	sample("Over a colored background", nav({
		title: "Fluid images",
		links: [ [ "Source", "https://github.com/zachleat/demo-repo" ] ],
		tag: "p", isStatic: true
	}), "example tinted")
].join("\n\n");

let top = nav({
	title: "Unified demo nav",
	description: "A reusable header for zachleat.com demo pages.",
	links: [ [ "Source", "https://github.com/zachleat/zachleat-demo-nav" ] ]
});
top.splice(1, 0, `\t<a class="demo-nav-skip" href="#builder">Skip to the builder</a>`);

let profileOptions = Object.entries(PROFILES)
	.map(([ key, profile ]) => `<option value="${key}">${profile.label}</option>`)
	.join("\n\t\t\t\t\t");

let form = fs.readFileSync("src/form.html", "utf8").trimEnd()
	.replace("<!--PROFILE_OPTIONS-->", profileOptions);
let builderCss = fs.readFileSync("src/builder.css", "utf8").trimEnd();
let builderJs = fs.readFileSync("src/builder.js", "utf8").trimEnd();

fs.writeFileSync("index.html", `<!doctype html>
<!-- Generated by build.js. Edit demo-nav.css or src/, then: npm run build -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>zachleat demo nav</title>
<link rel="preconnect" href="${AVATAR.slice(0, -1)}">
<style>
${navCss}
</style>
<style>
${builderCss}
</style>
<!-- Filled in by the builder when Ultra-minify is on, so the preview below
     has styles matching its renamed classes. -->
<style id="ultra-css"></style>
</head>
<body>

${top.join("\n")}

<main id="demo">
${form}

	<h2>Samples</h2>

${samples}

	<p class="note">The samples render <code>&lt;p class="demo-nav-title"&gt;</code> so this page keeps a single <code>&lt;h1&gt;</code>, and opt out of sticky so they stay inside their boxes. In a real demo you usually want <code>h1</code> — pick it in the builder above.</p>

	<p class="note">Links inherit the text color with a green underline and turn green on hover, matching zachleat.com. Focus rings use the site's magenta accent — tab through to see them, and to reveal the skip link. Under 30em the links wrap to their own row.</p>
</main>

<script>
const NAV_CSS = ${JSON.stringify(navCss)};
const PROFILES = ${JSON.stringify(PROFILES)};
const DEFAULT_PROFILE = ${JSON.stringify(DEFAULT_PROFILE)};
const BUILD_DATE = ${JSON.stringify(BUILD_DATE)};
const CLASS_SUFFIXES = ${JSON.stringify(CLASS_SUFFIXES)};
const PROP_SUFFIXES = ${JSON.stringify(PROP_SUFFIXES)};

${builderJs}
</script>
</body>
</html>
`);
console.log(`index.html     ${fs.statSync("index.html").size} bytes`);
console.log(`  inline css   ${navCss.length} bytes, ultra ${ultraMinifyCss(navCss, SAMPLE_PREFIX).length} bytes at prefix "${SAMPLE_PREFIX}"`);
