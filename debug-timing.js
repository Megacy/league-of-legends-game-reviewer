import fs from 'fs';

// Load the recent recording data
const data = JSON.parse(fs.readFileSync('./recordings/2025-07-26T15-57-14-464Z.events.json', 'utf8'));
const recordingStart = data.metadata.recordingStartTime;

console.log('=== TIMELINE TIMING DEBUG ===');
console.log('Recording started:', new Date(recordingStart).toISOString());
console.log('Total events:', data.events.length);
console.log('');

// Analyze MinionsSpawning for reference
const minions = data.events.find(e => e.EventName === 'MinionsSpawning');
if (minions) {
  const minionsVideoTime = (minions.capturedAt - recordingStart) / 1000;
  const minionsGameTime = minions.EventTime;
  const actualLoadingTime = minionsVideoTime - minionsGameTime;
  
  console.log('=== MINIONS SPAWNING ANALYSIS ===');
  console.log('Game time:', minionsGameTime.toFixed(1), 's');
  console.log('Video time:', minionsVideoTime.toFixed(1), 's');
  console.log('Actual loading time:', actualLoadingTime.toFixed(1), 's');
  console.log('');
}

// Find events around the time you mentioned (1058s game time)
console.log('=== EVENTS AROUND 1058s GAME TIME ===');
const nearbyEvents = data.events.filter(e => 
  e.EventTime > 1050 && e.EventTime < 1070
).slice(0, 5);

nearbyEvents.forEach(event => {
  const videoTime = (event.capturedAt - recordingStart) / 1000;
  const gameTime = event.EventTime;
  
  console.log(`${event.EventName}:`);
  console.log(`  Game time: ${gameTime.toFixed(1)}s (${Math.floor(gameTime/60)}:${(gameTime%60).toFixed(0).padStart(2,'0')})`);
  console.log(`  Video time: ${videoTime.toFixed(1)}s (${Math.floor(videoTime/60)}:${(videoTime%60).toFixed(0).padStart(2,'0')})`);
  console.log(`  Difference: ${(videoTime - gameTime).toFixed(1)}s`);
  console.log('');
});

// Calculate what the app is probably using
const minionsData = data.events.find(e => e.EventName === 'MinionsSpawning');
if (minionsData) {
  const actualOffset = (minionsData.capturedAt - recordingStart) / 1000 - minionsData.EventTime;
  
  console.log('=== EXPECTED VS ACTUAL ===');
  console.log('Actual loading time from minions:', actualOffset.toFixed(1), 's');
  console.log('If app uses 75s fixed offset, events appear:', (75 - actualOffset).toFixed(1), 's early');
  console.log('');
  
  // Check what the current TimelineUtils would calculate
  console.log('=== DEBUGGING TIMELINE CALCULATION ===');
  console.log('Does recording have recordingStartTime?', !!data.metadata.recordingStartTime);
  console.log('Does first event have capturedAt?', !!data.events[0].capturedAt);
  console.log('First event game time:', data.events[0].EventTime.toFixed(3), 's');
  console.log('Is first event < 30s? (determines full game vs mid-game):', data.events[0].EventTime < 30);
}
