import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-03-24'})

const author = {
  _id: 'author-fpl-companion',
  _type: 'author',
  name: 'Derrick Egblewogbe',
  slug: {
    _type: 'slug',
    current: 'derrick-egblewogbe',
  },
  bio: [
    {
      _key: 'author-bio-1',
      _type: 'block',
      style: 'normal',
      children: [
        {
          _key: 'author-bio-span-1',
          _type: 'span',
          marks: [],
          text: 'Derrick builds tools that help Fantasy Premier League managers make sharper decisions with data, projections, and fixture analysis.',
        },
      ],
      markDefs: [],
    },
  ],
  xHandle: '@fplcompanion',
}

const categories = [
  {
    _id: 'category-gameweek-guides',
    _type: 'category',
    title: 'Gameweek Guides',
    slug: {
      _type: 'slug',
      current: 'gameweek-guides',
    },
    description: 'Weekly previews covering captaincy, chip strategy, and fixture context for the next FPL deadline.',
  },
  {
    _id: 'category-captain-picks',
    _type: 'category',
    title: 'Captain Picks',
    slug: {
      _type: 'slug',
      current: 'captain-picks',
    },
    description: 'Data-backed captain and vice-captain recommendations for each gameweek.',
  },
  {
    _id: 'category-transfer-tips',
    _type: 'category',
    title: 'Transfer Tips',
    slug: {
      _type: 'slug',
      current: 'transfer-tips',
    },
    description: 'Shortlists, differentials, and transfer plans built around expected points and fixture swings.',
  },
]

const post = {
  _id: 'post-best-fpl-captain-picks-gw1',
  _type: 'post',
  title: 'Best FPL Captain Picks for Gameweek 1',
  slug: {
    _type: 'slug',
    current: 'best-fpl-captain-picks-gameweek-1',
  },
  excerpt: 'A sample launch post for your new blog, covering how to evaluate captaincy, fixture difficulty, and high-upside transfer targets before the first deadline.',
  publishedAt: '2026-03-24T15:30:00.000Z',
  author: {
    _type: 'reference',
    _ref: 'author-fpl-companion',
  },
  categories: [
    {
      _key: 'post-cat-1',
      _type: 'reference',
      _ref: 'category-gameweek-guides',
    },
    {
      _key: 'post-cat-2',
      _type: 'reference',
      _ref: 'category-captain-picks',
    },
    {
      _key: 'post-cat-3',
      _type: 'reference',
      _ref: 'category-transfer-tips',
    },
  ],
  seoTitle: 'Best FPL Captain Picks for Gameweek 1 | FPL Companion',
  seoDescription: 'See how to choose the best FPL captain for Gameweek 1 with projected points, fixture context, and risk-reward analysis.',
  body: [
    {
      _key: 'body-1',
      _type: 'block',
      style: 'h2',
      children: [
        {
          _key: 'body-1-span-1',
          _type: 'span',
          marks: [],
          text: 'What makes a strong captaincy pick?',
        },
      ],
      markDefs: [],
    },
    {
      _key: 'body-2',
      _type: 'block',
      style: 'normal',
      children: [
        {
          _key: 'body-2-span-1',
          _type: 'span',
          marks: [],
          text: 'The best captain picks usually sit at the intersection of projected minutes, attacking role, penalty responsibility, and a fixture that gives them multiple routes to points. For launch content, this sample article shows the kind of editorial structure that works well for FPL search traffic.',
        },
      ],
      markDefs: [],
    },
    {
      _key: 'body-3',
      _type: 'block',
      style: 'h2',
      children: [
        {
          _key: 'body-3-span-1',
          _type: 'span',
          marks: [],
          text: 'How FPL Companion helps you decide',
        },
      ],
      markDefs: [],
    },
    {
      _key: 'body-4',
      _type: 'block',
      style: 'normal',
      children: [
        {
          _key: 'body-4-span-1',
          _type: 'span',
          marks: [],
          text: 'Use predicted points, compare candidate players side by side, and review fixture strength before you lock in the armband. Over time, you can publish weekly guides, differential picks, and transfer watchlists that link naturally back to your product features.',
        },
      ],
      markDefs: [],
    },
    {
      _key: 'body-5',
      _type: 'block',
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        {
          _key: 'body-5-span-1',
          _type: 'span',
          marks: [],
          text: 'Target high-minutes attackers with set-piece involvement.',
        },
      ],
      markDefs: [],
    },
    {
      _key: 'body-6',
      _type: 'block',
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        {
          _key: 'body-6-span-1',
          _type: 'span',
          marks: [],
          text: 'Favor strong home fixtures or soft defensive opponents when possible.',
        },
      ],
      markDefs: [],
    },
    {
      _key: 'body-7',
      _type: 'block',
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        {
          _key: 'body-7-span-1',
          _type: 'span',
          marks: [],
          text: 'Compare expected points with your vice-captain and transfer plans before finalizing.',
        },
      ],
      markDefs: [],
    },
  ],
}

async function run() {
  const docs: Array<Record<string, any>> = [author, ...categories, post]

  for (const doc of docs) {
    await client.createOrReplace(doc as any)
  }

  console.log('Seeded author, categories, and sample post into Sanity.')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
