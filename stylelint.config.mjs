/**
 * Stylelint config: the rules Obsidian uses to review themes, with one
 * exception for class names.
 */

/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-obsidianmd"],
  rules: {
    // Class names in kebab-case, as in stylelint-config-standard, except
    // CodeMirror's HyperMD- classes. Live Preview marks its lines with them
    // (HyperMD-header, HyperMD-footnote...), and some lines have no other
    // class a theme could style them by. Obsidian's config doesn't allow for
    // them, though its own styles use them
    "selector-class-pattern": [
      "^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*|HyperMD-[a-z0-9]+(?:-[a-z0-9]+)*)$",
      {
        message: (selector) =>
          `Expected class selector "${selector}" to be kebab-case (or one of CodeMirror's HyperMD- classes)`,
      },
    ],
  },
};
