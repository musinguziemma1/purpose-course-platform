import type { JSX, ReactNode } from "react";
import { EmbeddedMedia } from "@/components/media/embedded-media";
import { parseMediaBlock, safeContentUrl } from "@/lib/content-media";

/**
 * Small, dependency-free renderer for the editorial markdown subset used by
 * Purpose Course writers: headings, paragraphs, lists, quotes, rules,
 * bold/italic emphasis, links, callouts and simple tables.
 *
 * Callouts: `:::callout text` on one line is a plain callout. When the block
 * has more lines, the first line is the callout's title and the following
 * lines are its body (`- ` and `1. ` lines become lists).
 * Tables: a block whose lines all start with `|`; the first row is the
 * header, a `|---|` separator row is optional, `\|` escapes a pipe.
 */

const TABLE_SEPARATOR = /^:?-{3,}:?$/;

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/(?<!\\)\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function renderLines(lines: string[], key: string): JSX.Element[] {
  const nodes: JSX.Element[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const ordered = /^\d+\. /.test(line);
    if (ordered || /^[-*] /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && (ordered ? /^\d+\. /.test(lines[index]) : /^[-*] /.test(lines[index]))) {
        items.push(lines[index].replace(ordered ? /^\d+\. / : /^[-*] /, ""));
        index += 1;
      }
      const List = ordered ? "ol" : "ul";
      nodes.push(
        <List key={`${key}-${index}`} className={`mt-3 space-y-2 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-[#b98a1f]`}>
          {items.map((item, itemIndex) => (
            <li key={`${key}-${index}-${itemIndex}`}>{renderInline(item, `${key}-${index}-${itemIndex}`)}</li>
          ))}
        </List>,
      );
      continue;
    }
    nodes.push(
      <p key={`${key}-${index}`} className="mt-2">
        {renderInline(line, `${key}-${index}`)}
      </p>,
    );
    index += 1;
  }
  return nodes;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-[#122a4d]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-stone-100 px-1.5 py-0.5 text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={key}
            href={safeContentUrl(link[2]) ?? undefined}
            className="font-medium text-[#122a4d] underline decoration-[#c9a227] decoration-2 underline-offset-4 [overflow-wrap:anywhere] hover:text-[#b98a1f]"
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function renderRichText(source: string): JSX.Element[] {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const output: JSX.Element[] = [];

  blocks.forEach((rawBlock, blockIndex) => {
    const block = rawBlock.trim();
    if (!block) return;
    const key = `block-${blockIndex}`;
    const media = parseMediaBlock(block);
    if (media) { output.push(<EmbeddedMedia key={key} {...media} />); return; }

    if (block.startsWith("### ")) {
      output.push(
        <h3 key={key} className="mt-9 mb-3 font-serif text-2xl tracking-tight text-[#122a4d]">
          {renderInline(block.slice(4), key)}
        </h3>,
      );
      return;
    }
    if (block.startsWith("## ")) {
      output.push(
        <h2 key={key} className="mt-11 mb-4 font-serif text-3xl tracking-tight text-[#122a4d]">
          {renderInline(block.slice(3), key)}
        </h2>,
      );
      return;
    }
    if (block.startsWith("> ")) {
      output.push(
        <blockquote
          key={key}
          className="my-8 border-l-2 border-[#c9a227] bg-[#faf6ec] px-6 py-5 font-serif text-xl leading-relaxed text-[#243b5a] italic"
        >
          {renderInline(block.replace(/^> ?/gm, ""), key)}
        </blockquote>,
      );
      return;
    }
    if (block === "---") {
      output.push(<hr key={key} className="my-10 border-stone-200" />);
      return;
    }
    if (/^[-*] /.test(block)) {
      const items = block.split("\n").filter((line) => /^[-*] /.test(line));
      output.push(
        <ul key={key} className="my-6 space-y-3 pl-1">
          {items.map((item, itemIndex) => (
            <li key={`${key}-li-${itemIndex}`} className="flex gap-3 leading-relaxed">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c9a227]" />
              <span>{renderInline(item.replace(/^[-*] /, ""), `${key}-${itemIndex}`)}</span>
            </li>
          ))}
        </ul>,
      );
      return;
    }
    if (/^\d+\. /.test(block)) {
      const items = block.split("\n").filter((line) => /^\d+\. /.test(line));
      output.push(
        <ol key={key} className="my-6 space-y-3 pl-1">
          {items.map((item, itemIndex) => (
            <li key={`${key}-li-${itemIndex}`} className="flex gap-3 leading-relaxed">
              <span className="font-serif text-sm font-semibold text-[#b98a1f]">
                {String(itemIndex + 1).padStart(2, "0")}
              </span>
              <span>{renderInline(item.replace(/^\d+\. /, ""), `${key}-${itemIndex}`)}</span>
            </li>
          ))}
        </ol>,
      );
      return;
    }
    if (block.startsWith("|") && block.split("\n").every((line) => line.trim().startsWith("|"))) {
      const rows = block.split("\n").map(tableCells).filter((cells) => !cells.every((cell) => TABLE_SEPARATOR.test(cell)));
      const [head = [], ...bodyRows] = rows;
      output.push(
        <div
          key={key}
          role="region"
          aria-label={head.join(", ") || "Table"}
          tabIndex={0}
          className="my-8 overflow-x-auto rounded-2xl border border-[#e6d9b4] [contain:inline-size] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]"
        >
          <table className={`w-full border-collapse text-left text-[15px] leading-relaxed ${head.length > 2 ? "min-w-[36rem]" : ""}`}>
            <thead className="bg-[#122a4d] text-[#fffdf8]">
              <tr>
                {head.map((cell, cellIndex) => (
                  <th key={`${key}-h-${cellIndex}`} scope="col" className="px-4 py-3 align-bottom text-[13px] font-semibold uppercase tracking-[0.08em]">
                    {renderInline(cell, `${key}-h-${cellIndex}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowIndex) => (
                <tr key={`${key}-r-${rowIndex}`} className={rowIndex % 2 ? "bg-[#faf6ec]" : "bg-white"}>
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th key={`${key}-r-${rowIndex}-${cellIndex}`} scope="row" className="px-4 py-3 align-top font-semibold text-[#122a4d]">
                        {renderInline(cell, `${key}-r-${rowIndex}-${cellIndex}`)}
                      </th>
                    ) : (
                      <td key={`${key}-r-${rowIndex}-${cellIndex}`} className="px-4 py-3 align-top text-stone-700">
                        {renderInline(cell, `${key}-r-${rowIndex}-${cellIndex}`)}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      return;
    }
    if (block.startsWith(":::callout") && block.includes("\n")) {
      const [title, ...lines] = block.replace(/^:::callout ?/, "").split("\n").map((line) => line.trim()).filter(Boolean);
      output.push(
        <aside
          key={key}
          className="my-8 rounded-2xl border border-[#e6d9b4] bg-[#faf6ec] px-6 py-5 text-[15px] leading-relaxed text-[#4a4335]"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a6a12]">{renderInline(title, `${key}-title`)}</p>
          {renderLines(lines, key)}
        </aside>,
      );
      return;
    }
    if (block.startsWith(":::callout")) {
      output.push(
        <aside
          key={key}
          className="my-8 rounded-2xl border border-[#e6d9b4] bg-[#faf6ec] px-6 py-5 text-[15px] leading-relaxed text-[#4a4335]"
        >
          {renderInline(block.replace(/^:::callout ?/, ""), key)}
        </aside>,
      );
      return;
    }

    output.push(
      <p key={key} className="my-5 text-[17px] leading-[1.85] text-stone-700">
        {renderInline(block, key)}
      </p>,
    );
  });

  return output;
}
