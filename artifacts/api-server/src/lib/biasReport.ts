import { detectAttributes } from "./bias.js";
import type { ResumeRow } from "./store.js";

export interface CompositionBucket {
  group: string;
  count: number;
  percentage: number;
  underrepresented: boolean;
}

export interface BiasReport {
  total: number;
  ethnicity: CompositionBucket[];
  gender: CompositionBucket[];
  age: CompositionBucket[];
  underrepresented_groups: string[];
  label_distribution: { hire: number; reject: number };
  per_group_hire_rate: Array<{ group: string; axis: string; hire_rate: number; count: number }>;
}

function bucketize(items: string[]): CompositionBucket[] {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i, (counts.get(i) || 0) + 1);
  const total = items.length || 1;
  return Array.from(counts.entries())
    .map(([group, count]) => ({
      group,
      count,
      percentage: (count / total) * 100,
      underrepresented: count / total < 0.1,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildBiasReport(rows: ResumeRow[]): BiasReport {
  const enriched = rows.map((r) => ({ ...r, attrs: detectAttributes(r) }));
  const ethnicity = bucketize(enriched.map((r) => r.attrs.ethnicity));
  const gender = bucketize(enriched.map((r) => r.attrs.gender));
  const age = bucketize(enriched.map((r) => r.attrs.ageBracket));
  const underrepresented_groups: string[] = [];
  for (const b of [...ethnicity, ...gender, ...age]) {
    if (b.underrepresented) underrepresented_groups.push(b.group);
  }
  const hire = enriched.filter((r) => r.label === 1).length;
  const reject = enriched.length - hire;

  const computeHireRate = (axis: "ethnicity" | "gender" | "ageBracket") => {
    const m = new Map<string, { count: number; hires: number }>();
    for (const r of enriched) {
      const k = r.attrs[axis] as string;
      if (!m.has(k)) m.set(k, { count: 0, hires: 0 });
      const v = m.get(k)!;
      v.count++;
      if (r.label === 1) v.hires++;
    }
    return Array.from(m.entries()).map(([group, v]) => ({
      group,
      axis,
      hire_rate: v.count ? v.hires / v.count : 0,
      count: v.count,
    }));
  };
  const per_group_hire_rate = [
    ...computeHireRate("ethnicity"),
    ...computeHireRate("gender"),
    ...computeHireRate("ageBracket"),
  ];

  return {
    total: enriched.length,
    ethnicity,
    gender,
    age,
    underrepresented_groups: Array.from(new Set(underrepresented_groups)),
    label_distribution: { hire, reject },
    per_group_hire_rate,
  };
}
