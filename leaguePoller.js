// leaguePoller.js
// Polls the League of Legends Live Client Data API to detect in-game status

import fetch from 'node-fetch';
import https from 'https';

class LeaguePoller {
  constructor({ pollInterval = 2000, onGameStart, onGameEnd, debug = false }) {
    this.pollInterval = pollInterval;
    this.onGameStart = onGameStart;
    this.onGameEnd = onGameEnd;
    this.polling = false;
    this.inGame = false;
    this.timer = null;
    this.debug = debug;
  }

  async poll() {
    if (this.debug) console.log('[LeaguePoller] Polling...');
    try {
      const res = await fetch('https://127.0.0.1:2999/liveclientdata/allgamedata', {
        agent: new https.Agent({ rejectUnauthorized: false })
      });
      if (this.debug) console.log('[LeaguePoller] Fetch status:', res.status);
      if (res.ok) {
        if (!this.inGame) {
          this.inGame = true;
          if (this.debug) console.log('[LeaguePoller] Game detected!');
          if (this.onGameStart) this.onGameStart();
        }
      } else {
        throw new Error('Not in game');
      }
    } catch (err) {
      if (this.debug) console.log('[LeaguePoller] Error:', err);
      if (this.inGame) {
        this.inGame = false;
        if (this.debug) console.log('[LeaguePoller] Game ended!');
        if (this.onGameEnd) this.onGameEnd();
      }
    }
  }

  start() {
    if (this.polling) return;
    this.polling = true;
    this.timer = setInterval(() => this.poll(), this.pollInterval);
  }

  stop() {
    this.polling = false;
    if (this.timer) clearInterval(this.timer);
  }
}

export default LeaguePoller;
