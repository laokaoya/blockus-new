// 游戏音效管理器 - 使用 Web Audio API 生成音效，无需外部音频文件

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', JSON.stringify(enabled));
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', JSON.stringify(this.volume));
  }

  getVolume(): number {
    return this.volume;
  }

  loadSettings() {
    const savedEnabled = localStorage.getItem('soundEnabled');
    if (savedEnabled !== null) {
      this.enabled = JSON.parse(savedEnabled);
    }
    const savedVolume = localStorage.getItem('soundVolume');
    if (savedVolume !== null) {
      this.volume = JSON.parse(savedVolume);
    }
  }

  // 播放音调
  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', gain: number = 1) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      const vol = this.volume * gain * 0.3;
      gainNode.gain.setValueAtTime(vol, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // 浏览器不支持或用户未交互，静默失败
    }
  }

  // 播放一组音调序列
  private playSequence(notes: Array<{ freq: number; delay: number; duration: number; type?: OscillatorType; gain?: number }>) {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      notes.forEach(({ freq, delay, duration, type = 'sine', gain = 1 }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

        const vol = this.volume * gain * 0.3;
        gainNode.gain.setValueAtTime(vol, ctx.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      });
    } catch {
      // 静默失败
    }
  }

  // 拼图放置成功音效 - 清脆的上升音
  placePiece() {
    this.playSequence([
      { freq: 523, delay: 0, duration: 0.1, type: 'sine' },
      { freq: 659, delay: 0.08, duration: 0.15, type: 'sine' },
    ]);
  }

  // 放置失败/无效操作
  invalidMove() {
    this.playTone(200, 0.2, 'square', 0.4);
  }

  // 选择拼图
  selectPiece() {
    this.playTone(440, 0.08, 'sine', 0.5);
  }

  // 旋转拼图
  rotatePiece() {
    this.playTone(600, 0.06, 'triangle', 0.4);
  }

  // 翻转拼图
  flipPiece() {
    this.playSequence([
      { freq: 500, delay: 0, duration: 0.05, type: 'triangle', gain: 0.4 },
      { freq: 400, delay: 0.05, duration: 0.05, type: 'triangle', gain: 0.4 },
    ]);
  }

  // 回合切换 - 轮到玩家
  yourTurn() {
    this.playSequence([
      { freq: 392, delay: 0, duration: 0.12, type: 'sine', gain: 0.6 },
      { freq: 523, delay: 0.12, duration: 0.12, type: 'sine', gain: 0.7 },
      { freq: 659, delay: 0.24, duration: 0.2, type: 'sine', gain: 0.8 },
    ]);
  }

  // AI回合开始
  aiTurn() {
    this.playTone(330, 0.15, 'sine', 0.3);
  }

  // AI放置拼图
  aiPlace() {
    this.playTone(440, 0.12, 'triangle', 0.35);
  }

  // 玩家结算
  settle() {
    this.playSequence([
      { freq: 440, delay: 0, duration: 0.15, type: 'sine', gain: 0.5 },
      { freq: 349, delay: 0.15, duration: 0.25, type: 'sine', gain: 0.4 },
    ]);
  }

  // 游戏胜利 - 欢快的上升旋律
  gameWin() {
    this.playSequence([
      { freq: 523, delay: 0, duration: 0.15, type: 'sine', gain: 0.7 },
      { freq: 659, delay: 0.15, duration: 0.15, type: 'sine', gain: 0.7 },
      { freq: 784, delay: 0.3, duration: 0.15, type: 'sine', gain: 0.8 },
      { freq: 1047, delay: 0.45, duration: 0.35, type: 'sine', gain: 0.9 },
    ]);
  }

  // 游戏失败 - 下行旋律
  gameLose() {
    this.playSequence([
      { freq: 392, delay: 0, duration: 0.2, type: 'sine', gain: 0.5 },
      { freq: 349, delay: 0.2, duration: 0.2, type: 'sine', gain: 0.45 },
      { freq: 294, delay: 0.4, duration: 0.3, type: 'sine', gain: 0.4 },
    ]);
  }

  // 游戏结束通用音效
  gameOver() {
    this.playSequence([
      { freq: 523, delay: 0, duration: 0.2, type: 'triangle', gain: 0.6 },
      { freq: 440, delay: 0.2, duration: 0.2, type: 'triangle', gain: 0.5 },
      { freq: 523, delay: 0.4, duration: 0.3, type: 'triangle', gain: 0.7 },
    ]);
  }

  // 倒计时警告（时间快到了）
  timeWarning() {
    this.playTone(800, 0.08, 'square', 0.3);
  }

  // 按钮点击 - 机械感短音
  buttonClick() {
    this.playTone(800, 0.03, 'square', 0.15);
  }

  // 按钮悬停 - 高频微弱音
  buttonHover() {
    this.playTone(1200, 0.02, 'sine', 0.05);
  }

  // 界面切换 - 科技感扫频（柔和版）
  pageTransition() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.4);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(2000, ctx.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }

  // 消息通知音效
  messageNotification() {
    this.playSequence([
      { freq: 880, delay: 0, duration: 0.1, type: 'sine', gain: 0.3 },
      { freq: 1760, delay: 0.1, duration: 0.15, type: 'sine', gain: 0.2 },
    ]);
  }
}

// 单例导出
const soundManager = new SoundManager();
soundManager.loadSettings();

export default soundManager;
