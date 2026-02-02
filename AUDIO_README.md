# カセットデッキ・シミュレーター with Audio Player

**実際の音声ファイルを再生できる**精密カセットデッキシミュレーター！

## 🎵 主な機能

### 音声ファイル再生
- **対応フォーマット**: MP3, WAV, OGG, AAC, M4A など（ブラウザ対応形式）
- **ファイル選択**: クリックで任意の音声ファイルを選択
- **PLAYボタン**: 実際に音楽が再生される
- **リアルタイムメーター**: 音声レベルに連動してLEDメーターが動く

### カセットアニメーション
- **リール回転**: 再生中はリールが回転
- **テープ量変化**: 再生位置に応じて左右のテープ量が変化
- **完全同期**: 音楽とアニメーションが完全に同期

### トランスポート操作
- **PLAY/STOP/PAUSE**: 音楽の再生制御
- **REW/FFWD**: 5秒戻る/5秒進む
- **RETURN TO ZERO**: 曲の先頭に戻る
- **タイムカウンター**: 現在時刻/総時間を表示

## 📁 ファイル構成

```
audio-cassette-deck/
├── audio-deck-simulator.html   # メインHTML
├── audio-deck-style.css        # スタイルシート
├── audio-deck-main.js          # JavaScript（音声再生機能）
└── AUDIO_README.md             # このファイル
```

## 🎮 使い方

### 1. 音声ファイルを選択

1. ブラウザで `audio-deck-simulator.html` を開く
2. **「音声ファイルを選択」**ボタンをクリック
3. MP3やWAVファイルを選択
4. 自動的に電源ONとカセット挿入

### 2. 再生操作

- **▶ PLAY**: 音楽再生開始
- **■ STOP**: 停止
- **⏸ PAUSE**: 一時停止
- **⏪ REW**: 5秒戻る
- **⏩ F FWD**: 5秒進む

### 3. その他の操作

- **⏏ EJECT**: カセット取り出し（再生停止）
- **POWER**: 電源ON/OFF
- **RETURN TO ZERO**: 曲の先頭に戻る
- **COUNTER RESET**: 曲の先頭に戻る

## ✨ 特徴

### リアルタイム音声解析
- **WebAudio API**を使用して音声レベルを解析
- LEDメーターが実際の音量に連動
- 左右チャンネルを別々に表示

### スマートなテープアニメーション
- 再生位置に応じてテープ量が変化
- 曲の最初: 右リールが大きい
- 曲の最後: 左リールが大きい
- リアルなカセットテープの動きを再現

### 対応ファイル形式
| フォーマット | 拡張子 | 対応 |
|------------|--------|------|
| MP3 | .mp3 | ✅ |
| WAV | .wav | ✅ |
| OGG | .ogg | ✅ |
| AAC | .m4a, .aac | ✅ |
| FLAC | .flac | ⚠️ ブラウザ依存 |

## 🔧 技術的詳細

### 音声解析

```javascript
// WebAudio APIでリアルタイム解析
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

// 音声レベルを取得
analyser.getByteFrequencyData(dataArray);
const level = (average / 255) * 10; // 0-10のレベル
```

### タイムコード表示

```javascript
// MM:SS形式で表示
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
```

### テープ量の計算

```javascript
// 再生位置に基づいてテープ量を計算
const progress = currentTime / duration; // 0.0 〜 1.0
leftTapeAmount = 10 + progress * 25;     // 10 〜 35
rightTapeAmount = 35 - progress * 25;    // 35 〜 10
```

## 🎨 カスタマイズ

### リール回転速度の変更

`audio-deck-main.js` の `updateCassetteReels()`:

```javascript
if (state.mode === 'PLAY' && state.audioPlaying) {
    leftSpeed = 0.8;    // ← 左リールの速度
    rightSpeed = 1.5;   // ← 右リールの速度
}
```

### メーターの感度調整

```javascript
// 音声レベルの倍率を変更
const level = (average / 255) * 10 * 1.5; // ← 1.5倍
```

### タイムカウンターの表示形式

```javascript
// HH:MM:SS形式に変更
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
```

## 🚀 応用例

### プレイリスト機能の追加

```javascript
const playlist = [file1, file2, file3];
let currentIndex = 0;

audioPlayer.addEventListener('ended', () => {
    currentIndex = (currentIndex + 1) % playlist.length;
    loadAudioFile(playlist[currentIndex]);
    audioPlayer.play();
});
```

### 音量コントロール

```javascript
// REC LEVELノブで音量調整
recLevelKnob.addEventListener('input', (e) => {
    audioPlayer.volume = e.target.value / 100;
});
```

### イコライザー追加

```javascript
const bassBoost = audioContext.createBiquadFilter();
bassBoost.type = 'lowshelf';
bassBoost.frequency.value = 200;
bassBoost.gain.value = 10;

source.connect(bassBoost);
bassBoost.connect(analyser);
```

## ⚠️ 注意事項

### ブラウザ制限
- 初回の音声再生にはユーザー操作が必要（自動再生ポリシー）
- ファイル選択後に自動でPLAYはされません

### 対応ブラウザ
- Chrome/Edge 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- iOS Safari 14+ ✅

### パフォーマンス
- 大きなファイル（>100MB）は読み込みに時間がかかる場合があります
- メーター解析はCPU使用率を少し上げます

## 🐛 トラブルシューティング

### 音が出ない
1. ブラウザの音量を確認
2. ファイルが正しく選択されているか確認
3. POWERがONになっているか確認
4. ブラウザのコンソールでエラーを確認

### メーターが動かない
- WebAudio APIが正しく初期化されているか確認
- `setupAudioAnalyser()` が実行されているか確認

### リールが回らない
- PLAY状態になっているか確認
- `state.audioPlaying` が `true` か確認

## 📝 ライセンス

このプロジェクトはオリジナル作品です。
音声ファイルの著作権は各ファイルの権利者に帰属します。

---

© 2026 Cassette Deck Simulator with Audio Player

**楽しいカセット体験を！** 🎵📼
