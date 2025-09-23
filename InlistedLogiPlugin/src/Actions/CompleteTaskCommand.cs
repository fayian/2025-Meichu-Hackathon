namespace Loupedeck.InlistedPlugin.Actions
{
    using System;
    using System.Threading.Tasks;

    using Loupedeck.InlistedPlugin;
    using Loupedeck.InlistedPlugin.Helpers;

    public class CompleteTaskCommand : PluginDynamicCommand {
        // Initializes the command class.
        public CompleteTaskCommand()
            : base(displayName: "完成任務", description: "標記當前任務為已完成", groupName: "Inlisted") {
        }

        protected override void RunCommand(String actionParameter) {
            // Send complete-task command to WebSocket server
            _ = Task.Run(async () => {
                try {
                    var plugin = this.Plugin as InlistedPlugin;
                    if(plugin?.WebSocketService?.IsConnected == false) {
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
                            command = "complete-task",
                            data = new { }
                        };

                        await plugin.SendJsonToServerAsync(commandData);
                        PluginLog.Info("Sent complete-task command to server");
                    } else {
                        PluginLog.Warning("WebSocket not connected, complete-task command not sent");
                    }
                } catch (Exception ex) {
                    PluginLog.Error($"Failed to send complete-task command: {ex.Message}");
                }
            });
        }
    }
}