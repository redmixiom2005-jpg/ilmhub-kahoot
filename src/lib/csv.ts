export interface CsvPlayerRow {
  rank: number;
  fullName: string;
  score: number;
  correctCount: number;
  avgTimeMs: number;
}

export function exportResultsToCsv(
  quizTitle: string,
  players: CsvPlayerRow[]
): void {
  const headers = ['Rank', 'Full Name', 'Total Score', 'Correct Answers', 'Avg Response Time (seconds)'];
  const rows = players.map((p) => [
    p.rank,
    `"${p.fullName.replace(/"/g, '""')}"`,
    p.score,
    p.correctCount,
    (p.avgTimeMs / 1000).toFixed(2),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const sanitizedTitle = quizTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizedTitle}_Results_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
