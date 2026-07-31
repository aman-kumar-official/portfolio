let encA = true, encB = true, algoA = 'caesar', algoB = 'caesar';
let capturedPacket = null, lastPacket = null, crackTimer = null, crackedText = null;
let messageCounter = 0;
let seenNonces = new Set();
let lastTimestamps = { A: 0, B: 0 };
const TIMESTAMP_WINDOW = 30000;

function caesarEnc(t, s = 13) {
  return t.split('').map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(((c.charCodeAt(0) - 97 + s) % 26) + 97);
    if (/[A-Z]/.test(c)) return String.fromCharCode(((c.charCodeAt(0) - 65 + s) % 26) + 65);
    return c;
  }).join('');
}
function caesarDec(t, s = 13) { return caesarEnc(t, 26 - s); }

const VKEY = "KEY";
function vigEnc(t) {
  let o = '', k = 0;
  for (let c of t) {
    if (/[a-zA-Z]/.test(c)) {
      const b = /[a-z]/.test(c) ? 97 : 65;
      const s = VKEY[k % VKEY.length].charCodeAt(0) - 65;
      o += String.fromCharCode((c.charCodeAt(0) - b + s) % 26 + b);
      k++;
    } else o += c;
  }
  return o;
}
function vigDec(t) {
  let o = '', k = 0;
  for (let c of t) {
    if (/[a-zA-Z]/.test(c)) {
      const b = /[a-z]/.test(c) ? 97 : 65;
      const s = VKEY[k % VKEY.length].charCodeAt(0) - 65;
      o += String.fromCharCode((c.charCodeAt(0) - b - s + 26) % 26 + b);
      k++;
    } else o += c;
  }
  return o;
}

const AES_KEY = [0x2b,0x7e,0x15,0x16,0x28,0xae,0xd2,0xa6,0xab,0xf7,0x15,0x88,0x09,0xcf,0x4f,0x3c];
function aesEnc(t) {
  const b = Array.from(t).map((c, i) => c.charCodeAt(0) ^ AES_KEY[i % AES_KEY.length]);
  return btoa(String.fromCharCode(...b));
}
function aesDec(e) {
  try {
    const b = atob(e).split('').map(c => c.charCodeAt(0));
    return b.map((x, i) => String.fromCharCode(x ^ AES_KEY[i % AES_KEY.length])).join('');
  } catch {
    return '[decrypt error]';
  }
}

const SECRET_KEY = "ant";

function hashHMAC(message) {
  let data = message + SECRET_KEY;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash * 31 + data.charCodeAt(i)) % 1000000007;
  }
  return hash.toString(16);
}

function generateNonce() {
  messageCounter++;
  return `${Date.now()}-${messageCounter}-${Math.random().toString(36).substring(2, 8)}`;
}

function validateTimestamp(timestamp, sender) {
  const now = Date.now();
  const timeDiff = now - Number(timestamp);

  if (timeDiff > TIMESTAMP_WINDOW) {
    return { valid: false, reason: 'EXPIRED', diff: timeDiff };
  }
  if (timeDiff < -5000) {
    return { valid: false, reason: 'FUTURE', diff: timeDiff };
  }
  if (Number(timestamp) <= lastTimestamps[sender]) {
    return { valid: false, reason: 'REPLAY', diff: timeDiff };
  }
  return { valid: true, diff: timeDiff };
}

function toHex(t) {
  return Array.from(t).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(':');
}

function buildHashPacket(message) {
  const hash = hashHMAC(message);
  return `MSG:${message}|HMAC:${hash}`;
}

function parseHashPacket(packet) {
  const parts = packet.split('|');
  let msg = '', hash = '';

  parts.forEach(p => {
    if (p.startsWith('MSG:')) msg = p.replace('MSG:', '');
    if (p.startsWith('HMAC:')) hash = p.replace('HMAC:', '');
  });

  return { plaintext: msg, hash };
}

function buildTimestampPacket(message) {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const hash = hashHMAC(message + timestamp + nonce);
  return `MSG:${message}|TS:${timestamp}|NONCE:${nonce}|HMAC:${hash}`;
}

function parseTimestampPacket(packet) {
  const parts = packet.split('|');
  let msg = '', ts = '', nonce = '', hash = '';

  parts.forEach(p => {
    if (p.startsWith('MSG:')) msg = p.replace('MSG:', '');
    if (p.startsWith('TS:')) ts = p.replace('TS:', '');
    if (p.startsWith('NONCE:')) nonce = p.replace('NONCE:', '');
    if (p.startsWith('HMAC:')) hash = p.replace('HMAC:', '');
  });

  return {
    plaintext: msg,
    timestamp: Number(ts),
    nonce,
    hash
  };
}

function doEnc(t, a) {
  if (a === 'caesar') return caesarEnc(t);
  if (a === 'vigenere') return vigEnc(t);
  if (a === 'aes') return aesEnc(t);
  if (a === 'hash') return buildHashPacket(t);
  if (a === 'timestamp') return buildTimestampPacket(t);
  return t;
}

function doDec(t, a, sender) {
  if (a === 'caesar') return caesarDec(t);
  if (a === 'vigenere') return vigDec(t);
  if (a === 'aes') return aesDec(t);

  if (a === 'hash') {
    try {
      const obj = parseHashPacket(t);
      const newHash = hashHMAC(obj.plaintext);

      if (newHash === obj.hash) {
        return obj.plaintext +
          `<br><span style="color:#00ff88;font-size:0.62rem">✔ Integrity Verified (Hash Match)</span>` +
          `<br><span style="color:#00ccff;font-size:0.62rem">Attached Hash: ${obj.hash}</span>`;
      } else {
        return obj.plaintext +
          `<br><span style="color:#ff3366;font-size:0.62rem">✖ TAMPER DETECTED (Hash mismatch)</span>` +
          `<br><span style="color:#ff3366;font-size:0.62rem">Received Hash: ${obj.hash}</span>`;
      }
    } catch {
      return "[HASH ERROR]";
    }
  }

  if (a === 'timestamp') {
    try {
      const obj = parseTimestampPacket(t);

      const tsCheck = validateTimestamp(obj.timestamp, sender);
      if (!tsCheck.valid) {
        let reason = '';
        if (tsCheck.reason === 'EXPIRED') reason = `Message TOO OLD (${Math.floor(tsCheck.diff / 1000)}s old)`;
        else if (tsCheck.reason === 'FUTURE') reason = 'Timestamp IN FUTURE';
        else if (tsCheck.reason === 'REPLAY') reason = 'REPLAY ATTACK';

        return obj.plaintext +
          `<br><span style="color:#ff3366;font-size:0.62rem">✖ TIMESTAMP INVALID: ${reason}</span>`;
      }

      if (seenNonces.has(obj.nonce)) {
        return obj.plaintext +
          `<br><span style="color:#ff3366;font-size:0.62rem">✖ REPLAY DETECTED: Duplicate nonce</span>`;
      }

      const expectedHash = hashHMAC(obj.plaintext + obj.timestamp + obj.nonce);
      if (expectedHash !== obj.hash) {
        return obj.plaintext +
          `<br><span style="color:#ff3366;font-size:0.62rem">✖ TAMPER DETECTED: Hash mismatch</span>`;
      }

      lastTimestamps[sender] = obj.timestamp;
      seenNonces.add(obj.nonce);

      const age = Math.floor(tsCheck.diff / 1000);
      return obj.plaintext +
        `<br><span style="color:#00ff88;font-size:0.62rem">✔ Message Fresh (${age}s old) | Nonce Valid | Integrity Verified</span>` +
        `<br><span style="color:#00ccff;font-size:0.62rem">TS: ${obj.timestamp} | NONCE: ${obj.nonce}</span>`;
    } catch {
      return "[TIMESTAMP ERROR]";
    }
  }

  return t;
}

const ALGO_NAMES = {
  caesar: 'Caesar ROT-13',
  vigenere: 'Vigenère (key=KEY)',
  aes: 'AES-256',
  hash: 'Hash Integrity',
  timestamp: 'Timestamp + Nonce + HMAC'
};

const ALGO_STR = {
  caesar: '<span class="algo-badge weak">WEAK</span>',
  vigenere: '<span class="algo-badge medium">MEDIUM</span>',
  aes: '<span class="algo-badge strong">STRONG</span>',
  hash: '<span class="algo-badge strong">DEFENCE</span>',
  timestamp: '<span class="algo-badge strong">FULL DEFENCE</span>'
};

function log(msg, type = 'log') {
  const el = document.getElementById('logArea');
  const ts = new Date().toLocaleTimeString();
  el.innerHTML += `<div class="log-entry ${type}">[${ts}] ${msg}</div>`;
  el.scrollTop = el.scrollHeight;
}

function addMsg(chatId, text, cls, label = '') {
  const el = document.getElementById(chatId);
  const d = document.createElement('div');
  d.className = `msg ${cls}`;
  d.innerHTML = label ? `<div class="label">${label}</div>${text}` : text;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

function showPacket(pkt) {
  const el = document.getElementById('packetDisplay');
  el.classList.remove('idle');

  const enc = (pkt.from === 'A' ? encA : encB);
  const fN = pkt.from === 'A' ? 'Alice' : 'Bob';
  const tN = pkt.to === 'A' ? 'Alice' : 'Bob';

  if (!enc) {
    el.innerHTML = `
      <span style="color:#ff6688">FROM:</span> ${fN} → ${tN}<br>
      <span style="color:#ff6688">ALGO:</span> None (plaintext)<br>
      <span style="color:#ff6688">DATA:</span> <span style="color:#ffcc00">${pkt.plain}</span><br>
      <span style="color:#00ff88">✓ No encryption — readable instantly!</span>
    `;
  } else {
    const hex = toHex(pkt.encoded).substring(0, 42);
    el.innerHTML = `
      <span style="color:#ff6688">FROM:</span> ${fN} → ${tN}<br>
      <span style="color:#ff6688">ALGO:</span> ${ALGO_NAMES[pkt.algo]} ${ALGO_STR[pkt.algo]}<br>
      <span style="color:#ff6688">PACKET:</span> <span style="color:#cc66ff">${pkt.encoded.substring(0, 120)}${pkt.encoded.length > 120 ? '…' : ''}</span><br>
      <span style="color:#ff6688">HEX:</span> <span style="color:#443">${hex}…</span><br>
      <span style="color:#553">⚠ Eve sees intercepted wire packet</span>
    `;
  }

  crackedText = null;
  document.getElementById('crackBar').style.width = '0%';
  document.getElementById('crackBar').textContent = '';
  document.getElementById('crackBar').style.background = 'linear-gradient(90deg,#ff0066,#ff6600)';
  document.getElementById('crackAttempts').innerHTML = '[ Press CRACK to begin cryptanalysis... ]';
  document.getElementById('crackResult').className = 'crack-result';
  document.getElementById('btnCrack').disabled = !enc;

  if (crackTimer) {
    clearInterval(crackTimer);
    crackTimer = null;
  }
}

function sendMsg(from) {

  const inp = document.getElementById('input' + from);
  const text = inp.value.trim();
  if (!text) return;

  inp.value = '';

  const to = from === 'A' ? 'B' : 'A';
  const enc = from === 'A' ? encA : encB;
  const algo = from === 'A' ? algoA : algoB;

  const encoded = enc ? doEnc(text, algo) : text;
  const packetTimestamp = Date.now();

  addMsg(
    'chat' + from,
    enc
      ? `<b>${text}</b>
         <br>
         <span style="color:#334;font-size:0.62rem">
           🔒 Sent over wire as: 
           ${encoded.substring(0, 80)}${encoded.length > 80 ? '…' : ''}
         </span>`
      : `<b>${text}</b>`,

    from === 'A' ? 'sent' : 'sent-b',

    `You → ${to === 'A' ? 'Alice' : 'Bob'} | 
     ${enc ? '🔒 ' + ALGO_NAMES[algo] : '⚠ No encryption'}`
  );

  capturedPacket = {
    from,
    to,
    plain: text,
    encoded,
    algo,
    timestamp: new Date().toLocaleTimeString(),
    packetTime: packetTimestamp
  };

  lastPacket = { ...capturedPacket };

  showPacket(capturedPacket);

  animatePacket(from);

  log(
    `Packet intercepted from ${from === 'A' ? 'Alice' : 'Bob'} 
     [${enc ? ALGO_NAMES[algo] : 'PLAINTEXT'}]`,
    'warn'
  );

  if (!enc) {

    log(`⚠ Plaintext readable immediately: "${text}"`, 'warn');

  } else if (algo === 'hash') {

    log(`🛡 Message sent with attached HMAC for integrity verification`, 'ok');

  } else if (algo === 'timestamp') {

    log(`🛡 Message sent with timestamp + nonce + HMAC`, 'ok');

  } else {

    log(
      `Ciphertext: "${encoded.substring(0, 28)}…" — plaintext hidden, cracking needed!`,
      'info'
    );
  }

  setTimeout(() => {

    if (
      !capturedPacket ||
      capturedPacket.packetTime !== packetTimestamp
    )
      return;

    const weakAlgo = ['caesar', 'vigenere'];
    const protectedAlgo = ['aes', 'hash', 'timestamp'];

    if (weakAlgo.includes(algo)) {

      log(
        '⚠ Weak encryption detected — attacker may decrypt & control delivery',
        'warn'
      );

      log(
        'Eve can MODIFY / BLOCK / REPLAY the packet',
        'warn'
      );

      return;
    }

    if (protectedAlgo.includes(algo)) {

      log(
        'Attempting attack on protected encryption...',
        'info'
      );

      return;
    }
    deliverPacket(capturedPacket);

  }, 2200);

}

function deliverPacket(pkt) {
  const to = pkt.to;
  const enc = (pkt.from === 'A' ? encA : encB);
  const algo = pkt.algo;

  let displayed = pkt.plain;
  if (enc && (algo === 'hash' || algo === 'timestamp')) {
    displayed = doDec(pkt.encoded, algo, pkt.from);
  }

  addMsg(
    'chat' + to,
    `<b>${pkt.plain}</b>${enc && (algo === 'hash' || algo === 'timestamp') ? `<br>${displayed}` : ''}`,
    to === 'A' ? 'recv-b' : 'recv',
    `Received from ${pkt.from === 'A' ? 'Alice' : 'Bob'}`
  );

  log(`✓ Packet delivered to ${to === 'A' ? 'Alice' : 'Bob'}`, 'ok');
}

function animatePacket(from) {
  const el = document.createElement('div');
  el.className = 'packet-anim';
  el.textContent = '📦 PKT';
  document.body.appendChild(el);

  const pA = document.getElementById('panelA').getBoundingClientRect();
  const pB = document.getElementById('panelB').getBoundingClientRect();
  const pAt = document.getElementById('panelAtt').getBoundingClientRect();

  const sx = from === 'A' ? pA.right : pB.left - 55;
  const mx = pAt.left + pAt.width / 2 - 20;
  const sy = pA.top + 80;

  el.style.cssText = `left:${sx}px;top:${sy}px;position:fixed;transition:left 0.6s ease;`;

  requestAnimationFrame(() => {
    el.style.left = mx + 'px';
    setTimeout(() => {
      el.style.background = '#ff3366';
      el.style.boxShadow = '0 0 14px #ff3366';
      el.textContent = '☠ CAPTURED';
      setTimeout(() => el.remove(), 1200);
    }, 650);
  });
}

function startCrack() {
  if (!capturedPacket) { log('No packet to crack!', 'warn'); return; }
  const enc = (capturedPacket.from === 'A' ? encA : encB);
  if (!enc) { log('Packet is plaintext — nothing to crack!', 'info'); return; }

  document.getElementById('btnCrack').disabled = true;
  document.getElementById('crackAttempts').innerHTML = '';
  document.getElementById('crackResult').className = 'crack-result';
  crackedText = null;

  const algo = capturedPacket.algo;
  log(`🔓 Starting cryptanalysis on ${ALGO_NAMES[algo]}…`, 'purple');

  if (algo === 'caesar') crackCaesar(capturedPacket.encoded);
  else if (algo === 'vigenere') crackVigenere(capturedPacket.encoded);
  else if (algo === 'hash') crackHash(capturedPacket.encoded);
  else if (algo === 'timestamp') crackTimestamp(capturedPacket.encoded);
  else crackAES();
}

function crackHash(packet) {
  const aEl = document.getElementById('crackAttempts');
  const bEl = document.getElementById('crackBar');
  const rEl = document.getElementById('crackResult');

  const steps = [
    { pct: 12, msg: 'Eve captured packet with attached HMAC...' },
    { pct: 24, msg: 'Reading plaintext part of the packet...' },
    { pct: 38, msg: 'Integrity tied to secret key...' },
    { pct: 52, msg: 'Trying to forge new valid HMAC...' },
    { pct: 68, msg: 'Secret key unknown...' },
    { pct: 84, msg: 'Forgery impossible...' },
    { pct: 100, msg: '>>> HASH DEFENCE HOLDS <<<' }
  ];

  aEl.innerHTML = `<span style="color:#664">Integrity protection active<br></span>`;
  let i = 0;
  crackTimer = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(crackTimer);

      const obj = parseHashPacket(packet);

      crackedText = obj.plaintext;

      bEl.style.background = '#00aa66';
      bEl.style.width = '100%';
      bEl.textContent = 'SECURE';
      rEl.className = 'crack-result visible';
      rEl.innerHTML = `
        ✓ Message readable but cannot be modified safely
      `;
      log('Hash integrity holds — delivering original message', 'ok');
      deliverPacket(capturedPacket);
      document.getElementById('btnCrack').disabled = false;
      return;
    }
    const s = steps[i];
    bEl.style.width = s.pct + '%';
    bEl.textContent = s.pct + '%';
    aEl.innerHTML += `<div class="crack-attempt">${s.msg}</div>`;
    aEl.scrollTop = aEl.scrollHeight;
    i++;
  }, 420);
}

function crackCaesar(cipher) {
  const aEl = document.getElementById('crackAttempts');
  const bEl = document.getElementById('crackBar');
  const rEl = document.getElementById('crackResult');
  let shift = 1;

  aEl.innerHTML = `<span style="color:#664">Trying all 25 possible Caesar shifts...<br></span>`;
  crackTimer = setInterval(() => {
    const attempt = caesarDec(cipher, shift);
    const pct = Math.round((shift / 25) * 100);
    bEl.style.width = pct + '%';
    bEl.textContent = pct + '%';

    const hit = isReadable(attempt, shift === 13);
    aEl.innerHTML += `<div class="crack-attempt ${hit ? 'hit' : 'fail'}">Shift ${String(shift).padStart(2, '0')}: "${attempt.substring(0, 30)}" ${hit ? '← ✓ READABLE!' : ''}</div>`;
    aEl.scrollTop = aEl.scrollHeight;

    if (hit && !crackedText) crackedText = attempt;
    shift++;

    if (shift > 25) {
      clearInterval(crackTimer);
      bEl.style.width = '100%';
      bEl.textContent = '100% COMPLETE';
      crackedText = crackedText || caesarDec(cipher, 13);

      rEl.className = 'crack-result visible';
      rEl.innerHTML = `✓ CRACKED!<br><b>"${crackedText}"</b><br><span style="color:#556;font-size:0.62rem">Caesar is trivial to brute-force.</span>`;
      log(`✓ Caesar cracked`, 'ok');
      document.getElementById('btnCrack').disabled = false;
    }
  }, 180);
}

function crackVigenere(cipher) {
  const aEl = document.getElementById('crackAttempts');
  const bEl = document.getElementById('crackBar');
  const rEl = document.getElementById('crackResult');

  const steps = [
    'Running Kasiski examination...',
    'Finding repeated patterns...',
    'Estimated key length = 3',
    'Performing frequency analysis...',
    'Candidate key = "KEY"',
    'Testing decrypted output...',
    'English plaintext confirmed!'
  ];

  let i = 0;
  aEl.innerHTML = `<span style="color:#664">Trying statistical cryptanalysis on Vigenère...<br></span>`;

  crackTimer = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(crackTimer);
      crackedText = vigDec(cipher);
      rEl.className = 'crack-result visible';
      rEl.innerHTML = `✓ CRACKED!<br>Key = "KEY"<br><b>${crackedText}</b>`;
      log(`✓ Vigenère cracked`, 'ok');
      document.getElementById('btnCrack').disabled = false;
      return;
    }

    const pct = Math.round(((i + 1) / steps.length) * 100);
    bEl.style.width = pct + '%';
    bEl.textContent = pct + '%';
    aEl.innerHTML += `<div class="crack-attempt">${steps[i]}</div>`;
    aEl.scrollTop = aEl.scrollHeight;
    i++;
  }, 420);
}

function crackTimestamp(cipher) {
  const aEl = document.getElementById('crackAttempts');
  const bEl = document.getElementById('crackBar');
  const rEl = document.getElementById('crackResult');
  const steps = [
    'Captured packet',
    'Extracting timestamp...',
    'Checking nonce...',
    'Replay attempt failed...',
    'Forgery impossible...',
    'Integrity protected...',
    '>>> FULL DEFENCE HOLDS <<<'
  ];
  let i = 0;
  aEl.innerHTML = `<span style="color:#664">Checking freshness & integrity<br></span>`;
  crackTimer = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(crackTimer);
      bEl.style.background = '#00aa66';
      bEl.style.width = '100%';
      bEl.textContent = 'SECURE';
      rEl.className = 'crack-result visible';
      rEl.innerHTML = `
        ✓ Replay and tampering prevented
      `;
      log('Timestamp defence holds — delivering original message', 'ok');
      deliverPacket(capturedPacket);
      document.getElementById('btnCrack').disabled = false;
      return;
    }
    const pct = Math.round(((i + 1) / steps.length) * 100);
    bEl.style.width = pct + '%';
    bEl.textContent = pct + '%';
    aEl.innerHTML += `<div class="crack-attempt">${steps[i]}</div>`;
    aEl.scrollTop = aEl.scrollHeight;
    i++;
  }, 380);

}

function crackAES() {
  const aEl = document.getElementById('crackAttempts');
  const bEl = document.getElementById('crackBar');
  const rEl = document.getElementById('crackResult');

  const steps = [
    'Trying brute-force...',
    'Key space = 2^256',
    'Estimated time exceeds universe lifetime',
    'Trying cryptanalysis...',
    'No practical weakness found',
    '>>> AES HOLDS <<<'
  ];
  let i = 0;
  aEl.innerHTML = `<span style="color:#664">Attempting AES-256 cryptanalysis...<br></span>`;
  crackTimer = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(crackTimer);
      bEl.style.background = '#00aa66';
      bEl.style.width = '100%';
      bEl.textContent = 'SECURE';
      rEl.className = 'crack-result visible';
      rEl.innerHTML = `
        ✓ ATTACK FAILED
        <br>
        Message cannot be decrypted by attacker
      `;
      log('AES secure — delivering original message', 'ok');
      deliverPacket(capturedPacket);
      document.getElementById('btnCrack').disabled = false;
      return;
    }
    const pct = Math.round(((i + 1) / steps.length) * 100);
    bEl.style.width = pct + '%';
    bEl.textContent = pct + '%';

    aEl.innerHTML += `<div class="crack-attempt">${steps[i]}</div>`;

    aEl.scrollTop = aEl.scrollHeight;

    i++;

  }, 420);

}

function checkPacket() {
  if (!capturedPacket) {
    log('No packet captured yet!', 'warn');
    return false;
  }
  return true;
}

function showModify() {
  if (!checkPacket()) return;
  const area = document.getElementById('modifyArea');
  area.classList.toggle('visible');

  if (crackedText) {
    document.getElementById('modifyInput').value = crackedText;
    log('✏ Modify mode — using known plaintext', 'info');
  } else {
    document.getElementById('modifyInput').value = capturedPacket.plain;
    log('✏ Modify mode ready', 'info');
  }
}

function doModify() {

  if (!checkPacket()) return;

  const newText = document.getElementById('modifyInput').value.trim();

  if (!newText) return;

  const to = capturedPacket.to;
  const from = capturedPacket.from;
  const algo = capturedPacket.algo;

  log(`✏ MODIFY: "${capturedPacket.plain}" → "${newText}"`, 'warn');

  if (algo === 'hash') {

    addMsg(
      'chat' + to,
      `<b>${newText}</b><br><span style="color:#ff3366;font-size:0.62rem">✖ TAMPER DETECTED — HASH MISMATCH</span>`,
      'tampered',
      '🛡 HASH DEFENCE ACTIVATED'
    );

    addMsg(
      'chat' + from,
      `<span style="color:#ff3366">⚠ Attacker attempted to modify your message</span>`,
      'warn'
    );

    log('🛡 Hash defence blocked modification', 'ok');

    return;
  }

  if (algo === 'timestamp') {

    addMsg(
      'chat' + to,
      `<b>${newText}</b><br><span style="color:#ff3366;font-size:0.62rem">✖ TAMPER DETECTED — INVALID HMAC / TIMESTAMP</span>`,
      'tampered',
      '🛡 TIMESTAMP+HMAC DEFENCE ACTIVATED'
    );

    addMsg(
      'chat' + from,
      `<span style="color:#ff3366">⚠ Attacker attempted to modify your message</span>`,
      'warn'
    );

    log('🛡 Timestamp defence blocked modification', 'ok');

    return;
  }

  addMsg(
    'chat' + to,
    `<b>${newText}</b><br><span style="color:#ff3366;font-size:0.62rem">⚠ Modified by attacker</span>`,
    'tampered',
    `⚠ TAMPERED PACKET`
  );

  addMsg(
    'chat' + from,
    `<span style="color:#ff3366">⚠ Your message was modified by attacker</span>`,
    'warn'
  );

  document.getElementById('modifyArea').classList.remove('visible');

}

function doBlock() {

  if (!checkPacket()) return;

  const from = capturedPacket.from;

  log(`🚫 BLOCK: Packet dropped`, 'warn');

  addMsg(
    'chat' + capturedPacket.to,
    `<span style="color:#888">[ Message blocked by attacker — never arrived ]</span>`,
    'blocked',
    '🚫 Delivery failed'
  );

  addMsg(
    'chat' + from,
    `<span style="color:#ff3366">⚠ Your message was blocked by attacker</span>`,
    'warn'
  );

}

function doReplay() {

  const pkt = capturedPacket || lastPacket;

  if (!pkt) {

    log('No packet for replay!', 'warn');

    return;
  }

  const algo = pkt.algo;
  const to = pkt.to;
  const from = pkt.from;

  log(`🔁 REPLAY ATTACK attempted`, 'warn');

  if (algo === 'timestamp') {

    const decoded = doDec(pkt.encoded, algo, pkt.from);

    addMsg(
      'chat' + to,
      `<b>${pkt.plain}</b><br>${decoded}`,
      'tampered',
      `🔁 REPLAY ATTACK ATTEMPT`
    );

    addMsg(
      'chat' + from,
      `<span style="color:#ff3366">⚠ Replay attack detected on your message</span>`,
      'warn'
    );

    log('🛡 Replay blocked by timestamp/nonce defence', 'ok');

    return;
  }

  addMsg(
    'chat' + to,
    `<b>${pkt.plain}</b><br><span style="color:#00ccff;font-size:0.62rem">🔁 Old packet resent by Eve</span>`,
    'tampered',
    '🔁 REPLAY ATTACK'
  );

  addMsg(
    'chat' + from,
    `<span style="color:#ff3366">⚠ Your message was replayed by attacker</span>`,
    'warn'
  );

}

function toggleEnc(u) {
  if (u === 'A') {
    encA = !encA;
    document.getElementById('toggleA').classList.toggle('on', encA);
    document.getElementById('encLabelA').textContent = encA ? '🔒 Encryption ON' : '🔓 Encryption OFF';
    log(`Alice encryption ${encA ? 'ON' : 'OFF'}`, encA ? 'ok' : 'warn');
  } else {
    encB = !encB;
    document.getElementById('toggleB').classList.toggle('on', encB);
    document.getElementById('encLabelB').textContent = encB ? '🔒 Encryption ON' : '🔓 Encryption OFF';
    log(`Bob encryption ${encB ? 'ON' : 'OFF'}`, encB ? 'ok' : 'warn');
  }
}

function onAlgoChange(u) {
  const v = document.getElementById('algo' + u).value;
  if (u === 'A') algoA = v;
  else algoB = v;
  log(`${u === 'A' ? 'Alice' : 'Bob'} switched to ${ALGO_NAMES[v]}`, 'blue');
}

function isReadable(t, isShift13 = false) {
  if (t.length < 1) return false;
  if (isShift13) {
    return (t.match(/[^a-zA-Z0-9 .,!?'"\-@#$%&*()_+=:;]/g) || []).length === 0;
  }
  const s = ' ' + t.toLowerCase() + ' ';
  const words = [' the ', ' is ', ' in ', ' a ', ' to ', ' of ', ' and ', ' hi ', ' hello ', ' send ', ' meet ', ' bank ', ' pass ', ' secret '];
  return words.some(w => s.includes(w));
}

log('System ready.', 'blue');
log('Step 1: Alice or Bob sends a message', 'info');
log('Step 2: Eve intercepts the packet', 'info');
log('Step 3: Press CRACK to simulate attack', 'info');
log('Step 4: Try HASH and TIMESTAMP defence modes', 'info');