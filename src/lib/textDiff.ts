/**
 * Line-based unified diff via LCS.
 * Pure helpers for version history preview.
 */

export type DiffOpType = 'equal' | 'add' | 'remove';

export interface DiffOp {
  type: DiffOpType;
  line: string;
}

/** Split on newlines; keep empty trailing/leading lines consistent with String.split. */
export function splitLines(text: string): string[] {
  if (text === '') return [''];
  return text.split('\n');
}

/**
 * Longest common subsequence indices for two string arrays (line tokens).
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

/**
 * Build unified line ops transforming `before` → `after`.
 * - remove: present only in before
 * - add: present only in after
 * - equal: unchanged lines
 */
export function diffLines(before: string, after: string): DiffOp[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const dp = lcsTable(a, b);

  const ops: DiffOp[] = [];
  let i = a.length;
  let j = b.length;

  // Walk back from bottom-right collecting reverse ops
  const reverse: DiffOp[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      reverse.push({ type: 'equal', line: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reverse.push({ type: 'add', line: b[j - 1] });
      j--;
    } else if (i > 0) {
      reverse.push({ type: 'remove', line: a[i - 1] });
      i--;
    }
  }

  for (let k = reverse.length - 1; k >= 0; k--) {
    ops.push(reverse[k]);
  }

  return ops;
}

/** True when there is at least one add or remove. */
export function hasDiffChanges(ops: DiffOp[]): boolean {
  return ops.some((op) => op.type === 'add' || op.type === 'remove');
}
