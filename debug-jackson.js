// Debug script to test Jackson's minutes probability calculation
const chance = 0; // Jackson's chance_of_playing_next_round from FPL API
const statusCode = 'u'; // Jackson's status
const recentMinutes = 0; // Jackson's minutes
const formVal = 0.0; // Jackson's form
const news = "has joined Bayern Munich on loan for the rest of the season."; // Jackson's news

console.log('=== DEBUGGING JACKSON\'S MINUTES PROBABILITY ===');
console.log(`Raw FPL data: chance=${chance}, status=${statusCode}, minutes=${recentMinutes}, form=${formVal}`);
console.log(`News: "${news}"`);

let minutesProb;

if (chance !== null) {
  minutesProb = Math.max(0, Math.min(1, chance / 100));
  console.log(`\nBranch 1 (chance !== null): minutesProb = ${minutesProb}`);
} else {
  console.log('\nBranch 2 (chance is null)');
  // Base probability by status
  let baseProb = statusCode === 'a' ? 0.95 : statusCode === 'd' ? 0.7 : statusCode === 'u' ? 0.85 : 0.4;
  console.log(`Base prob by status '${statusCode}': ${baseProb}`);
  
  // Players with very low minutes likely not first choice
  if (recentMinutes < 45 && statusCode === 'a') {
    baseProb = Math.min(baseProb, 0.6);
    console.log(`Low minutes adjustment: ${baseProb}`);
  }
  
  // Form factor - poor form suggests rotation risk
  if (formVal < 2.0 && recentMinutes < 90) {
    baseProb *= 0.8;
    console.log(`Poor form adjustment: ${baseProb}`);
  }
  
  // Very low ownership often indicates the player is out of favor
  const ownPct = 0.1; // Jackson's ownership
  if (ownPct < 1.0 && recentMinutes < 60) {
    baseProb *= 0.7;
    console.log(`Low ownership adjustment: ${baseProb}`);
  }
  
  // Check for loan/transfer news
  const newsLower = news.toLowerCase();
  if (newsLower.includes('loan') || newsLower.includes('transfer') || newsLower.includes('joined')) {
    baseProb = 0.05;
    console.log(`Loan/transfer news detected: ${baseProb}`);
  }
  
  minutesProb = Math.max(0.05, Math.min(0.95, baseProb));
}

console.log(`\nFINAL minutesProb: ${minutesProb} (${minutesProb * 100}%)`);
console.log(`Expected: Should be ~5% due to loan status`);
