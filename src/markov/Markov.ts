// based on: https://github.com/seleb/markov-multi-order/

type Next = {
  next: Ngram;
  occurrences: number;
};

class Ngram {
  string: string[];
  order: number;
  occurrences: number = 0;
  next: Record<string, Next> = {};
  thresholds: {
    next: Next;
    p: number;
  }[] = [];
  start = false;

  constructor(string: string[], order: number) {
    this.string = string;
    this.order = order;
  }

  getNext() {
    const thresholds = this.thresholds.filter(x => x?.next.next != null);
    if (thresholds.length == 0) {
      return '';
    }

    const idx = Math.floor(Math.random() * thresholds.length);
    const t = thresholds[idx];
    return t.next.next.string[t.next.next.string.length - 1];
  }
}

function sort({p: a}: {p: number}, {p: b}: {p: number}) {
  return a - b;
}

export class Markov {
  delimiter: string;
  source: string[];
  ngrams: Record<string, Ngram>;
  minOrder: number;
  maxOrder: number;
  keys: string[];
  startKeys: string[];

  constructor(options: {
    delimiter: string;
    source: string | string[];
    minOrder: number;
    maxOrder: number;
  }) {
    this.delimiter = options.delimiter || '';
    this.source = Array.isArray(options.source)
      ? options.source
      : [options.source];
    this.ngrams = {};
    this.minOrder = isNaN(options.minOrder) ? 2 : options.minOrder;
    this.maxOrder = isNaN(options.maxOrder) ? 4 : options.maxOrder;

    for (let source = 0; source < this.source.length; ++source) {
      const m = this.source[source];
      if (!m || Markov.normalize(m).length == 0) {
        continue;
      }

      const s = m.split(this.delimiter);

      for (let o = this.minOrder; o <= this.maxOrder; ++o) {
        let prev;
        for (let i = 0; i < s.length - o + 1; ++i) {
          let w = s.slice(i, i + o);
          if (w.length == 0) {
            continue;
          }

          const hash = Markov.normalize(w.join(this.delimiter));
          const ngram = (this.ngrams[hash] =
            this.ngrams[hash] || new Ngram(w, o));
          ngram.occurrences += 1;
          if (i === 0) {
            ngram.start = true;
          }

          if (prev) {
            if (!ngram.string) {
              continue;
            }

            const c = ngram.string[ngram.string.length - 1];
            const next = (prev.next[c] = prev.next[c] || {
              next: ngram,
              occurrences: 0,
            });
            next.occurrences += 1;
          }

          prev = ngram;
        }
      }
    }

    for (const n in this.ngrams) {
      if (this.ngrams.hasOwnProperty(n)) {
        const ngram = this.ngrams[n];
        ngram.thresholds = [];
        for (const i in ngram.next) {
          if (ngram.next.hasOwnProperty(i)) {
            const next = ngram.next[i];
            ngram.thresholds.push({
              next: next,
              p: next.occurrences / ngram.occurrences,
            });
          }
        }
        ngram.thresholds.sort(sort);
        let t = 0;
        for (let i = 0; i < ngram.thresholds.length; ++i) {
          t += ngram.thresholds[i].p;
          ngram.thresholds[i].p = t;
        }
      }
    }

    this.keys = Object.keys(this.ngrams);
    this.startKeys = [];

    for (let i = 0; i < this.keys.length; ++i) {
      const k = this.keys[i];
      if (this.ngrams[k].start === true) {
        this.startKeys.push(k);
      }
    }
  }

  randomNgram() {
    return this.ngrams[this.keys[Math.floor(Math.random() * this.keys.length)]];
  }

  randomStartNgram() {
    return this.ngrams[
      this.startKeys[Math.floor(Math.random() * this.startKeys.length)]
    ];
  }

  randomSequence(start: string, until: (s: string[]) => boolean) {
    let s = start
      ? start.split(this.delimiter)
      : this.randomStartNgram().string;

    const orders: number[] = [];
    let n: Ngram, o: number, hash: string;

    for (let i = this.minOrder; i <= this.maxOrder; ++i) {
      orders.push(i);
    }

    while (!until(s)) {
      const orderAttempts = orders.slice();

      do {
        o = Math.floor(Math.random() * orderAttempts.length);
        o = orderAttempts.splice(o, 1)[0];
        hash = Markov.normalize(s.slice(-o).join(this.delimiter));
        n = this.ngrams[hash];
      } while (!n && orderAttempts.length > 0);

      if (!n) {
        console.warn('No ngram for', s.slice(-this.maxOrder));
        s = s.concat('\0');
      } else {
        let next = n.getNext();
        if (!next) {
          console.warn('No next for ', n);
          next = '\0';
        }
        s = s.concat(next);
      }
    }

    return s.join(this.delimiter);
  }

  static normalize = (str: string) => {
    return str
      .replace(/\s{2,}/g, ' ')
      .replace(/(\'\")/g, '')
      .trim();
  };
}
