import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Hackathons · Superteam Brasil";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1b231d",
          padding: 72,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#f2c94c",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 6,
          }}
        >
          SUPERTEAM BRASIL
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              color: "#faf6ec",
              fontSize: 110,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            HACKATHONS
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#f2c94c",
              color: "#1b231d",
              transform: "rotate(-1deg)",
              padding: "12px 28px",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            Participe, monte seu time e submeta seu projeto
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#8fbf9f",
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          <span>hackathon.superteam.com.br</span>
          <span>construa no ecossistema Solana</span>
        </div>
      </div>
    ),
    size,
  );
}
