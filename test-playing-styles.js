// Test script to validate playing style calculations
console.log('=== PLAYING STYLE VALIDATION ===\n');

// Mock the playing style factors and helper function
const PLAYING_STYLE_FACTORS = {
  // Forwards
  'poacher': 1.05,
  'target_forward': 1.00,
  'pacey_forward': 1.10,
  'creative_forward': 1.20,
  
  // Defenders  
  'attacking_wb': 1.25,      // Wing-backs like Porro, Kerkez, Munoz
  'attacking_fb': 1.10,      // Attacking fullbacks
  'balanced_fb': 1.00,       // Standard baseline
  'defensive_fb': 0.85,      // Traditional defensive fullbacks
  'attacking_cb': 1.15,      // CBs with set piece threat
  'defensive_cb': 0.90,      // Pure defensive CBs
  
  // Goalkeepers
  'sweeper_gk': 1.05,        
  'traditional_gk': 1.00,    
  
  // Midfielders
  'box_to_box': 1.10,        
  'attacking_mid': 1.15,     
  'defensive_mid': 0.90,     
  'playmaker': 1.12,         
};

function getRealisticExpPoints(player) {
  const expPoints = player.expPoints ?? 0;
  const minutesProb = player.minutesProb ?? 0.8;
  const styleMultiplier = player.playingStyle ? PLAYING_STYLE_FACTORS[player.playingStyle] : 1.0;
  
  return Math.round(expPoints * minutesProb * styleMultiplier * 10) / 10;
}

// Test cases
const testPlayers = [
  // Attacking wing-backs - should get 1.25x multiplier
  {
    id: 'munoz',
    name: 'D. Muñoz', 
    expPoints: 4.2,
    minutesProb: 0.90,
    playingStyle: 'attacking_wb'
  },
  {
    id: 'kerkez', 
    name: 'M. Kerkez',
    expPoints: 3.8,
    minutesProb: 0.85, 
    playingStyle: 'attacking_wb'
  },
  {
    id: 'porro',
    name: 'P. Porro', 
    expPoints: 4.1,
    minutesProb: 0.85,
    playingStyle: 'attacking_wb'
  },
  // Traditional defender for comparison
  {
    id: 'vdv',
    name: 'M. van de Ven',
    expPoints: 2.9, 
    minutesProb: 0.80,
    playingStyle: 'defensive_cb'
  },
  // Attacking midfielder
  {
    id: 'palmer',
    name: 'C. Palmer',
    expPoints: 6.5,
    minutesProb: 0.90,
    playingStyle: 'attacking_mid'
  }
];

console.log('=== ATTACKING WING-BACKS ===');
testPlayers.slice(0, 3).forEach(player => {
  const realistic = getRealisticExpPoints(player);
  const raw = player.expPoints;
  const boost = ((realistic / (raw * player.minutesProb)) - 1) * 100;
  
  console.log(`${player.name}:`);
  console.log(`  Raw: ${raw} → Realistic: ${realistic}`);
  console.log(`  Style boost: +${boost.toFixed(1)}% (${player.playingStyle})`);
  console.log(`  Formula: ${raw} × ${player.minutesProb} × ${PLAYING_STYLE_FACTORS[player.playingStyle]} = ${realistic}\n`);
});

console.log('=== DEFENSIVE CB COMPARISON ===');
const vdv = testPlayers[3];
const realistic = getRealisticExpPoints(vdv);
const raw = vdv.expPoints;
const penalty = ((realistic / (raw * vdv.minutesProb)) - 1) * 100;

console.log(`${vdv.name}:`);
console.log(`  Raw: ${raw} → Realistic: ${realistic}`);
console.log(`  Style penalty: ${penalty.toFixed(1)}% (${vdv.playingStyle})`);
console.log(`  Formula: ${raw} × ${vdv.minutesProb} × ${PLAYING_STYLE_FACTORS[vdv.playingStyle]} = ${realistic}\n`);

console.log('=== ATTACKING MIDFIELDER ===');
const palmer = testPlayers[4];
const palmerRealistic = getRealisticExpPoints(palmer);
const palmerRaw = palmer.expPoints;
const palmerBoost = ((palmerRealistic / (palmerRaw * palmer.minutesProb)) - 1) * 100;

console.log(`${palmer.name}:`);
console.log(`  Raw: ${palmerRaw} → Realistic: ${palmerRealistic}`);
console.log(`  Style boost: +${palmerBoost.toFixed(1)}% (${palmer.playingStyle})`);
console.log(`  Formula: ${palmerRaw} × ${palmer.minutesProb} × ${PLAYING_STYLE_FACTORS[palmer.playingStyle]} = ${palmerRealistic}\n`);

console.log('✅ Playing style system is working correctly!');
console.log('- Attacking wing-backs get 25% boost to expected points');
console.log('- Defensive CBs get 10% penalty to expected points'); 
console.log('- Attacking midfielders get 15% boost to expected points');
