// ═══════════════════════════════════════════════════════════════
// ECHO WORLDS — Voice Chat System (WebRTC)
// Sprint 2: Proximity-based voice with push-to-talk
// ═══════════════════════════════════════════════════════════════

class VoiceChat {
  constructor() {
    this.peers = new Map();        // peerId → { pc: RTCPeerConnection, stream, audioEl, gainNode }
    this.localStream = null;
    this.audioContext = null;
    this.ws = null;                // reference to EchoWS websocket
    this.myId = null;
    this.enabled = false;
    this.muted = true;             // start muted (push-to-talk default)
    this.deafened = false;
    this.mode = 'push-to-talk';    // 'push-to-talk' | 'always-on' | 'off'
    this.pttActive = false;
    this.speaking = false;
    this.speakingThreshold = 0.01;
    this.maxDistance = 300;         // pixels — max hearing distance
    this.falloffStart = 100;       // pixels — volume starts fading after this
    this.analyser = null;
    this.analyserData = null;
    this._volumeCheckInterval = null;
    this._proximityInterval = null;
    this._iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
    // Track who we can hear (same floor, within range)
    this.audiblePeers = new Set();

    // Bind PTT keys
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  // ─── Initialize ───────────────────────────────────────────
  async init(ws, myId) {
    this.ws = ws;
    this.myId = myId;

    // AudioContext for spatial audio processing
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Start proximity check loop (updates volume based on distance)
    this._proximityInterval = setInterval(() => this._updateProximityVolumes(), 100);

    // Bind keyboard for PTT
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    console.log('🎤 Voice chat initialized');
  }

  // ─── Request microphone ───────────────────────────────────
  async requestMic() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      });

      // Set up volume analyser for speaking detection
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
      source.connect(this.analyser);

      // Start muted — tracks disabled until PTT or always-on
      this.localStream.getAudioTracks().forEach(t => { t.enabled = false; });

      // Check speaking volume
      this._volumeCheckInterval = setInterval(() => this._checkSpeaking(), 50);

      this.enabled = true;
      console.log('🎤 Microphone acquired');
      this._broadcastVoiceState();
      return true;
    } catch (err) {
      console.error('🎤 Mic access denied:', err);
      return false;
    }
  }

  // ─── Push to talk ─────────────────────────────────────────
  _onKeyDown(e) {
    // V key for push-to-talk (don't trigger in text inputs)
    if (e.code === 'KeyV' && !e.repeat && this.mode === 'push-to-talk' && this.enabled) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      this.pttActive = true;
      this._setMicEnabled(true);
    }
  }

  _onKeyUp(e) {
    if (e.code === 'KeyV' && this.mode === 'push-to-talk' && this.enabled) {
      this.pttActive = false;
      this._setMicEnabled(false);
    }
  }

  _setMicEnabled(enabled) {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach(t => { t.enabled = enabled && !this.muted; });
    if (enabled && !this.muted) {
      this._broadcastVoiceState();
    }
  }

  // ─── Toggle mute ──────────────────────────────────────────
  toggleMute() {
    this.muted = !this.muted;
    if (this.localStream) {
      if (this.mode === 'always-on') {
        this.localStream.getAudioTracks().forEach(t => { t.enabled = !this.muted; });
      }
    }
    this._broadcastVoiceState();
    return this.muted;
  }

  toggleDeafen() {
    this.deafened = !this.deafened;
    // Mute all incoming audio
    for (const [id, peer] of this.peers) {
      if (peer.audioEl) peer.audioEl.muted = this.deafened;
    }
    this._broadcastVoiceState();
    return this.deafened;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'always-on' && this.enabled && !this.muted) {
      this._setMicEnabled(true);
    } else if (mode === 'push-to-talk' && !this.pttActive) {
      this._setMicEnabled(false);
    } else if (mode === 'off') {
      this._setMicEnabled(false);
    }
  }

  // ─── Speaking detection ───────────────────────────────────
  _checkSpeaking() {
    if (!this.analyser || !this.analyserData) return;
    this.analyser.getByteFrequencyData(this.analyserData);
    const avg = this.analyserData.reduce((a, b) => a + b, 0) / this.analyserData.length / 255;
    const wasSpeaking = this.speaking;
    this.speaking = avg > this.speakingThreshold;

    if (this.speaking !== wasSpeaking) {
      // Notify server of speaking state for avatar animation
      this._sendVoiceMsg({ type: 'voice.speaking', speaking: this.speaking });
    }
  }

  // ─── Proximity volume ─────────────────────────────────────
  _updateProximityVolumes() {
    if (!window.S || !S.otherPlayers) return;

    for (const [id, peer] of this.peers) {
      const player = S.otherPlayers[id];
      if (!player || !peer.gainNode) continue;

      // Different floor = silent
      if (player.floor !== S.floor) {
        peer.gainNode.gain.value = 0;
        continue;
      }

      // Calculate distance
      const dx = player.x - S.visitor.x;
      const dy = player.y - S.visitor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let vol;
      if (dist <= this.falloffStart) {
        vol = 1.0; // Full volume when close
      } else if (dist >= this.maxDistance) {
        vol = 0;   // Silent when far
      } else {
        // Linear falloff
        vol = 1 - (dist - this.falloffStart) / (this.maxDistance - this.falloffStart);
      }

      // Smooth volume transition
      peer.gainNode.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1, vol)),
        this.audioContext.currentTime + 0.1
      );

      // Track audibility
      if (vol > 0.01) this.audiblePeers.add(id);
      else this.audiblePeers.delete(id);
    }
  }

  // ─── WebRTC signaling (via existing WebSocket) ────────────
  handleSignal(msg) {
    if (msg.type === 'voice.offer') this._handleOffer(msg.from, msg.offer);
    else if (msg.type === 'voice.answer') this._handleAnswer(msg.from, msg.answer);
    else if (msg.type === 'voice.ice') this._handleIce(msg.from, msg.candidate);
    else if (msg.type === 'voice.speaking') this._handleSpeaking(msg.from, msg.speaking);
    else if (msg.type === 'voice.state') this._handlePeerState(msg.from, msg.state);
    else if (msg.type === 'voice.leave') this._removePeer(msg.from);
    else if (msg.type === 'voice.join') this._connectToPeer(msg.from);
  }

  // Join voice — announce to all peers
  async joinVoice() {
    if (!this.enabled) {
      const ok = await this.requestMic();
      if (!ok) return false;
    }
    this._sendVoiceMsg({ type: 'voice.join' });
    return true;
  }

  leaveVoice() {
    this._sendVoiceMsg({ type: 'voice.leave' });
    this._cleanup();
  }

  // Create peer connection TO a specific player
  async _connectToPeer(peerId) {
    if (this.peers.has(peerId) || peerId === this.myId) return;
    if (!this.localStream) return;

    console.log(`🎤 Connecting to peer: ${peerId}`);
    const pc = new RTCPeerConnection({ iceServers: this._iceServers });
    const peer = { pc, stream: null, audioEl: null, gainNode: null };
    this.peers.set(peerId, peer);

    // Add local tracks
    this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));

    // Handle incoming tracks
    pc.ontrack = (e) => this._onTrack(peerId, e);

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this._sendVoiceMsg({ type: 'voice.ice', to: peerId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log(`🎤 Peer ${peerId} disconnected`);
        this._removePeer(peerId);
      }
    };

    // Create offer (initiator = alphabetically lower ID)
    if (this.myId < peerId) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this._sendVoiceMsg({ type: 'voice.offer', to: peerId, offer: pc.localDescription });
      } catch (err) {
        console.error('🎤 Create offer failed:', err);
      }
    }
  }

  async _handleOffer(from, offer) {
    if (!this.localStream) return;

    let peer = this.peers.get(from);
    if (!peer) {
      const pc = new RTCPeerConnection({ iceServers: this._iceServers });
      peer = { pc, stream: null, audioEl: null, gainNode: null };
      this.peers.set(from, peer);

      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
      pc.ontrack = (e) => this._onTrack(from, e);
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          this._sendVoiceMsg({ type: 'voice.ice', to: from, candidate: e.candidate });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          this._removePeer(from);
        }
      };
    }

    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      this._sendVoiceMsg({ type: 'voice.answer', to: from, answer: peer.pc.localDescription });
    } catch (err) {
      console.error('🎤 Handle offer failed:', err);
    }
  }

  async _handleAnswer(from, answer) {
    const peer = this.peers.get(from);
    if (!peer) return;
    try {
      await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('🎤 Handle answer failed:', err);
    }
  }

  async _handleIce(from, candidate) {
    const peer = this.peers.get(from);
    if (!peer) return;
    try {
      await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // ICE candidate errors are common and usually non-fatal
    }
  }

  _onTrack(peerId, event) {
    console.log(`🎤 Got audio track from: ${peerId}`);
    const peer = this.peers.get(peerId);
    if (!peer) return;

    peer.stream = event.streams[0];

    // Create audio element (needed for browsers to actually play the stream)
    const audioEl = new Audio();
    audioEl.srcObject = peer.stream;
    audioEl.autoplay = true;
    // We control volume through gain node, so set audio element to full
    audioEl.volume = 0;  // We'll use Web Audio API for spatial control
    peer.audioEl = audioEl;

    // Route through Web Audio API for gain (proximity) control
    const source = this.audioContext.createMediaStreamSource(peer.stream);
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0; // Start silent, proximity will adjust
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    peer.gainNode = gainNode;

    // Also play through audio element as fallback (some browsers need this)
    audioEl.volume = 1.0;
    audioEl.play().catch(() => {});
    // But immediately mute the audio element since we're using Web Audio for volume
    setTimeout(() => { audioEl.volume = 0; }, 100);
  }

  _handleSpeaking(from, speaking) {
    // Update the player's speaking state for UI
    const player = window.S?.otherPlayers?.[from];
    if (player) {
      player.voiceSpeaking = speaking;
    }
  }

  _handlePeerState(from, state) {
    const player = window.S?.otherPlayers?.[from];
    if (player) {
      player.voiceEnabled = state.enabled;
      player.voiceMuted = state.muted;
    }
  }

  _removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    if (peer.pc) peer.pc.close();
    if (peer.audioEl) { peer.audioEl.pause(); peer.audioEl.srcObject = null; }
    if (peer.gainNode) peer.gainNode.disconnect();
    this.peers.delete(peerId);
    this.audiblePeers.delete(peerId);

    const player = window.S?.otherPlayers?.[peerId];
    if (player) {
      player.voiceSpeaking = false;
      player.voiceEnabled = false;
    }
  }

  _sendVoiceMsg(msg) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  _broadcastVoiceState() {
    this._sendVoiceMsg({
      type: 'voice.state',
      state: { enabled: this.enabled, muted: this.muted, deafened: this.deafened, mode: this.mode }
    });
  }

  _cleanup() {
    // Close all peer connections
    for (const [id, peer] of this.peers) {
      if (peer.pc) peer.pc.close();
      if (peer.audioEl) { peer.audioEl.pause(); peer.audioEl.srcObject = null; }
      if (peer.gainNode) peer.gainNode.disconnect();
    }
    this.peers.clear();
    this.audiblePeers.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    if (this._volumeCheckInterval) clearInterval(this._volumeCheckInterval);
    if (this._proximityInterval) clearInterval(this._proximityInterval);

    this.enabled = false;
    this.speaking = false;
  }

  destroy() {
    this.leaveVoice();
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    if (this.audioContext) this.audioContext.close();
  }

  // ─── UI State ─────────────────────────────────────────────
  getState() {
    return {
      enabled: this.enabled,
      muted: this.muted,
      deafened: this.deafened,
      mode: this.mode,
      speaking: this.speaking,
      pttActive: this.pttActive,
      peerCount: this.peers.size,
      audibleCount: this.audiblePeers.size
    };
  }
}

// Global instance
window.voiceChat = new VoiceChat();
