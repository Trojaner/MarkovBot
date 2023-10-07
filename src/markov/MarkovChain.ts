import * as natural from 'natural';
import * as snb from 'node-snowball';

export class MarkovChain {
  private minOrder: number;
  private maxOrder: number;
  private ngrams: Map<string, string[]>;
  private stemFrequency: Map<string, number>;
  private stopwords: string[];
  private tokenizer: natural.WordTokenizer;

  constructor({
    minOrder,
    maxOrder,
    stopwords,
    tokenizer,
  }: {
    minOrder: number;
    maxOrder: number;
    stopwords: string[];
    tokenizer: natural.WordTokenizer;
  }) {
    this.minOrder = minOrder;
    this.maxOrder = maxOrder;
    this.ngrams = new Map();
    this.stemFrequency = new Map();
    this.stopwords = stopwords;
    this.tokenizer = tokenizer;
  }

  public addToCorpus(text: string): void {
    const tokens = this.tokenizer.tokenize(text)!;

    for (let order = this.minOrder; order <= this.maxOrder; order++) {
      for (let i = 0; i <= tokens.length - order; i++) {
        const ngram = tokens.slice(i, i + order).join(' ');
        const nextToken = tokens[i + order];

        const ngramKey = ngram.toLowerCase();

        if (!this.ngrams.has(ngramKey)) {
          this.ngrams.set(ngramKey, []);
        }

        this.ngrams.get(ngramKey)!.push(nextToken);

        if (this.stopwords.includes(ngramKey)) {
          continue;
        }

        const stem = snb.stemword(ngram, 'turkish').toLowerCase();
        if (!this.stemFrequency.has(stem)) {
          this.stemFrequency.set(stem, 0);
        }

        this.stemFrequency.set(stem, this.stemFrequency.get(stem)! + 1);
      }
    }
  }

  public randomStartToken(): string {
    const possibleStartTokens = Array.from(this.ngrams.keys()).filter(
      ngram => !this.stopwords.includes(ngram)
    );

    return possibleStartTokens[
      Math.floor(Math.random() * possibleStartTokens.length)
    ].split(' ')[0];
  }

  public randomSequence(
    start: string,
    until: (s: string[]) => boolean
  ): string[] {
    const sequence: string[] = [start];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const lastNgram = sequence.slice(-1).join(' ');
      if (!lastNgram) {
        break;
      }

      const possibleKeys = Array.from(this.ngrams.keys()).filter(ngram =>
        ngram.startsWith(lastNgram.toLowerCase())
      );

      const possibleNextTokens = possibleKeys
        .map(key => this.ngrams.get(key)!)
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

  public getMostFrequentStemmedTokens(n: number): Map<string, number> {
    return new Map(
      Array.from(this.stemFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
    );
  }
}
