namespace Loupedeck.InlistPlugin.Actions {
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using System.Timers;
    using System.Text.Json;

    public class ShowPomodoroTimeCommand : PluginDynamicCommand { 
        private Timer _pomodoroTimer;
        private Int32 _remainingSeconds;
        private bool _isPaused;
        private bool _isActive;
        private static ShowPomodoroTimeCommand _instance;
        private bool _disposed = false;

        public ShowPomodoroTimeCommand()
            : base(displayName: "番茄鐘", description: "顯示番茄鐘計時器狀態", groupName: "Inlisted") {
            this.Name = "bs";
            _pomodoroTimer = new Timer(1000); // 每秒更新
            _pomodoroTimer.Elapsed += OnTimerElapsed;
            _remainingSeconds = 0;
            _isPaused = false;
            _isActive = false;
            _instance = this;
        }

        public static ShowPomodoroTimeCommand Instance => _instance;

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) {
            if (_isActive) {
                if (_isPaused) {
                    return $"⏸️ {(_remainingSeconds/60):D2}:{(_remainingSeconds%60):D2}";
                } else {
                    return $"{(_remainingSeconds / 60):D2}:{(_remainingSeconds % 60):D2}";
                }
            }
            return "番茄鐘";
        }


        protected override void RunCommand(String actionParameter) {
            var plugin = this.Plugin as InlistPlugin;
            if (plugin?.WebSocketService?.IsConnected == false) {
                PluginLog.Info("WebSocket not connected, attempting to connect...");
                _ = Task.Run(async () => {
                    try {
                        await plugin?.WebSocketService.ConnectAsync();
                        PluginLog.Info("WebSocket connected successfully");
                    } catch (Exception ex) {
                        PluginLog.Error($"Failed to connect to WebSocket server: {ex.Message}");
                    }
                });
            }
            // TODO: 當按下按鈕時，切換暫停/繼續或開始新的計時
        }

        private void OnTimerElapsed(object sender, ElapsedEventArgs e) {
            if (_isPaused || !_isActive) return;

            _remainingSeconds--;
            if (_remainingSeconds <= 0) {
                StopPomodoro();
            }

            // 更新顯示
            this.ActionImageChanged();
        }

        public void HandlePomodoroCommand(string command, JsonElement data) {
            JsonElement setSecondsProperty;
            switch (command) {
                case "pomodoro-start":
                    data.TryGetProperty("seconds", out setSecondsProperty);
                    StartPomodoro(setSecondsProperty.GetInt32());
                    break;

                case "pomodoro-stop":
                    StopPomodoro();
                    break;

                case "pomodoro-pause":
                    PausePomodoro();
                    break;

                case "pomodoro-set-time":
                    if (data.TryGetProperty("seconds", out setSecondsProperty)) {
                        SetPomodoroTime(setSecondsProperty.GetInt32());
                    }
                    break;

                default:
                    PluginLog.Warning($"Unknown pomodoro command: {command}");
                    break;
            }
        }

        private void StartPomodoro(Int32 seconds) {
            if (seconds <= 0) {
                PluginLog.Warning("Pomodoro already finished");
                return;
            }

            _remainingSeconds = seconds;
            _isPaused = false;
            _isActive = true;

            _pomodoroTimer.Start();
            this.ActionImageChanged();
        }

        private void StopPomodoro() {
            _pomodoroTimer.Stop();
            _isActive = false;
            _isPaused = false;
            _remainingSeconds = 0;

            this.ActionImageChanged();
        }

        private void PausePomodoro() {
            if (_isActive && !_isPaused) {
                _isPaused = true;
                this.ActionImageChanged();
            }
        }

        private void SetPomodoroTime(Int32 seconds) {
            _remainingSeconds = seconds;
        }

        // 提供公開方法讓其他組件查詢狀態
        public bool IsActive => _isActive;
        public bool IsPaused => _isPaused;
        public Int32 RemainingSeconds => _remainingSeconds;
    }
}
