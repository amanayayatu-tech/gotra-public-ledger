import contentIndexJson from "../../public/content/articles/index.json";
import { contentIndexSchema, type ContentIndex, type ContentItem } from "./publicContract";

export const contentIndex: ContentIndex = contentIndexSchema.parse(contentIndexJson);

export const contentItems: ContentItem[] = contentIndex.items;

export function findContentItem(slug: string): ContentItem | null {
  return contentItems.find((item) => item.slug === slug) ?? null;
}
