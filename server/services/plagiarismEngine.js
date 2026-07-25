/**
 * Plagiarism & AI Detection Simulation Engine for Laksamana Platform
 */

function analyzeDocument(fileName, fileSize, serviceType) {
  const baseSeed = (fileName.length * 13 + fileSize) % 100;
  
  let similarityIndex = 0;
  let aiScore = 0;
  let matchedSources = [];

  if (serviceType === 'cek-plagiasi' || serviceType === 'cek-drillbit') {
    similarityIndex = Math.floor(12 + (baseSeed * 0.25));
    matchedSources = [
      { source: "journal.univexample.ac.id/index.php/article/view/1092", percent: Math.floor(similarityIndex * 0.4) || 5 },
      { source: "repository.researchgate.net/publication/34821", percent: Math.floor(similarityIndex * 0.3) || 4 },
      { source: "elearning.kampus.ac.id/mod/resource/view.php", percent: Math.floor(similarityIndex * 0.2) || 2 },
      { source: "e-journal.sinta.kemdikbud.go.id/article/771", percent: Math.floor(similarityIndex * 0.1) || 1 }
    ];
    aiScore = Math.floor(5 + (baseSeed * 0.15));
  } else if (serviceType === 'gptzero') {
    aiScore = Math.floor(45 + (baseSeed * 0.45));
    similarityIndex = Math.floor(8 + (baseSeed * 0.1));
    matchedSources = [
      { source: "GPT-4o Generated Pattern Match", percent: Math.floor(aiScore * 0.6) },
      { source: "Claude 3.5 Sonnet Syntactic Alignment", percent: Math.floor(aiScore * 0.4) }
    ];
  } else if (serviceType === 'humanizer' || serviceType === 'parafrase') {
    similarityIndex = Math.floor(2 + (baseSeed * 0.05));
    aiScore = Math.floor(0 + (baseSeed * 0.04));
    matchedSources = [];
  } else {
    similarityIndex = 15;
    aiScore = 10;
  }

  const pageCount = Math.max(1, Math.ceil(fileSize / 15000));
  const wordCount = pageCount * 320;

  return {
    similarityIndex: Math.min(similarityIndex, 99),
    aiScore: Math.min(aiScore, 99),
    pageCount,
    wordCount,
    matchedSources,
    status: 'COMPLETED',
    analyzedAt: new Date().toISOString(),
    reportUrl: `/uploads/reports/report_${Date.now()}.json`
  };
}

module.exports = { analyzeDocument };
