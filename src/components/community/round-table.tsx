import type { CSSProperties } from "react";
import { initials } from "@/lib/utils";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const SEATS = 8;
/* Fill alternate chairs first so a part-full table looks naturally seated. */
const SEATING_ORDER = [0, 4, 2, 6, 1, 5, 3, 7];

/**
 * The community as a round table seen from above: navy felt, a polished brass
 * rim, leather chairs pulled in around it and the people who spoke most
 * recently seated as monogram coins. Empty chairs get an "open" place card.
 * Decorative; the caption beneath names the voices for everyone.
 * Styles: src/app/(site)/salon.css (sl-table-*, sl-chair, sl-seat-coin).
 */
export function RoundTable({ voices }: { voices: string[] }) {
  const seated = voices.slice(0, SEATS);
  const occupant = new Map(seated.map((name, index) => [SEATING_ORDER[index], name]));
  const open = SEATS - seated.length;
  const named = seated.map((name) => name.split(" ")[0]);
  const caption =
    named.length === 0
      ? "Every seat is open. Pull up a chair."
      : named.length <= 3
        ? `At the table: ${named.join(", ")}.`
        : `At the table: ${named.slice(0, 3).join(", ")} and ${named.length - 3} more.`;

  return (
    <figure className="mx-auto w-full max-w-[30rem]">
      <div
        className="sl-table-stage"
        role="img"
        aria-label={`An illustrated round table with ${SEATS} chairs: ${seated.length} taken by recent voices, ${open} open.`}
      >
        {Array.from({ length: SEATS }, (_, seat) => {
          const angle = `${22.5 + seat * (360 / SEATS)}deg`;
          const name = occupant.get(seat);
          return <span key={`chair-${seat}`} aria-hidden className="sl-chair" data-open={name ? undefined : ""} style={{ "--a": angle, "--i": seat } as Vars} />;
        })}
        <div aria-hidden className="sl-table-rim">
          <div className="sl-table-felt">
            <span className="sl-table-medal">
              <svg viewBox="0 0 32 32" fill="currentColor" focusable="false">
                <path d="M16 3l3.2 8.1L28 14l-8.8 2.9L16 25l-3.2-8.1L4 14l8.8-2.9L16 3z" />
              </svg>
            </span>
          </div>
        </div>
        {Array.from({ length: SEATS }, (_, seat) => {
          const angle = `${22.5 + seat * (360 / SEATS)}deg`;
          const name = occupant.get(seat);
          const style = { "--a": angle, "--i": seat } as Vars;
          return name ? (
            <span key={`seat-${seat}`} aria-hidden className="sl-coin sl-seat-coin" style={style} title={name}>
              {initials(name)}
            </span>
          ) : (
            <span key={`seat-${seat}`} aria-hidden className="sl-placecard" style={style}>
              open
            </span>
          );
        })}
      </div>
      <figcaption className="mt-5 text-center">
        <span className="sl-plate">
          {seated.length} of {SEATS} seats taken
        </span>
        <span className="mt-3 block text-[14px] text-paper/80">{caption}</span>
      </figcaption>
    </figure>
  );
}
