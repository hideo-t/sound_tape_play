/**
 * カセットデッキ・シミュレーター with Audio Player
 * 実際の音声ファイルを再生できるデッキ
 */

// ===================================
// グローバル状態管理
// ===================================
const state = {
    power: false,
    ejected: false,
    mode: 'STOP',
    counter: 0,
    wear: 0,
    meterLevels: { L: 0, R: 0 },
    
    // オーディオ関連
    audioLoaded: false,
    audioPlaying: false,
    audioDuration: 0,
    audioCurrentTime: 0,
    
    // カセットリール用の状態
    cassette: {
        leftReelAngle: 0,
        rightReelAngle: 0,
        leftTapeAmount: 32,
        rightTapeAmount: 18
    }
};

// ===================================
// DOM要素の取得
// ===================================
const elements = {
    // ファイル選択
    audioFile: document.getElementById('audioFile'),
    fileInfo: document.getElementById('fileInfo'),
    audioPlayer: document.getElementById('audioPlayer'),
    
    // デッキボタン
    powerButton: document.getElementById('powerButton'),
    ejectButton: document.getElementById('ejectButton'),
    stopButton: document.getElementById('stopButton'),
    playButton: document.getElementById('playButton'),
    pauseButton: document.getElementById('pauseButton'),
    rewButton: document.getElementById('rewButton'),
    fwdButton: document.getElementById('fwdButton'),
    recordButton: document.getElementById('recordButton'),
    recMuteButton: document.getElementById('recMuteButton'),
    returnToZeroBtn: document.getElementById('returnToZeroBtn'),
    counterResetBtn: document.getElementById('counterResetBtn'),
    
    // ディスプレイ
    powerLed: document.getElementById('powerLed'),
    counter: document.getElementById('counter'),
    duration: document.getElementById('duration'),
    statusText: document.getElementById('statusText'),
    fileName: document.getElementById('fileName'),
    
    // カセット関連
    ejectOverlay: document.getElementById('ejectOverlay'),
    cassetteSvg: document.getElementById('cassette-tape-svg'),
    cassetteReelLeft: document.getElementById('cassette-reel-left'),
    cassetteReelRight: document.getElementById('cassette-reel-right'),
    cassetteTapePackLeft: document.getElementById('cassette-tape-pack-left'),
    cassetteTapePackRight: document.getElementById('cassette-tape-pack-right'),
    
    // テープ劣化
    wearFill: document.getElementById('wearFill'),
    wearStatus: document.getElementById('wearStatus'),
    
    // メーター
    meterLeds: document.querySelectorAll('.meter-led')
};

// ===================================
// ファイル選択処理
// ===================================
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // ファイル情報を表示
    elements.fileInfo.textContent = `📀 ${file.name}`;
    elements.fileInfo.classList.add('loaded');
    elements.fileName.textContent = file.name;
    
    // オーディオファイルを読み込み
    const url = URL.createObjectURL(file);
    elements.audioPlayer.src = url;
    
    state.audioLoaded = true;
    
    // メタデータ読み込み時の処理
    elements.audioPlayer.addEventListener('loadedmetadata', () => {
        state.audioDuration = elements.audioPlayer.duration;
        updateTimeDisplay();
        console.log('Audio loaded:', file.name, 'Duration:', formatTime(state.audioDuration));
    });
    
    // 自動的に電源ONとカセット挿入
    if (!state.power) {
        state.power = true;
        elements.powerLed.classList.add('on');
    }
    if (state.ejected) {
        state.ejected = false;
        elements.ejectOverlay.classList.remove('active');
        if (elements.cassetteSvg) {
            elements.cassetteSvg.style.transform = 'translateY(0)';
        }
    }
    
    updateDisplay();
}

// ===================================
// 時間フォーマット
// ===================================
function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTimeDisplay() {
    elements.counter.textContent = formatTime(state.audioCurrentTime);
    elements.duration.textContent = formatTime(state.audioDuration);
}

// ===================================
// オーディオアナライザー（リアルタイムメーター用）
// ===================================
let audioContext = null;
let analyser = null;
let dataArray = null;

function setupAudioAnalyser() {
    if (audioContext) return;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        const source = audioContext.createMediaElementSource(elements.audioPlayer);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        console.log('Audio analyser setup complete');
    } catch (e) {
        console.warn('Audio analyser setup failed:', e);
    }
}

function getAudioLevel() {
    if (!analyser || !dataArray || !state.audioPlaying) {
        return { L: 0, R: 0 };
    }
    
    analyser.getByteFrequencyData(dataArray);
    
    // 平均レベルを計算（0-255 → 0-10）
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    const level = (average / 255) * 10;
    
    // 左右に少しランダム性を持たせる
    return {
        L: Math.min(10, level + (Math.random() - 0.5) * 1),
        R: Math.min(10, level + (Math.random() - 0.5) * 1)
    };
}

// ===================================
// ボタン操作ハンドラー
// ===================================
function handlePowerButton() {
    state.power = !state.power;
    
    if (state.power) {
        elements.powerLed.classList.add('on');
    } else {
        elements.powerLed.classList.remove('on');
        stopAllOperations();
        clearAllActiveStates();
        if (state.audioPlaying) {
            elements.audioPlayer.pause();
            state.audioPlaying = false;
        }
    }
    
    updateDisplay();
}

function handleEjectButton() {
    if (!state.power) return;
    
    state.ejected = !state.ejected;
    
    if (state.ejected) {
        stopAllOperations();
        if (state.audioPlaying) {
            elements.audioPlayer.pause();
            state.audioPlaying = false;
        }
        elements.ejectOverlay.classList.add('active');
        elements.statusText.textContent = 'EJECTED';
        
        if (elements.cassetteSvg) {
            elements.cassetteSvg.style.transform = 'translateY(-10px)';
        }
    } else {
        elements.ejectOverlay.classList.remove('active');
        elements.statusText.textContent = 'STOPPED';
        state.wear = Math.max(0, state.wear - 5);
        updateWearDisplay();
        
        if (elements.cassetteSvg) {
            elements.cassetteSvg.style.transform = 'translateY(0)';
        }
    }
}

function handleStopButton() {
    if (!state.power || state.ejected) return;
    
    stopAllOperations();
    clearAllActiveStates();
    elements.stopButton.classList.add('active');
    setTimeout(() => elements.stopButton.classList.remove('active'), 200);
    
    if (state.audioPlaying) {
        elements.audioPlayer.pause();
        state.audioPlaying = false;
    }
}

function handlePlayButton() {
    if (!state.power || state.ejected) return;
    if (!state.audioLoaded) {
        alert('音声ファイルを選択してください');
        return;
    }
    
    if (state.mode === 'PLAY') {
        // 既に再生中の場合は一時停止
        handlePauseButton();
        return;
    }
    
    stopAllOperations();
    clearAllActiveStates();
    
    state.mode = 'PLAY';
    elements.playButton.classList.add('active');
    
    // 音声再生
    setupAudioAnalyser();
    elements.audioPlayer.play().then(() => {
        state.audioPlaying = true;
        console.log('Playing audio');
    }).catch(err => {
        console.error('Play failed:', err);
    });
    
    updateDisplay();
}

function handlePauseButton() {
    if (!state.power || state.ejected) return;
    if (state.mode === 'STOP') return;
    
    if (state.mode === 'PAUSE') {
        // PAUSE解除
        state.mode = 'PLAY';
        elements.pauseButton.classList.remove('active');
        elements.playButton.classList.add('active');
        
        if (state.audioLoaded && !state.audioPlaying) {
            elements.audioPlayer.play().then(() => {
                state.audioPlaying = true;
            });
        }
    } else {
        // PAUSE開始
        state.mode = 'PAUSE';
        elements.pauseButton.classList.add('active');
        
        if (state.audioPlaying) {
            elements.audioPlayer.pause();
            state.audioPlaying = false;
        }
    }
    
    updateDisplay();
}

function handleRewindButton() {
    if (!state.power || state.ejected) return;
    if (!state.audioLoaded) return;
    
    elements.audioPlayer.currentTime = Math.max(0, elements.audioPlayer.currentTime - 5);
    state.audioCurrentTime = elements.audioPlayer.currentTime;
    updateTimeDisplay();
}

function handleFastForwardButton() {
    if (!state.power || state.ejected) return;
    if (!state.audioLoaded) return;
    
    elements.audioPlayer.currentTime = Math.min(state.audioDuration, elements.audioPlayer.currentTime + 5);
    state.audioCurrentTime = elements.audioPlayer.currentTime;
    updateTimeDisplay();
}

function handleReturnToZero() {
    if (!state.power || state.ejected) return;
    if (!state.audioLoaded) return;
    
    elements.audioPlayer.currentTime = 0;
    state.audioCurrentTime = 0;
    updateTimeDisplay();
}

function handleCounterReset() {
    handleReturnToZero();
}

// ===================================
// 補助関数
// ===================================
function stopAllOperations() {
    state.mode = 'STOP';
    state.meterLevels.L = 0;
    state.meterLevels.R = 0;
}

function clearAllActiveStates() {
    elements.playButton.classList.remove('active');
    elements.pauseButton.classList.remove('active');
    elements.recordButton.classList.remove('active');
    elements.rewButton.classList.remove('active');
    elements.fwdButton.classList.remove('active');
}

function updateDisplay() {
    if (!state.power) {
        elements.statusText.textContent = 'POWER OFF';
        elements.fileName.textContent = '---';
    } else if (state.ejected) {
        elements.statusText.textContent = 'EJECTED';
    } else {
        elements.statusText.textContent = state.mode;
    }
}

function updateWearDisplay() {
    elements.wearFill.style.width = state.wear + '%';
    
    if (state.wear < 30) {
        elements.wearStatus.textContent = 'EXCELLENT';
        elements.wearStatus.style.color = 'var(--led-green)';
    } else if (state.wear < 60) {
        elements.wearStatus.textContent = 'GOOD';
        elements.wearStatus.style.color = 'var(--led-orange)';
    } else if (state.wear < 85) {
        elements.wearStatus.textContent = 'FAIR';
        elements.wearStatus.style.color = 'var(--led-orange)';
    } else {
        elements.wearStatus.textContent = 'POOR';
        elements.wearStatus.style.color = 'var(--led-red)';
    }
}

// ===================================
// カセットリールのアニメーション
// ===================================
function updateCassetteReels() {
    if (!state.power || state.ejected) return;
    
    let leftSpeed = 0;
    let rightSpeed = 0;
    let tapeTransfer = 0;
    
    if (state.mode === 'PLAY' && state.audioPlaying) {
        leftSpeed = 0.8;
        rightSpeed = 1.5;
        
        // 再生位置に基づいてテープ量を計算
        if (state.audioDuration > 0) {
            const progress = state.audioCurrentTime / state.audioDuration;
            state.cassette.leftTapeAmount = 10 + progress * 25;
            state.cassette.rightTapeAmount = 35 - progress * 25;
        }
    }
    
    if (leftSpeed !== 0 || rightSpeed !== 0) {
        state.cassette.leftReelAngle += leftSpeed;
        state.cassette.rightReelAngle += rightSpeed;
        
        if (state.cassette.leftReelAngle >= 360) state.cassette.leftReelAngle -= 360;
        if (state.cassette.rightReelAngle >= 360) state.cassette.rightReelAngle -= 360;
    }
    
    // SVG要素を更新
    if (elements.cassetteReelLeft) {
        elements.cassetteReelLeft.setAttribute('transform', 
            `translate(260, 305) rotate(${state.cassette.leftReelAngle})`);
    }
    if (elements.cassetteReelRight) {
        elements.cassetteReelRight.setAttribute('transform', 
            `translate(460, 305) rotate(${state.cassette.rightReelAngle})`);
    }
    if (elements.cassetteTapePackLeft) {
        elements.cassetteTapePackLeft.setAttribute('r', state.cassette.leftTapeAmount);
    }
    if (elements.cassetteTapePackRight) {
        elements.cassetteTapePackRight.setAttribute('r', state.cassette.rightTapeAmount);
    }
}

// ===================================
// メーターアニメーション
// ===================================
function updateMeters() {
    if (!state.power || state.mode !== 'PLAY' || !state.audioPlaying) {
        state.meterLevels.L *= 0.9;
        state.meterLevels.R *= 0.9;
    } else {
        // 実際の音声レベルを取得
        const audioLevel = getAudioLevel();
        state.meterLevels.L = audioLevel.L;
        state.meterLevels.R = audioLevel.R;
    }
    
    // LED更新
    elements.meterLeds.forEach(led => {
        const level = parseInt(led.getAttribute('data-level'));
        const channel = led.closest('.meter-channel').querySelector('.channel-label').textContent;
        const meterLevel = channel === 'L' ? state.meterLevels.L : state.meterLevels.R;
        
        if (level <= Math.floor(meterLevel)) {
            led.classList.add('active');
        } else {
            led.classList.remove('active');
        }
    });
}

// ===================================
// オーディオイベントリスナー
// ===================================
function setupAudioEventListeners() {
    // 再生時間更新
    elements.audioPlayer.addEventListener('timeupdate', () => {
        state.audioCurrentTime = elements.audioPlayer.currentTime;
        updateTimeDisplay();
    });
    
    // 再生終了
    elements.audioPlayer.addEventListener('ended', () => {
        state.audioPlaying = false;
        handleStopButton();
        console.log('Playback ended');
    });
    
    // エラー処理
    elements.audioPlayer.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        alert('音声ファイルの再生に失敗しました');
    });
}

// ===================================
// アニメーションループ
// ===================================
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 100;

function animationLoop(timestamp) {
    if (timestamp - lastUpdateTime >= UPDATE_INTERVAL) {
        updateMeters();
        lastUpdateTime = timestamp;
    }
    
    updateCassetteReels();
    
    requestAnimationFrame(animationLoop);
}

// ===================================
// イベントリスナー登録
// ===================================
function initEventListeners() {
    // ファイル選択
    elements.audioFile.addEventListener('change', handleFileSelect);
    
    // デッキボタン
    elements.powerButton.addEventListener('click', handlePowerButton);
    elements.ejectButton.addEventListener('click', handleEjectButton);
    elements.stopButton.addEventListener('click', handleStopButton);
    elements.playButton.addEventListener('click', handlePlayButton);
    elements.pauseButton.addEventListener('click', handlePauseButton);
    elements.rewButton.addEventListener('click', handleRewindButton);
    elements.fwdButton.addEventListener('click', handleFastForwardButton);
    elements.returnToZeroBtn.addEventListener('click', handleReturnToZero);
    elements.counterResetBtn.addEventListener('click', handleCounterReset);
    
    // オーディオイベント
    setupAudioEventListeners();
}

// ===================================
// 初期化
// ===================================
function init() {
    console.log('🎵 カセットデッキ・シミュレーター with Audio Player 起動');
    initEventListeners();
    updateDisplay();
    updateWearDisplay();
    
    if (elements.cassetteSvg) {
        elements.cassetteSvg.style.transition = 'transform 0.3s ease';
    }
    
    requestAnimationFrame(animationLoop);
    
    console.log('準備完了。音声ファイルを選択してください。');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
