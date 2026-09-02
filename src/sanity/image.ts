import createImageUrlBuilder from "@sanity/image-url";
import { sanityClient } from "@/lib/sanity";

const builder = createImageUrlBuilder(sanityClient as any);

export function urlFor(source: any) {
  return builder.image(source);
}
