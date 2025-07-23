// eventRecorder.js
// Records League events during a game and saves them to a JSON file

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import https from 'https';

class EventRecorder {
  constructor({ pollInterval = 1000, outputDir = './recordings' }) {
    this.pollInterval = pollInterval;
    this.outputDir = outputDir;
    this.polling = false;
    this.events = [];
    this.timer = null;
    this.startTime = null;
    this.fileBase = null;
    this.playerList = []; // Cache player-champion mapping
    this.lastPlayerListUpdate = 0;
    this.activePlayerName = null; // Store the active player name
  }

  async startRecording(fileBase) {
    this.events = [];
    this.startTime = Date.now();
    this.fileBase = fileBase;
    this.polling = true;
    this.playerList = []; // Reset player list cache
    this.lastPlayerListUpdate = 0;
    this.activePlayerName = null;
    
    // Try to get the active player name when starting recording
    await this.detectActivePlayer();
    
    console.log('[EVENT RECORDER] Started recording for fileBase:', fileBase, 'Player:', this.activePlayerName);
    this.timer = setInterval(() => this.poll(), this.pollInterval);
  }

  async detectActivePlayer() {
    try {
      // Try the activeplayername endpoint first
      const nameRes = await fetch('https://127.0.0.1:2999/liveclientdata/activeplayername', {
        agent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 3000
      });
      
      if (nameRes.ok) {
        const playerName = await nameRes.text();
        this.activePlayerName = playerName.replace(/"/g, '').split('#')[0]; // Clean up quotes and tag
        console.log('[EVENT RECORDER] Detected active player:', this.activePlayerName);
        return;
      }
      
      // Fallback: try allgamedata endpoint
      const allDataRes = await fetch('https://127.0.0.1:2999/liveclientdata/allgamedata', {
        agent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 3000
      });
      
      if (allDataRes.ok) {
        const gameData = await allDataRes.json();
        const activePlayer = gameData.allPlayers?.find(player => player.summonerName && !player.isBot);
        if (activePlayer) {
          this.activePlayerName = activePlayer.summonerName.split('#')[0];
          console.log('[EVENT RECORDER] Detected active player from allgamedata:', this.activePlayerName);
        }
      }
    } catch (error) {
      console.log('[EVENT RECORDER] Could not detect active player:', error.message);
    }
  }

  async stopRecording() {
    this.polling = false;
    if (this.timer) clearInterval(this.timer);
    console.log('[EVENT RECORDER] Stopping recording. Events collected:', this.events.length);
    if (this.fileBase) {
      const outPath = path.join(this.outputDir, `${this.fileBase}.events.json`);
      fs.mkdirSync(this.outputDir, { recursive: true });
      
      // Create the events file with metadata
      const eventsData = {
        metadata: {
          recordedAt: new Date().toISOString(),
          activePlayerName: this.activePlayerName,
          totalEvents: this.events.length
        },
        events: this.events
      };
      
      await fs.promises.writeFile(outPath, JSON.stringify(eventsData, null, 2));
      console.log('[EVENT RECORDER] Wrote events to:', outPath, 'with player:', this.activePlayerName);
    }
  }

  async poll() {
    if (!this.polling) return;
    
    try {
      // Update player list every 30 seconds or if not cached
      const now = Date.now();
      if (now - this.lastPlayerListUpdate > 30000 || this.playerList.length === 0) {
        await this.updatePlayerList();
      }

      const res = await fetch('https://127.0.0.1:2999/liveclientdata/eventdata', {
        agent: new https.Agent({ rejectUnauthorized: false })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.Events) {
          const newEventsCount = data.Events.length - this.events.length;
          if (newEventsCount > 0) {
            console.log('[EVENT RECORDER] Found', newEventsCount, 'new events');
          }
          for (const event of data.Events) {
            // Only add new events
            if (!this.events.find(e => e.EventID === event.EventID)) {
              // Enrich ChampionKill events with champion names
              const enrichedEvent = this.enrichEvent(event);
              this.events.push(enrichedEvent);
            }
          }
        }
      } else {
        console.log('[EVENT RECORDER] API response not OK:', res.status, res.statusText);
      }
    } catch (err) {
      // Log errors but don't stop polling
      console.log('[EVENT RECORDER] Polling error (normal if not in game):', err.message);
    }
  }

  async updatePlayerList() {
    try {
      const res = await fetch('https://127.0.0.1:2999/liveclientdata/playerlist', {
        agent: new https.Agent({ rejectUnauthorized: false })
      });
      if (res.ok) {
        const playerData = await res.json();
        this.playerList = playerData || [];
        this.lastPlayerListUpdate = Date.now();
      }
    } catch (err) {
      // Ignore errors if not in game
    }
  }

  enrichEvent(event) {
    // Only enrich ChampionKill events
    if (event.EventName !== 'ChampionKill') {
      return event;
    }

    // Create enriched event with champion information
    const enrichedEvent = { ...event };

    // Helper function to find player by name (handles both exact match and Riot ID matching)
    const findPlayerByName = (playerName) => {
      if (!playerName || this.playerList.length === 0) return null;
      
      // Try exact match first
      let player = this.playerList.find(p => p.summonerName === playerName);
      if (player) return player;
      
      // Try matching against riotIdGameName (the part before #)
      player = this.playerList.find(p => p.riotIdGameName === playerName);
      if (player) return player;
      
      // Try checking if playerName is contained in summonerName (for cases like "LORDMASTERKING" vs "LORDMASTERKING#9999")
      player = this.playerList.find(p => p.summonerName && p.summonerName.startsWith(playerName + '#'));
      if (player) return player;
      
      return null;
    };

    // Find killer champion
    if (event.KillerName) {
      const killer = findPlayerByName(event.KillerName);
      if (killer && killer.championName) {
        enrichedEvent.KillerChampion = killer.championName;
      }
    }

    // Find victim champion
    if (event.VictimName) {
      const victim = findPlayerByName(event.VictimName);
      if (victim && victim.championName) {
        enrichedEvent.VictimChampion = victim.championName;
      }
    }

    // Find assister champions
    if (event.Assisters && Array.isArray(event.Assisters)) {
      enrichedEvent.AssisterChampions = event.Assisters.map(assisterName => {
        const assister = findPlayerByName(assisterName);
        return assister && assister.championName ? assister.championName : assisterName;
      });
    }

    return enrichedEvent;
  }

  loadEventsForVideo(fileBase) {
    const outPath = path.join(this.outputDir, `${fileBase}.events.json`);
    if (fs.existsSync(outPath)) {
      return JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    }
    return [];
  }
}

export default EventRecorder;
