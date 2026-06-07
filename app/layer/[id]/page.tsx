import { layerLessons } from "../data";
import { LayerLessonView } from "./LayerLessonView";

export const dynamicParams = false;

export function generateStaticParams() {
  return layerLessons.map((l) => ({ id: l.id }));
}

export default async function LayerLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LayerLessonView id={id} />;
}
