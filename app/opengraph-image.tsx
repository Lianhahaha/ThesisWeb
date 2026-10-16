import { ImageResponse } from "next/og";
import { SOURCE_COUNT } from "@/lib/sources/meta";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * The picture shown when a Thesisweb link is shared on Messenger, Facebook,
 * X, Discord and the like. Rendered once at build time in the site's own
 * colours and serif, flat, no gradients.
 */
export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1c1b18";
const MUTED = "#4a473f";
const CREAM = "#fdfcf0";
const CARD = "#fffffa";
const HAIRLINE = "#ccc8b4";
const LAVENDER = "#684c96";
const LAVENDER_FILL = "#ede1fc";

const EYEBROW = "RELATED LITERATURE, FOUND FASTER";
const SUBLINE = `One search across ${SOURCE_COUNT} free academic databases.`;
const TAGS = ["Philippine theses and journals", "APA · MLA · IEEE · Chicago", "Free, no sign-up"];

/**
 * EB Garamond, cut down to the letters on the card. Google serves TrueType
 * to a request without a browser user agent, which is what the renderer
 * reads. Without the network the card still renders in the default font.
 */
async function garamond(style: "normal" | "italic", text: string): Promise<ArrayBuffer | null> {
  const family = style === "italic" ? "EB+Garamond:ital,wght@1,500" : "EB+Garamond:wght@500";
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`)
    ).text();
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [regular, italic] = await Promise.all([
    garamond("normal", [SITE_NAME, EYEBROW, "Research,", SUBLINE, ...TAGS].join("")),
    garamond("italic", "simplified."),
  ]);
  const fonts = [
    ...(regular ? [{ name: "Garamond", data: regular, style: "normal" as const, weight: 500 as const }] : []),
    ...(italic ? [{ name: "Garamond", data: italic, style: "italic" as const, weight: 500 as const }] : []),
  ];
  const serif = fonts.length ? "Garamond" : "serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 40,
          background: CREAM,
          color: INK,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 64px",
            background: CARD,
            border: `2px solid ${HAIRLINE}`,
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: serif, fontSize: 40 }}>{SITE_NAME}</span>
            <span style={{ fontFamily: serif, fontSize: 22, letterSpacing: 3, color: LAVENDER }}>{EYEBROW}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: serif, fontSize: 104, lineHeight: 1.05 }}>
              <span>Research,&nbsp;</span>
              <span style={{ fontStyle: "italic", color: LAVENDER }}>simplified.</span>
            </div>
            <span style={{ marginTop: 18, fontFamily: serif, fontSize: 40, color: MUTED }}>{SUBLINE}</span>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {TAGS.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "10px 18px",
                  fontFamily: serif,
                  fontSize: 26,
                  color: LAVENDER,
                  background: LAVENDER_FILL,
                  borderRadius: 6,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
