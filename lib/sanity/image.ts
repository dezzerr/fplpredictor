import createImageUrlBuilder from '@sanity/image-url'

import {SANITY_DATASET, SANITY_PROJECT_ID} from '@/lib/sanity/client'

const builder = createImageUrlBuilder({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
})

export function urlForImage(source: any) {
  return builder.image(source)
}
