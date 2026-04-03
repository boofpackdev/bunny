import pc from 'picocolors';

interface Column<T> {
  header: string;
  width: number;
  render: (item: T) => string;
}

export function printTable<T>(items: T[], columns: Column<T>[]): void {
  if (items.length === 0) {
    console.log(pc.dim('  No items'));
    return;
  }

  // Calculate column widths
  const colWidths = columns.map(col => Math.max(col.header.length, ...items.map(item => col.render(item).length)));

  // Print header
  const headerRow = columns.map((col, i) => {
    return pc.bold(pc.blue(padRight(col.header, colWidths[i])));
  }).join('  ');
  console.log(headerRow);
  console.log(pc.dim('─'.repeat(headerRow.length)));

  // Print rows
  for (const item of items) {
    const row = columns.map((col, i) => {
      return padRight(col.render(item), colWidths[i]);
    }).join('  ');
    console.log(row);
  }
}

function padRight(str: string, len: number): string {
  return str.padEnd(len);
}
