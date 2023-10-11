import * as natural from 'natural';
import {Stemmer, Languages} from 'multilingual-stemmer';

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

        for (const token of ngramKey.split(' ')) {
          const stem = token.toLowerCase();
          if (!this.stemFrequency.has(stem)) {
            this.stemFrequency.set(stem, 0);
          }

          this.stemFrequency.set(stem, this.stemFrequency.get(stem)! + 1);
        }
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
      const lastNgram = sequence.slice(-this.minOrder).join(' ');
      if (!lastNgram) {
        break;
      }

      const possibleKeys = Array.from(this.ngrams.keys()).filter(ngram =>
        ngram.endsWith(lastNgram.toLowerCase())
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

  public getTokenFrequency(n: number): Map<string, number> {
    return new Map(
      Array.from(this.stemFrequency.entries())
        .filter(x => !this.stopwords.includes(x[0]))
        .filter(x => !x[0].includes('<@') && !x[0].includes('<#'))
        // eslint-disable-next-line no-control-regex
        .filter(x => /[a-zA-Z.?!:;,]+/gi.test(x[0]))
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
    );
  }

  public getNgrams(token: string, n: number) {
    return [...this.ngrams.keys()]
      .map(x => x.split(' '))
      .filter(x => x[0]?.toLowerCase() === token.toLowerCase() && x.length > 1)
      .filter(x => !this.stopwords.includes(x[1]))
      .map(x => ({
        ngram: x,
      }))
      .slice(0, n);
  }
}
