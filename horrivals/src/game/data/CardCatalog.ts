import type { CardData } from '../types';

export class CardCatalog {
  private cards: CardData[] = [];

  async load(): Promise<CardData[]> {
    const responses = await Promise.all([fetch('/data/cards-1.json'), fetch('/data/cards-2.json')]);
    for (const response of responses) {
      if (!response.ok) throw new Error(`Unable to load card catalog: ${response.status}`);
    }
    const parts = await Promise.all(responses.map(r => r.json() as Promise<CardData[]>));
    const data = parts.flat();
    this.cards = data.map(card => ({ ...card, art: '' }));
    return [...this.cards];
  }

  all(): CardData[] { return [...this.cards]; }
  byId(id: string): CardData | undefined { return this.cards.find(c => c.id.toUpperCase() === id.toUpperCase()); }
  defaultTeam(size = 5): CardData[] { return this.cards.slice(0, size); }
}
