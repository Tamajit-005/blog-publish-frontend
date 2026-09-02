type Block = Record<string, unknown>;
type Child = { _type: "span"; text: string; marks: string[]; _key: string };

const ALLOWED_MARKS = new Set(["strong", "em", "underline", "strike-through", "code"]);

function genKey(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function imageBlock(assetId: string, alt: string = ""): Block {
  return { _key: genKey(), _type: "image", asset: { _type: "reference", _ref: assetId }, alt };
}

function makeBlockFor(children: Child[], style: string = "normal", markDefs: unknown[] = [], extra: Record<string, unknown> = {}): Block {
  return {
    _key: genKey(),
    _type: "block",
    style,
    markDefs,
    children: children.length ? children : [{ _key: genKey(), _type: "span", text: "", marks: [] }],
    ...extra,
  };
}

// Recursive inline parser — finds earliest mark to support any nesting order
function parseInline(text: string, baseMarks: string[] = [], markDefs: unknown[] = []): Child[] {
  if (!text) return [];

  type Cand = { idx: number; handle: () => Child[] };
  const cands: Cand[] = [];

  // Link: [text](url)
  const linkIdx = text.search(/\[([^\]]+)\]\([^)]+\)/);
  if (linkIdx !== -1) {
    const m = text.slice(linkIdx).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (m) {
      cands.push({
        idx: linkIdx,
        handle: () => {
          const before = text.slice(0, linkIdx);
          const after = text.slice(linkIdx + m[0].length);
          const key = `link-${markDefs.length}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          markDefs.push({ _key: key, _type: "link", href: m[2] });
          return [
            ...parseInline(before, baseMarks, markDefs),
            ...parseInline(m[1], [...baseMarks, key], markDefs),
            ...parseInline(after, baseMarks, markDefs),
          ];
        },
      });
    }
  }

  // Strong: **text**
  const strongIdx = text.indexOf("**");
  if (strongIdx !== -1) {
    const close = text.indexOf("**", strongIdx + 2);
    if (close !== -1 && text.slice(strongIdx + 2, close).trim()) {
      cands.push({
        idx: strongIdx,
        handle: () => [
          ...parseInline(text.slice(0, strongIdx), baseMarks, markDefs),
          ...parseInline(text.slice(strongIdx + 2, close), [...baseMarks, "strong"], markDefs),
          ...parseInline(text.slice(close + 2), baseMarks, markDefs),
        ],
      });
    }
  }

  // Underline: <u>text</u>
  const uIdx = text.search(/<u>/i);
  if (uIdx !== -1) {
    const m = text.slice(uIdx).match(/^<u>([\s\S]*?)<\/u>/i);
    if (m) {
      cands.push({
        idx: uIdx,
        handle: () => [
          ...parseInline(text.slice(0, uIdx), baseMarks, markDefs),
          ...parseInline(m[1], [...baseMarks, "underline"].filter((x) => ALLOWED_MARKS.has(x)), markDefs),
          ...parseInline(text.slice(uIdx + m[0].length), baseMarks, markDefs),
        ],
      });
    }
  }

  // Strike: ~~text~~
  const strikeIdx = text.indexOf("~~");
  if (strikeIdx !== -1) {
    const close = text.indexOf("~~", strikeIdx + 2);
    if (close !== -1) {
      cands.push({
        idx: strikeIdx,
        handle: () => [
          ...parseInline(text.slice(0, strikeIdx), baseMarks, markDefs),
          ...parseInline(text.slice(strikeIdx + 2, close), [...baseMarks, "strike-through"], markDefs),
          ...parseInline(text.slice(close + 2), baseMarks, markDefs),
        ],
      });
    }
  }

  // Emphasis: _text_
  const emUnd = text.indexOf("_");
  if (emUnd !== -1) {
    const close = text.indexOf("_", emUnd + 1);
    if (close !== -1 && close > emUnd + 1) {
      const inner = text.slice(emUnd + 1, close);
      if (!inner.includes("_") && inner.trim()) {
        cands.push({
          idx: emUnd,
          handle: () => [
            ...parseInline(text.slice(0, emUnd), baseMarks, markDefs),
            ...parseInline(inner, [...baseMarks, "em"], markDefs),
            ...parseInline(text.slice(close + 1), baseMarks, markDefs),
          ],
        });
      }
    }
  }

  // Emphasis: *text* (single)
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "*" && text[i + 1] !== "*" && text[i - 1] !== "*") {
      const close = text.indexOf("*", i + 1);
      if (close !== -1 && text[close + 1] !== "*" && text[close - 1] !== "*") {
        const inner = text.slice(i + 1, close);
        if (inner.trim() && !inner.includes("*")) {
          cands.push({
            idx: i,
            handle: () => [
              ...parseInline(text.slice(0, i), baseMarks, markDefs),
              ...parseInline(inner, [...baseMarks, "em"], markDefs),
              ...parseInline(text.slice(close + 1), baseMarks, markDefs),
            ],
          });
          break;
        }
      }
      break;
    }
  }

  // Inline code: `text`
  const codeIdx = text.indexOf("`");
  if (codeIdx !== -1) {
    const close = text.indexOf("`", codeIdx + 1);
    if (close !== -1) {
      cands.push({
        idx: codeIdx,
        handle: () => [
          ...parseInline(text.slice(0, codeIdx), baseMarks, markDefs),
          ...parseInline(text.slice(codeIdx + 1, close), [...baseMarks, "code"], markDefs),
          ...parseInline(text.slice(close + 1), baseMarks, markDefs),
        ],
      });
    }
  }

  if (cands.length) {
    cands.sort((a, b) => a.idx - b.idx);
    return cands[0].handle();
  }

  return [{ _key: genKey(), _type: "span", text, marks: [...baseMarks] }];
}

export function markdownToBlocks(content: string, inlineAssetMap: Map<string, string>): Block[] {
  if (!content?.trim()) return [];

  const blocks: Block[] = [];
  const lines = content.split("\n");
  let paragraph: string[] = [];
  let listType: "bullet" | "number" | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) return;
    const raw = paragraph.join("\n").trim();
    if (raw) {
      const markDefs: unknown[] = [];
      const children = parseInline(raw, [], markDefs);
      blocks.push(makeBlockFor(children, "normal", markDefs));
    }
    paragraph = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // — Inline image placeholders (Strapi writer format):  ![image-1]  or  ![alt](placeholder)
    // Trimmed is exactly ![...]  without url, or ![alt](url) where url == placeholder key
    if (trimmed.startsWith("![")) {
      // Case 1: ![image-1]  (no parens) — whole line is the placeholder key
      if (/^!\[([^\]]*)\]$/.test(trimmed)) {
        const assetId = inlineAssetMap.get(trimmed) || inlineAssetMap.get(trimmed.slice(2, -1));
        if (assetId) {
          flushParagraph();
          const alt = trimmed.slice(2, -1).startsWith("image-") ? "" : trimmed.slice(2, -1);
          blocks.push(imageBlock(assetId, alt));
          continue;
        }
      }
      // Case 2: ![alt](placeholder/url)
      const imgParen = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgParen) {
        const placeholder = imgParen[2];
        const assetId =
          inlineAssetMap.get(placeholder) ||
          inlineAssetMap.get(imgParen[0]) ||
          inlineAssetMap.get(trimmed);
        if (assetId) {
          flushParagraph();
          blocks.push(imageBlock(assetId, imgParen[1]));
          continue;
        }
        // unresolved ![alt](url) that is not a placeholder — keep as image block if asset missing? treat as text
      }
    }

    // Heading: # .. ######
    const hm = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (hm) {
      flushParagraph();
      const level = hm[1].length;
      const markDefs: unknown[] = [];
      const children = parseInline(hm[2].trim(), [], markDefs);
      blocks.push(makeBlockFor(children, `h${Math.min(level, 6)}`, markDefs));
      continue;
    }

    // Blockquote: > text
    if (trimmed.startsWith("> ")) {
      flushParagraph();
      const markDefs: unknown[] = [];
      const children = parseInline(trimmed.slice(2).trim(), [], markDefs);
      blocks.push(makeBlockFor(children, "blockquote", markDefs));
      continue;
    }

    // Code fence: ```lang  ... ```
    if (trimmed.startsWith("```")) {
      flushParagraph();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ _key: genKey(), _type: "code", code: codeLines.join("\n") });
      continue;
    }

    // Horizontal rule: --- or ***
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push(makeBlockFor([{ _key: genKey(), _type: "span", text: "—", marks: [] }], "normal"));
      continue;
    }

    // Lists: - item  or  * item  or  1. item  → each item is its own block
    const bullet = trimmed.match(/^[-*]\s+(.*)/);
    const ordered = trimmed.match(/^\d+\.\s+(.*)/);
    if (bullet || ordered) {
      flushParagraph();
      const isBullet = !!bullet;
      const text = (isBullet ? bullet![1] : ordered![1]).trim();
      const markDefs: unknown[] = [];
      const children = parseInline(text, [], markDefs);
      blocks.push(makeBlockFor(children, "normal", markDefs, { listItem: isBullet ? "bullet" : "number", level: 1 }));
      continue;
    }

    // Regular line — accumulate
    // If we were in a list, this non-list line ends the list
    if (listType) flushParagraph();
    paragraph.push(raw);
  }

  flushParagraph();
  return blocks;
}
