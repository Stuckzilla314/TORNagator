import fs from 'fs';

const data = JSON.parse(fs.readFileSync('stock_history_export.json', 'utf8'));

const groups = {};
data.forEach(row => {
    const key = `${row.country}_${row.itemId}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
});

console.log("Hypothesis Test: Sell-out speed vs Restock delay...");

const correlationPairs = [];

for (const [key, history] of Object.entries(groups)) {
    let lastRestockTime = null;
    let sellOutTime = null;

    for (let i = 1; i < history.length; i++) {
        // Detect Restock
        if (history[i-1].stock === 0 && history[i].stock > 0) {
            if (sellOutTime && lastRestockTime) {
                const waitDuration = (history[i].timestamp - sellOutTime) / 60;
                const sellDuration = (sellOutTime - lastRestockTime) / 60;
                
                if (sellDuration > 0 && waitDuration > 0) {
                    correlationPairs.push({ sellDuration, waitDuration });
                }
            }
            lastRestockTime = history[i].timestamp;
            sellOutTime = null;
        }
        
        // Detect Sell-out
        if (history[i-1].stock > 0 && history[i].stock === 0) {
            sellOutTime = history[i].timestamp;
        }
    }
}

console.log(`Analyzing ${correlationPairs.length} sell/restock cycles...`);

// Simple correlation calculation (Pearson)
function pearson(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, v, i) => sum + v * y[i], 0);
    const sumX2 = x.reduce((sum, v) => sum + v * v, 0);
    const sumY2 = y.reduce((sum, v) => sum + v * v, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return numerator / denominator;
}

const x = correlationPairs.map(p => p.sellDuration);
const y = correlationPairs.map(p => p.waitDuration);
const r = pearson(x, y);

console.log(`Pearson Correlation (r): ${r.toFixed(4)}`);

if (Math.abs(r) > 0.3) {
    console.log("Conclusion: Significant correlation found!");
} else {
    console.log("Conclusion: Weak or no linear correlation found.");
}

// Binned analysis to see non-linear trends
const bins = [15, 30, 60, 120, 240];
console.log("\nBinned Analysis (Avg Wait by Sell Duration):");
bins.forEach((max, idx) => {
    const min = idx === 0 ? 0 : bins[idx-1];
    const matches = correlationPairs.filter(p => p.sellDuration > min && p.sellDuration <= max);
    if (matches.length > 0) {
        const avgWait = matches.reduce((a,b) => a + b.waitDuration, 0) / matches.length;
        console.log(`Sold out in ${min}-${max} mins: Avg Wait = ${Math.round(avgWait)} mins (${matches.length} samples)`);
    }
});
