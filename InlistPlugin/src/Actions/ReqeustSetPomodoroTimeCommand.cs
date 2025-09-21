namespace Loupedeck.InlistPlugin.Actions {
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class ReqeustSetPomodoroTimeCommand : PluginDynamicFolder {
        private readonly int[] _timeOptions = { 15, 20, 25, 30, 40, 50 };

        public ReqeustSetPomodoroTimeCommand() {
            this.DisplayName = "設定番茄鐘時間";
            this.Description = "選擇番茄鐘計時時間";
            this.GroupName = "Inlisted";
        }
        public override IEnumerable<String> GetButtonPressActionNames(DeviceType deviceType) {
            //placeholer
            for(int i = 0; i < 2; i++) {
                yield return this.CreateCommandName("");
            }

            foreach (var minutes in _timeOptions) {
                yield return this.CreateCommandName(minutes.ToString() + "分");
            }
        }

        public override void RunCommand(String actionParamenter) {
            try {
                if (int.TryParse(actionParamenter.Substring(0, 2), out int minutes)) {
                    SendSetTimeCommand(minutes);
                    this.Close();
                } else {
                    PluginLog.Error($"Failed to parse minutes from action name: {actionParamenter}");
                }
            }
            catch (Exception ex) {
                PluginLog.Error($"Error in ReqeustSetPomodoroTimeCommand.RunCommand: {ex.Message}");
            }
        }

        private async void SendSetTimeCommand(int minutes) {
            try {
                var plugin = this.Plugin as InlistPlugin;
                
                // 檢查 WebSocket 連線狀態
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

                if (plugin?.WebSocketService?.IsConnected == true) {
                    var commandData = new {
                        command = "pomodoro-request-set-time",
                        data = new { minutes = minutes }
                    };

                    await plugin.SendJsonToServerAsync(commandData);
                    PluginLog.Info($"Sent pomodoro-request-set-time command with {minutes} minutes to server");
                } else {
                    PluginLog.Warning("WebSocket not connected, pomodoro-request-set-time command not sent");
                }
            }
            catch (Exception ex) {
                PluginLog.Error($"Failed to send pomodoro-request-set-time command: {ex.Message}");
            }
        }
    }
}
