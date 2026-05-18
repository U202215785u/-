import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--canvas)" }}
    >
      <div className="text-center px-5">
        <p
          className="uppercase mb-6"
          style={{
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: "0.54px",
            fontFamily: "monospace",
            color: "rgba(0,0,0,0.35)",
          }}
        >
          404
        </p>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 540,
            lineHeight: 1.35,
            letterSpacing: "-0.26px",
            marginBottom: 12,
          }}
        >
          页面未找到
        </h1>
        <p
          style={{
            fontSize: 18,
            fontWeight: 320,
            letterSpacing: "-0.26px",
            color: "rgba(0,0,0,0.55)",
            marginBottom: 32,
          }}
        >
          你访问的页面不存在或已被移除
        </p>
        <Link href="/" className="btn-primary">
          返回首页
        </Link>
      </div>
    </div>
  );
}
