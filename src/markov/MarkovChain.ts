import * as natural from 'natural';

export class MarkovChain {
  private minOrder: number;
  private maxOrder: number;
  private ngrams: Map<string, Set<string>>;
  private stemFrequency: Map<string, number>;
  private stopwords: string[];
  private tokenizer: natural.RegexpTokenizer;

  constructor({
    minOrder,
    maxOrder,
    stopwords,
    tokenizer,
  }: {
    minOrder: number;
    maxOrder: number;
    stopwords: string[];
    tokenizer: natural.RegexpTokenizer;
  }) {
    this.minOrder = minOrder;
    this.maxOrder = maxOrder;
    this.ngrams = new Map();
    this.stemFrequency = new Map();
    this.stopwords = stopwords;
    this.tokenizer = tokenizer;
  }

  public addToCorpus(text: string): void {
    const tokens = this.tokenizer
      .tokenize(text)!
      .map((x) => x?.trim())
      .filter((x) => x && x.length > 0);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const stem = token.toLowerCase();
      if (!this.stemFrequency.has(stem)) {
        this.stemFrequency.set(stem, 0);
      }

      this.stemFrequency.set(stem, this.stemFrequency.get(stem)! + 1);

      for (let j = i + 1; j < tokens.length; j++) {
        if (j - i < this.minOrder) {
          continue;
        }

        if (j - i >= this.maxOrder) {
          break;
        }
        
        const ngram = tokens.slice(i, j);

        let ngramKey = ngram.join(' ');
        let ngramValue = tokens[j];

        if (!this.ngrams.has(ngramKey)) {
          this.ngrams.set(ngramKey, new Set());
        }

        this.ngrams.get(ngramKey)!.add(ngramValue);
      }
    }
  }

  public randomStartToken(): string {
    const possibleStartTokens = Array.from(this.ngrams.keys());

    return possibleStartTokens[
      Math.floor(Math.random() * possibleStartTokens.length)
    ].split(' ')[0];
  }

  public randomSequence(
    start: string,
    until: (s: string[]) => boolean,
  ): string[] {
    const sequence: string[] = [start];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const lastNgram = sequence.slice(-1).join(' ');
      if (!lastNgram) {
        break;
      }

      const possibleKeys = Array.from(this.ngrams.keys()).filter((ngram) =>
        ngram.endsWith(lastNgram.toLowerCase()),
      );

      const possibleNextTokens = possibleKeys
        .map((key) => [...this.ngrams.get(key)!])
        .flat();

      if (!possibleNextTokens || possibleNextTokens.length === 0) {
        break;
      }

      const nextToken =
        possibleNextTokens[
          Math.floor(Math.random() * possibleNextTokens.length)
        ];
      sequence.push(nextToken);

      if (until(sequence)) {
        break;
      }
    }

    return sequence;
  }

  public getTopNgramFrequency(
    n: number,
    includeToken?: string,
  ): Map<string, number> {
    const sortedNGrams = Array.from(this.ngrams.keys()).sort((a, b) => {
      return this.ngrams.get(b)!.size - this.ngrams.get(a)!.size;
    });

    const topNGramFrequency: Map<string, number> = new Map();

    for (let i = 0; i < sortedNGrams.length; i++) {
      const ngramKey = sortedNGrams[i];

      if (
        includeToken &&
        !ngramKey.toLowerCase().includes(includeToken.toLowerCase())
      ) {
        continue;
      }

      if (!this.stopwords.includes(ngramKey.toLowerCase())) {
        topNGramFrequency.set(ngramKey, this.ngrams.get(ngramKey)!.size);
      }

      if (topNGramFrequency.size >= n) {
        break;
      }
    }

    return topNGramFrequency;
  }
}
