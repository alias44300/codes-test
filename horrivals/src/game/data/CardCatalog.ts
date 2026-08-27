import type { CardData } from '../types';

export class CardCatalog {
  private cards: CardData[] = [];

  async load(url = '/data/cards.json'): Promise<CardData[]> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load card catalog: ${response.status}`);
    const data = await response.json() as CardData[];
    // Final HORRIVALS illustrations are user-imported in the Android app.
    // The catalog never assumes a bundled image exists, so missing art cannot break boot.
    this.cards = data.map(card => ({ ...card, art: '' }));
    return [...this.cards];
  }

  all(): CardData[] { return [...this.cards]; }

  byId(id: string): CardData | undefined {
    return this.cards.find(c => c.id.toUpperCase() === id.toUpperCase());
  }

  defaultTeam(size = 5): CardData[] {
    return this.cards.slice(0, size);
  }
}
