export function groupModules<T extends { module_title: string; module_order: number }>(
  lessons: T[],
) {
  const map = new Map<string, { title: string; order: number; lessons: T[] }>();
  for (const l of lessons) {
    const entry = map.get(l.module_title) ?? {
      title: l.module_title,
      order: l.module_order,
      lessons: [],
    };
    entry.lessons.push(l);
    map.set(l.module_title, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}
