/**
 * Word-level (and line-level) unified diff via LCS.
 * Pure helpers for version history preview.
 */

export type DiffOpType = 'equal' | 'add' | 'remove';

export interface DiffOp {
  type: DiffOpType;
  /** Token or merged run of tokens */
  text: string;
}

/**
 * Split into words and whitespace so inline edits stay granular
 * while newlines/spaces are preserved for layout.
 */
export function tokenizeWords(text: string): string[] {
  if (text === '') return [];
  return text.match(/\S+|\s+/g) ?? [];
}

/** Split on newlines; keep empty trailing/leading lines consistent with String.split. */
export function splitLines(text: string): string[] {
  if (text === '') return [''];
  return text.split('\n');
}

/**
 * Longest common subsequence DP for two string arrays.
 * O(n*m) time/space — fine for prompt-sized texts.
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array<number>(m + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/** Merge consecutive ops of the same type into one run (cleaner render / copy). */
export function mergeOps(ops: DiffOp[]): DiffOp[] {
  const out: DiffOp[] = [];
  for (const op of ops) {
    const last = out[out.length - 1];
    if (last && last.type === op.type) {
      last.text += op.text;
    } else {
      out.push({ type: op.type, text: op.text });
    }
  }
  return out;
}

function diffTokens(a: string[], b: string[]): DiffOp[] {
  const dp = lcsTable(a, b);
  const reverse: DiffOp[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      reverse.push({ type: 'equal', text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reverse.push({ type: 'add', text: b[j - 1] });
      j--;
    } else if (i > 0) {
      reverse.push({ type: 'remove', text: a[i - 1] });
      i--;
    }
  }

  const ops: DiffOp[] = [];
  for (let k = reverse.length - 1; k >= 0; k--) {
    ops.push(reverse[k]);
  }
  return mergeOps(ops);
}

/**
 * Word-level unified ops transforming `before` → `after`.
 * Prefer this for prompt edits (usually a few words, not whole lines).
 */
export function diffWords(before: string, after: string): DiffOp[] {
  return diffTokens(tokenizeWords(before), tokenizeWords(after));
}

/**
 * Line-level unified ops (kept for coarse comparisons / tests).
 * Each line token keeps its trailing newline so merges stay readable.
 */
export function diffLines(before: string, after: string): DiffOp[] {
  const toLineTokens = (text: string): string[] => {
    const lines = splitLines(text);
    return lines.map((line, i) => (i < lines.length - 1 ? `${line}\n` : line));
  };
  return diffTokens(toLineTokens(before), toLineTokens(after));
}

/** True when there is at least one add or remove. */
export function hasDiffChanges(ops: DiffOp[]): boolean {
  return ops.some((op) => op.type === 'add' || op.type === 'remove');
}
