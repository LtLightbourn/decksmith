import { Helmet } from 'react-helmet-async'

const DEFAULT_TITLE = 'Decksmith — Commander Deck Builder for the Way You Play'
const DEFAULT_DESC =
  'Build Magic: The Gathering Commander decks tailored to your playstyle, pod, and power level. Meet Merlin — your personal deck advisor. Free to start.'

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
  ogImage?: string
  noIndex?: boolean
}

export function SEO({ title, description, canonical, ogImage, noIndex }: SEOProps) {
  const fullTitle = title ? `${title} | Decksmith` : DEFAULT_TITLE
  const fullDesc = description ?? DEFAULT_DESC

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDesc} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDesc} />
      {canonical && <meta property="og:url" content={canonical} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDesc} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  )
}
