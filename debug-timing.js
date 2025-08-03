import fs from 'fs';

// Load the current recording data with the LeBlanc kill issue
const data = JSON.parse(fs.readFileSync('./recordings/2025-08-03T11-43-27-085Z.events.json', 'utf8'));
const recordingStart = data.metadata.recordingStartTime;

console.log('=== DETAILED TIMELINE OFFSET CALCULATION DEBUG ===');
console.log('Recording started:', new Date(recordingStart).toISOString());
console.log('Recording start timestamp:', recordingStart);
console.log('Total events:', data.events.length);
console.log('');

// Simulate the exact logic from calculateGameTimeOffset
const events = data.events;
const eventsMetadata = data.metadata;

console.log('=== STRATEGY 1: Wall-clock timestamps ===');
console.log('Does recording have recordingStartTime?', !!eventsMetadata?.recordingStartTime);

if (eventsMetadata?.recordingStartTime) {
  // Look for events with capturedAt timestamps
  const eventsWithTimestamps = events.filter(e => e.capturedAt);
  console.log('Events with capturedAt timestamps:', eventsWithTimestamps.length);
  
  if (eventsWithTimestamps.length > 0) {
    const recordingStartMs = eventsMetadata.recordingStartTime;
    console.log('Recording start (ms):', recordingStartMs);
    
    // Show first few events and their timing
    console.log('\nFirst 5 events with timestamps:');
    eventsWithTimestamps.slice(0, 5).forEach((e, i) => {
      const capturedMs = e.capturedAt;
      const timeSinceRecording = capturedMs - recordingStartMs;
      const meetsFilter = timeSinceRecording >= 1000;
      console.log(`${i+1}. ${e.EventName} at ${e.EventTime.toFixed(1)}s game time`);
      console.log(`   Captured: ${capturedMs} (${new Date(capturedMs).toISOString()})`);
      console.log(`   Time since recording: ${timeSinceRecording}ms (${(timeSinceRecording/1000).toFixed(1)}s)`);
      console.log(`   Meets >=1000ms filter: ${meetsFilter}`);
      console.log('');
    });
    
    // Filter events that were actually captured AFTER recording started
    const relevantEvents = eventsWithTimestamps.filter(e => {
      const capturedMs = e.capturedAt;
      const timeSinceRecording = capturedMs - recordingStartMs;
      return timeSinceRecording >= 1000;
    });
    
    console.log('Events that pass the filter (>=1000ms after recording):', relevantEvents.length);
    
    if (relevantEvents.length > 0) {
      const firstRelevantEvent = relevantEvents[0];
      console.log('\nFirst relevant event:', firstRelevantEvent.EventName);
      console.log('Game time:', firstRelevantEvent.EventTime.toFixed(3), 's');
      console.log('Captured at:', firstRelevantEvent.capturedAt);
      console.log('Is < 30s (full game)?', firstRelevantEvent.EventTime < 30);
      
      if (firstRelevantEvent.EventTime < 30) {
        const eventCapturedMs = firstRelevantEvent.capturedAt;
        const gameTimeMs = firstRelevantEvent.EventTime * 1000;
        const videoTimeMs = eventCapturedMs - recordingStartMs;
        const offsetMs = videoTimeMs - gameTimeMs;
        const offsetSeconds = offsetMs / 1000;
        
        console.log('\nFULL GAME CALCULATION:');
        console.log('Event captured at:', eventCapturedMs, '(', new Date(eventCapturedMs).toISOString(), ')');
        console.log('Game time (ms):', gameTimeMs.toFixed(1));
        console.log('Video time (ms):', videoTimeMs.toFixed(1));
        console.log('Offset (ms):', offsetMs.toFixed(1));
        console.log('Offset (seconds):', offsetSeconds.toFixed(3));
        console.log('Final result (Math.max(0, offset)):', Math.max(0, offsetSeconds).toFixed(3));
      }
    } else {
      console.log('❌ No events pass the filter - would fall back to other strategies');
    }
  }
} else {
  console.log('❌ No recordingStartTime in metadata');
}

console.log('\n=== WHAT THE APP SHOULD CALCULATE ===');
const leblanckill = events.find(e => 
  e.EventTime > 502 && e.EventTime < 503 && 
  e.KillerChampion === 'LeBlanc' && e.VictimChampion === 'Nami'
);

if (leblanckill) {
  const correctOffset = ((leblanckill.capturedAt - recordingStart) / 1000) - leblanckill.EventTime;
  console.log('LeBlanc kill should appear at:', (leblanckill.EventTime + correctOffset).toFixed(1), 's video time');
  console.log('With 35s offset, it appears at:', (leblanckill.EventTime + 35).toFixed(1), 's (WRONG)');
  console.log('With', correctOffset.toFixed(1) + 's offset, it appears at:', (leblanckill.EventTime + correctOffset).toFixed(1), 's (CORRECT)');
}
