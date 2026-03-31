import { useEffect, useRef } from 'react'
import { useDeckStore } from '../store/deckStore'
import { fetchCardPrices } from '../utils/priceUtils'

export function usePriceSync() {
  const { cards, commander, setPrices, setPricesFetching, setLastPriceFetch } = useDeckStore()
  const fetchingRef = useRef(false)

  async function syncPrices(force = false) {
    if (fetchingRef.current) return
    const cardNames = [
      ...cards.map(dc => dc.card.name),
      ...(commander ? [commander.name] : []),
    ]
    if (cardNames.length === 0) return

    fetchingRef.current = true
    setPricesFetching(true)
    try {
      const fetched = await fetchCardPrices(cardNames, force)
      setPrices(fetched)
      setLastPriceFetch(Date.now())
    } finally {
      fetchingRef.current = false
      setPricesFetching(false)
    }
  }

  // Sync when deck changes — only fetch cards that aren't cached yet
  useEffect(() => {
    if (cards.length > 0 || commander) {
      syncPrices(false)
    }
  }, [cards, commander]) // eslint-disable-line react-hooks/exhaustive-deps

  return { syncPrices }
}
