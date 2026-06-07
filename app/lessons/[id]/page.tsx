import { lessons } from "../data";
import { LessonView } from "./LessonView";

export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map((l) => ({ id: l.id }));
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LessonView id={id} />;
}
