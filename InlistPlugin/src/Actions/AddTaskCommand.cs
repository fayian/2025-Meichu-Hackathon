namespace Loupedeck.InlistPlugin.Actions {
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    using Loupedeck.InlistPlugin.Services;

    public class AddTaskCommand : PluginDynamicCommand {
        // Initializes the command class.
        public AddTaskCommand()
            : base(displayName: "新增任務", description: "快速在任務清單中新增任務", groupName: "Inlisted") {
        }

        protected override void RunCommand(String actionParameter) {
            // Send new-task command to WebSocket server
            _ = Task.Run(async () => {
                try {
                    var plugin = this.Plugin as InlistPlugin;
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
                            command = "new-task",
                            data = new { }
                        };

                        await plugin.SendJsonToServerAsync(commandData);
                        PluginLog.Info("Sent new-task command to server");
                    } else {
                        PluginLog.Warning("WebSocket not connected, new-task command not sent");
                    }
                } catch (Exception ex) {
                    PluginLog.Error($"Failed to send new-task command: {ex.Message}");
                }
            });
        }
    }
}
