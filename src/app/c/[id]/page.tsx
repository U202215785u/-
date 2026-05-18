import { Metadata } from "next";
import DetailContent from "./DetailContent";

async function getCompetition(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/competitions/${id}`, { cache: "no-store" });
    const d = await res.json();
    return d.success ? d.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await getCompetition(id);
  if (!c) return { title: "未找到" };
  return {
    title: `${c.title} - 咸鱼美术组`,
    description: c.overview || c.title,
    openGraph: {
      title: c.title,
      description: c.overview || "",
      images: c.posterUrl ? [c.posterUrl] : [],
      type: "article",
    },
  };
}

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCompetition(id);

  if (!c) {
    return (
      <div className="detail-404">
        赛事不存在或未发布
      </div>
    );
  }

  return <DetailContent competition={c} />;
}
