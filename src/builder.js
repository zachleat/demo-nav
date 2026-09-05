const AVATAR = "https://v1.indieweb-avatar.11ty.dev/";
	const HOME = "https://www.zachleat.com/";
	const PROJECTS = "https://www.zachleat.com/projects/";
	// npmjs.com blocks the avatar service, so read npm's mark from the docs site.
	const NPM_ICON = "https://docs.npmjs.com/";

	let form = document.getElementById("nav-form");
	let preview = document.getElementById("preview");
	let output = document.getElementById("output");
	let ultraStyle = document.getElementById("ultra-css");
	let outputSize = document.getElementById("output-size");
	let profileSelect = document.getElementById("f-profile");
	let homeUrlField = document.getElementById("f-home-url");
	let encoder = new TextEncoder();

	// Bump this when fields are added or their defaults change, so state saved
	// by an older build can't restore itself over the new defaults.
	const STORAGE_KEY = "zachleat-demo-nav-builder-5";

	// Read and write every named field generically, so adding a field to the
	// form is enough — nothing here needs to know the field names.
	function formValues() {
		let values = {};
		for(let element of form.elements) {
			if(element.name) {
				values[element.name] = element.type === "checkbox" ? element.checked : element.value;
			}
		}
		return values;
	}

	function applyValues(values) {
		for(let element of form.elements) {
			if(!element.name || !(element.name in values)) {
				continue;
			}
			if(element.type === "checkbox") {
				element.checked = Boolean(values[element.name]);
			} else {
				element.value = values[element.name];
			}
		}
	}

	// Storage can throw outright in private windows, so every call is guarded.
	function save() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(formValues()));
		} catch(e) {}
	}

	function restore() {
		try {
			let saved = localStorage.getItem(STORAGE_KEY);
			if(saved) {
				applyValues(JSON.parse(saved));
			}
		} catch(e) {}
	}

	// Longest key first, so --demo-nav-bg-solid is never clipped to
	// --demo-nav-bg, nor demo-nav-description to demo-nav.
	function byLengthDesc(pairs) {
		return Object.entries(pairs).sort((a, b) => b[0].length - a[0].length);
	}

	const CLASS_PAIRS = byLengthDesc(CLASS_SUFFIXES);
	const PROP_PAIRS = byLengthDesc(PROP_SUFFIXES);

	// An empty prefix means no renaming at all. Anything else is trimmed down
	// to something unambiguously usable as both a class name and a custom
	// property fragment: letters, digits, dash and underscore, starting with a
	// letter or underscore. A leading dash would otherwise give ----name-bg.
	function safePrefix(value) {
		return (value || "")
			.replace(/[^a-zA-Z0-9_-]/g, "")
			.replace(/^[^a-zA-Z_]+/, "");
	}

	function ultraCss(prefix) {
		let css = NAV_CSS;
		for(let [ from, to ] of PROP_PAIRS) {
			css = css.split(from).join("--" + prefix + to);
		}
		for(let [ from, to ] of CLASS_PAIRS) {
			css = css.split("." + from).join("." + prefix + to);
		}
		return css;
	}

	// Class names are mapped through here rather than string-replaced over the
	// finished markup, which would also rewrite a URL that happens to contain
	// "demo-nav" — this repo's own source link, for one.
	let classPrefix = "";

	function c(name) {
		return classPrefix ? classPrefix + CLASS_SUFFIXES[name] : name;
	}

	// The home link text is a template: {name} stands in for the profile name, and
	// everything around it is muted.
	function homeText(profile, template) {
		let text = template || "{name} Demo";
		if(!text.includes("{name}")) {
			return escapeHtml(text);
		}
		return text
			.split("{name}")
			.map(part => part ? `<span class="${c("demo-nav-suffix")}">${escapeHtml(part)}</span>` : "")
			.join(escapeHtml(profile.label));
	}

	function profileFor(key) {
		return PROFILES[key] || PROFILES[DEFAULT_PROFILE];
	}

	// Picking a profile fills in the home URL, which stays editable after.
	function syncHomeUrl() {
		homeUrlField.value = profileFor(profileSelect.value).home;
	}

	function comments(profile) {
		return [ `<!-- ${profile.label} nav (${BUILD_DATE}) -->`,
			`<!-- /${profile.label} nav -->` ];
	}

	function prop(name) {
		return classPrefix ? "--" + classPrefix + PROP_SUFFIXES[name] : name;
	}

	function escapeHtml(str) {
		return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	}

	function icon(url, size, useIcons, iconUrl) {
		if(!useIcons) {
			return "";
		}
		let src = AVATAR + encodeURIComponent(iconUrl || url) + "/";
		return `<img class="${c("demo-nav-icon")}" src="${src}" alt="" width="${size}" height="${size}" decoding="async">`;
	}

	function buildNav(data) {
		let icons = data.icons;
		let profile = profileFor(data.profile);
		let home = data.homeUrl || profile.home;
		let lines = [];
		let style = data.radius ? ` style="${prop("--demo-nav-icon-radius")}:${data.radius}"` : "";
		lines.push(`<header class="${c("demo-nav")}${data.sticky ? "" : " " + c("demo-nav-static")}"${style}>`);

		if(data.skip) {
			lines.push(`\t<a class="${c("demo-nav-skip")}" href="#demo">Skip to the demo</a>`);
		}

		lines.push(`\t<a class="${c("demo-nav-home")}" href="${escapeHtml(home)}">`);
		if(icons) {
			lines.push(`\t\t${icon(home, 48, icons)}`);
		}
		lines.push(`\t\t<span>${homeText(profile, data.homeText)}</span>`);
		lines.push(`\t</a>`);

		if(data.title) {
			lines.push(`\t<div class="${c("demo-nav-heading")}">`);
			lines.push(`\t\t<${data.heading} class="${c("demo-nav-title")}">${escapeHtml(data.title)}</${data.heading}>`);
			if(data.description) {
				lines.push(`\t\t<p class="${c("demo-nav-description")}">${escapeHtml(data.description)}</p>`);
			}
			lines.push(`\t</div>`);
		}

		let links = [];
		if(data.demo) {
			links.push([ escapeHtml(data.demoLabel || "Demo"), data.demo, null ]);
		}
		if(data.source) {
			links.push([ escapeHtml(data.sourceLabel || "Source"), data.source, null ]);
		}
		if(data.npm) {
			let pkg = escapeHtml(data.npm);
			links.push([ `<code class="${c("demo-nav-code")}">${pkg}</code> on npm`, `https://www.npmjs.com/package/${encodeURIComponent(data.npm)}`, NPM_ICON ]);
			links.push([ "npmx", `https://npmx.dev/package/${encodeURIComponent(data.npm)}`, null ]);
		}
		if(data.post) {
			links.push([ escapeHtml(data.postLabel || "Blog post"), data.post, null ]);
		}
		links.push([ profile.trailingLabel, profile.trailingUrl, null ]);

		lines.push(`\t<nav class="${c("demo-nav-links")}" aria-label="Demo links">`);
		for(let [ label, url, iconUrl ] of links) {
			lines.push(`\t\t<a href="${escapeHtml(url)}">${icon(url, 24, icons, iconUrl)}${label}</a>`);
		}
		lines.push(`\t</nav>`);
		lines.push(`</header>`);

		return lines.join("\n");
	}

	function render() {
		let form_data = new FormData(form);
		let data = {
			profile: form_data.get("profile"),
			homeUrl: (form_data.get("homeUrl") || "").trim(),
			homeText: form_data.get("homeText") || "",
			title: (form_data.get("title") || "").trim(),
			description: (form_data.get("description") || "").trim(),
			heading: form_data.get("heading"),
			demo: (form_data.get("demo") || "").trim(),
			demoLabel: (form_data.get("demoLabel") || "").trim(),
			source: (form_data.get("source") || "").trim(),
			sourceLabel: (form_data.get("sourceLabel") || "").trim(),
			npm: (form_data.get("npm") || "").trim(),
			post: (form_data.get("post") || "").trim(),
			postLabel: (form_data.get("postLabel") || "").trim(),
			icons: form_data.get("icons") === "on",
			skip: form_data.get("skip") === "on",
			sticky: form_data.get("sticky") === "on",
			radius: form_data.get("radius") || "",
			prefix: safePrefix(form_data.get("prefix"))
		};

		classPrefix = data.prefix;

		let markup = buildNav(data);
		preview.innerHTML = markup;

		// The paste always carries its own styles: one block, nothing to link.
		let css = data.prefix ? ultraCss(data.prefix) : NAV_CSS;

		// The page's own copy of the stylesheet uses the long class names, so
		// the preview needs the renamed one alongside it to render at all.
		ultraStyle.textContent = data.prefix ? css : "";

		let [ commentStart, commentEnd ] = comments(profileFor(data.profile));
		let full = commentStart + "\n<style>\n" + css + "\n</style>\n" + markup + "\n" + commentEnd;
		output.textContent = full;
		// Bytes, not characters — the banner comment has an em dash in it.
		outputSize.textContent = encoder.encode(full).length.toLocaleString() + " bytes";
	}

	// Attached to the select, so it runs before the form's own input handler
	// and render() sees the new URL.
	profileSelect.addEventListener("input", syncHomeUrl);

	form.addEventListener("input", function() {
		save();
		render();
	});

	// A plain type="reset" button does the reverting; this just clears the
	// saved copy and redraws. The reset event fires before the fields revert,
	// so the redraw waits a tick.
	form.addEventListener("reset", function() {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch(e) {}

		setTimeout(function() {
			syncHomeUrl();
			render();
		}, 0);
	});

	restore();
	if(!homeUrlField.value) {
		syncHomeUrl();
	}
	render();

	document.addEventListener("click", async function(event) {
		let button = event.target.closest(".copy");
		if(!button) {
			return;
		}

		let code = button.closest(".snippet").querySelector("code");
		try {
			await navigator.clipboard.writeText(code.textContent);
			button.textContent = "Copied";
		} catch(e) {
			// Clipboard access can be denied (or missing on http:), so select it instead.
			let range = document.createRange();
			range.selectNodeContents(code);
			let selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange(range);
			button.textContent = "Press Ctrl/Cmd C";
		}

		setTimeout(function() {
			button.textContent = "Copy";
		}, 2000);
	});
