import fs from 'fs';

const data = JSON.parse(fs.readFileSync('stock_history_export.json', 'utf8'));

const groups = {};
data.forEach(row => {
    const key = `${row.country}_${row.itemId}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
});

console.log("Deep Analysis for 'Perfect' Algorithm...");

const allStats = [];

for (const [key, history] of Object.entries(groups)) {
    const restocks = [];
    for (let i = 1; i < history.length; i++) {
        if (history[i-1].stock === 0 && history[i].stock > 0) {
            restocks.push(history[i].timestamp);
        }
    }

    if (restocks.length < 5) continue;

    const intervals = [];
    for (let i = 1; i < restocks.length; i++) {
        intervals.push(restocks[i] - restocks[i-1]);
    }

    // Sort to find median and percentiles
    const sorted = [...intervals].sort((a,b) => a-b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    
    const avg = intervals.reduce((a,b) => a+b, 0) / intervals.length;
    const stdDev = Math.sqrt(intervals.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / intervals.length);

    allStats.push({
        key,
        samples: restocks.length,
        avg: Math.round(avg / 60),
        median: Math.round(median / 60),
        stdDev: Math.round(stdDev / 60),
        range: `${Math.round(p10 / 60)} - ${Math.round(p90 / 60)} mins`
    });
}

console.log("\nDistribution Stats (Top 10 items):");
console.table(allStats.sort((a,b) => b.samples - a.samples).slice(0, 10));

// Check if any country has a "Master Restock Clock"
const countryClocks = {};
allStats.forEach(s => {
    const country = s.key.split('_')[0];
    if (!countryClocks[country]) countryClocks[country] = [];
    countryClocks[country].push(s.avg);
});

console.log("\nCountry Restock Clocks (Average of averages):");
Object.entries(countryClocks).forEach(([c, avgs]) => {
    const avg = avgs.reduce((a,b) => a+b, 0) / avgs.length;
    console.log(`${c.padEnd(20)}: ~${Math.round(avg)} mins`);
});
