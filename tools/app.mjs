/**
 * Drives the test vault in the running Obsidian through its command line
 * interface (Settings → General → Command line interface), to check the
 * theme in the real app. Every command goes to the test vault in .work/,
 * which links the theme like a real vault, never to another vault.
 *
 *   reload                     rebuilds theme.css and reloads it in the app
 *   theme light|dark           switches the color scheme
 *   view reading|live|source   switches the mode of the open note
 *   open <note>                opens a note of the test vault
 *   scroll <line|selector>     scrolls the open note to a line (both modes)
 *                              or brings an element into the middle
 *   shot [name]                takes a screenshot of the window into
 *                              .work/app/<name>.png
 *   hover <selector>|off       moves the mouse over the first visible
 *                              element that matches, for hover states
 *   variant <file.css>|off     turns a CSS file on as a snippet, to try a
 *                              variant without changing the theme
 *   compare <revision>|off     switches to the theme built from an earlier
 *                              git revision (a second theme in the vault)
 *   eval <code>                runs JavaScript in the app, prints the result
 *   rules <selector> [decls]   lists Obsidian's own rules (app.css) whose
 *                              selector matches a regex, optionally only
 *                              those whose declarations match another
 *   css                        saves app.css as the app has it into
 *                              .work/obsidian/ and prints the path, used by
 *                              tools/pdf.mjs
 *   cli <command> [key=value…] any other command, e.g. dev:css selector=…
 *
 * Usage: $ node tools/app.mjs <command> [arguments]
 */

import { execFileSync } from "child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const VAULT = "Fading Ink test";
const VAULT_DIR = join(".work", VAULT);
const THEME = "Fading Ink";
const SHOTS = ".work/app";
const APP_CSS = ".work/obsidian/app.css";

function obsidian(...args) {
  const output = execFileSync("obsidian", [`vault=${VAULT}`, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
  if (output.startsWith("The CLI is unable to find Obsidian")) {
    throw new Error(`Obsidian isn't running, open the "${VAULT}" vault`);
  }
  return output;
}

// The CLI prints results of eval after "=> " and awaits promises. It turns
// \n in values into line breaks, so the code can't use that escape
function evaluate(code) {
  return obsidian("eval", `code=${code}`).replace(/^=> ?/, "");
}

// Obsidian loads a theme asynchronously, so wait until its style element
// holds the given file (up to 5 seconds)
function waitForTheme(file) {
  const length = readFileSync(file, "utf8").length;
  const loaded = evaluate(`(async () => {
    for (let i = 0; i < 50; i++) {
      if (app.customCss.styleEl.textContent.length === ${length}) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  })()`);
  if (loaded !== "true") {
    throw new Error(`Obsidian didn't load ${file}`);
  }
}

// The note open in the main area, whatever has focus
const LEAF = "app.workspace.getMostRecentLeaf()";

const MODES = {
  reading: { mode: "preview" },
  live: { mode: "source", source: false },
  source: { mode: "source", source: true },
};

const SCHEMES = { light: "moonstone", dark: "obsidian" };

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "reload":
    execFileSync("node", ["scripts/build.mjs"], { stdio: "inherit" });
    // The theme folder is a link, so Obsidian doesn't notice the new file
    // and keeps the old one in its cache
    evaluate("app.customCss.csscache.clear(), app.customCss.reloadTheme()");
    waitForTheme("theme.css");
    break;

  case "theme":
    if (!SCHEMES[args[0]]) {
      throw new Error("theme light|dark");
    }
    evaluate(`app.changeTheme("${SCHEMES[args[0]]}")`);
    break;

  case "view":
    if (!MODES[args[0]]) {
      throw new Error("view reading|live|source");
    }
    console.log(
      evaluate(`(async (leaf) => {
        const state = leaf.getViewState();
        await leaf.setViewState({
          ...state,
          state: { ...state.state, ...${JSON.stringify(MODES[args[0]])} },
        });
        return leaf.view.getMode();
      })(${LEAF})`),
    );
    break;

  case "open":
    console.log(obsidian("open", `file=${args.join(" ")}`));
    break;

  case "scroll":
    if (/^\d+$/.test(args[0])) {
      evaluate(`${LEAF}.view.setEphemeralState({ line: ${args[0] - 1} })`);
    } else {
      console.log(
        evaluate(`(() => {
          const element = ${LEAF}.view.containerEl.querySelector(${JSON.stringify(args.join(" "))});
          element?.scrollIntoView({ block: "center" });
          return element ? "found" : "not found";
        })()`),
      );
    }
    break;

  case "shot": {
    mkdirSync(SHOTS, { recursive: true });
    const path = resolve(join(SHOTS, (args[0] ?? "shot") + ".png"));
    obsidian("dev:screenshot", `path=${path}`);
    console.log(join(SHOTS, (args[0] ?? "shot") + ".png"));
    break;
  }

  case "hover": {
    // A real mouse move through the DevTools protocol, so :hover applies
    let point = "1,1";
    if (args[0] !== "off") {
      point = evaluate(`(() => {
        const element = [...document.querySelectorAll(${JSON.stringify(args.join(" "))})]
          .find((element) => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.bottom > 0 && box.top < innerHeight;
          });
        const box = element?.getBoundingClientRect();
        return box ? Math.round(box.x + box.width / 2) + "," + Math.round(box.y + box.height / 2) : "";
      })()`);
      if (!point) {
        throw new Error("no visible element matches, scroll to it first");
      }
    }
    const [x, y] = point.split(",").map(Number);
    obsidian(
      "dev:cdp",
      "method=Input.dispatchMouseEvent",
      `params=${JSON.stringify({ type: "mouseMoved", x, y })}`,
    );
    break;
  }

  case "variant": {
    if (args[0] === "off") {
      obsidian("snippet:disable", "name=variant");
      break;
    }
    const snippets = join(VAULT_DIR, ".obsidian/snippets");
    mkdirSync(snippets, { recursive: true });
    copyFileSync(args[0], join(snippets, "variant.css"));
    // Obsidian keeps snippets in the same cache as the theme
    obsidian("snippet:disable", "name=variant");
    evaluate(
      "(async () => { app.customCss.csscache.clear(); await app.customCss.readSnippets(); })()",
    );
    obsidian("snippet:enable", "name=variant");
    break;
  }

  case "compare": {
    if (args[0] === "off" || !args[0]) {
      obsidian("theme:set", `name=${THEME}`);
      waitForTheme("theme.css");
      break;
    }
    // The revision's own sources and build script, built in .work/revisions/
    const hash = execFileSync("git", ["rev-parse", "--short", args[0]], {
      encoding: "utf8",
    }).trim();
    const build = join(".work/revisions", hash);
    mkdirSync(build, { recursive: true });
    const archive = execFileSync("git", [
      "archive",
      hash,
      "src",
      "fonts",
      "scripts",
      "manifest.json",
    ]);
    execFileSync("tar", ["-x", "-C", build], { input: archive });
    execFileSync("node", ["scripts/build.mjs"], {
      cwd: build,
      stdio: "ignore",
    });

    // Installed next to the linked theme, under its own name
    const name = `${THEME} ${hash}`;
    const folder = join(VAULT_DIR, ".obsidian/themes", name);
    mkdirSync(folder, { recursive: true });
    copyFileSync(join(build, "theme.css"), join(folder, "theme.css"));
    const manifest = JSON.parse(readFileSync(join(build, "manifest.json")));
    writeFileSync(
      join(folder, "manifest.json"),
      JSON.stringify({ ...manifest, name }, null, 4) + "\n",
    );
    evaluate("(async () => { await app.customCss.readThemes(); })()");
    console.log(obsidian("theme:set", `name=${name}`));
    waitForTheme(join(folder, "theme.css"));
    break;
  }

  case "eval":
    console.log(evaluate(args.join(" ")));
    break;

  case "rules":
    if (!args[0]) {
      throw new Error("rules <selector regex> [declarations regex]");
    }
    // Walks app.css in the app, into @media and nested rules, which are
    // printed with the conditions around them
    console.log(
      evaluate(`(() => {
        const selector = new RegExp(${JSON.stringify(args[0])});
        const declarations = new RegExp(${JSON.stringify(args[1] ?? "")});
        const sheet = [...document.styleSheets].find((sheet) =>
          sheet.href?.endsWith("/app.css"),
        );
        const found = [];
        const walk = (rules, context) => {
          for (const rule of rules) {
            const text = rule.style?.cssText ?? "";
            if (rule.selectorText && selector.test(rule.selectorText) &&
                declarations.test(text)) {
              found.push(context + rule.selectorText + " { " + text + " }");
            }
            if (rule.cssRules) {
              const condition = rule.conditionText ?? rule.selectorText;
              walk(rule.cssRules, context + (condition ? condition + " → " : ""));
            }
          }
        };
        walk(sheet.cssRules, "");
        return found.join(String.fromCharCode(10, 10));
      })()`),
    );
    break;

  case "css":
    mkdirSync(".work/obsidian", { recursive: true });
    writeFileSync(
      APP_CSS,
      evaluate(`(async () => (await fetch("app.css")).text())()`) + "\n",
    );
    console.log(APP_CSS);
    break;

  case "cli":
    console.log(obsidian(...args));
    break;

  default:
    console.error(
      "Usage: node tools/app.mjs reload | theme light|dark | view reading|live|source | open <note> | scroll <line|selector> | shot [name] | hover <selector>|off | variant <file.css>|off | compare <revision>|off | eval <code> | rules <selector> [declarations] | css | cli <command> [key=value…]",
    );
    process.exit(1);
}
