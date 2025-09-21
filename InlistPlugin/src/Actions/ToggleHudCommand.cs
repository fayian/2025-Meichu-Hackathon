namespace Loupedeck.InlistPlugin.Actions {
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    using Loupedeck.InlistPlugin.Services;

    public class ToggleHudCommand : PluginDynamicCommand {
        // Initializes the command class.
        public ToggleHudCommand()
            : base(displayName: "顯示/隱藏 HUD", description: "切換HUD顯示狀態", groupName: "Inlisted") {
        }

        protected override void RunCommand(String actionParameter) {
            // Send toggle-hud command to WebSocket server
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
                            command = "toggle-hud",
                            data = new { }
                        };

                        await plugin.SendJsonToServerAsync(commandData);
                        PluginLog.Info("Sent toggle-hud command to server");
                    } else {
                        PluginLog.Warning("WebSocket not connected, toggle-hud command not sent");
                    }
                } catch (Exception ex) {
                    PluginLog.Error($"Failed to send toggle-hud command: {ex.Message}");
                }
            });
        }
    }
}