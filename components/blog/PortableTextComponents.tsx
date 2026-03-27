import type {PortableTextComponents} from '@portabletext/react'
import Image from 'next/image'

import {urlForImage} from '@/lib/sanity/image'

export const portableTextComponents: PortableTextComponents = {
  block: {
    h2: ({children}) => <h2 className="mt-10 text-2xl font-semibold text-slate-900">{children}</h2>,
    h3: ({children}) => <h3 className="mt-8 text-xl font-semibold text-slate-900">{children}</h3>,
    normal: ({children}) => <p className="mt-5 text-base leading-8 text-slate-600">{children}</p>,
    blockquote: ({children}) => <blockquote className="mt-6 border-l-2 border-fuchsia-500 pl-4 text-slate-700 italic">{children}</blockquote>,
  },
  list: {
    bullet: ({children}) => <ul className="mt-5 space-y-3 pl-5 text-slate-600">{children}</ul>,
    number: ({children}) => <ol className="mt-5 space-y-3 pl-5 text-slate-600">{children}</ol>,
  },
  listItem: {
    bullet: ({children}) => <li className="list-disc">{children}</li>,
    number: ({children}) => <li className="list-decimal">{children}</li>,
  },
  marks: {
    link: ({children, value}) => {
      const href = value?.href || '#'
      const external = href.startsWith('http')

      if (external) {
        return (
          <a href={href} target="_blank" rel="noreferrer" className="text-fuchsia-600 underline underline-offset-4 hover:text-fuchsia-500">
            {children}
          </a>
        )
      }

      return (
        <a href={href} className="text-fuchsia-600 underline underline-offset-4 hover:text-fuchsia-500">
          {children}
        </a>
      )
    },
  },
  types: {
    image: ({value}: any) => {
      if (!value?.asset) {
        return null
      }

      const src = urlForImage(value).width(1600).height(900).fit('max').auto('format').url()

      return (
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Image
            src={src}
            alt={value.alt || 'Blog image'}
            width={1600}
            height={900}
            className="h-auto w-full object-cover"
          />
        </div>
      )
    },
  },
}
