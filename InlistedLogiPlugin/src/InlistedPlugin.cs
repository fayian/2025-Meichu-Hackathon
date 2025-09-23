namespace Loupedeck.InlistedPlugin
{
    using System;
    using System.Threading.Tasks;
    using System.Text.Json;
    using Loupedeck.InlistedPlugin.Helpers;
    using Loupedeck.InlistedPlugin.Actions;
    using Loupedeck.InlistedPlugin.Services;

    // This class contains the plugin-level logic of the Loupedeck plugin.

    public class InlistedPlugin : Plugin {
        private WebSocketService _webSocketService;

        // Gets a value indicating whether this is an API-only plugin.
        public override Boolean UsesApplicationApiOnly => true;

        // Gets a value indicating whether this is a Universal plugin or an Application plugin.
        public override Boolean HasNoApplication => false;

        // Gets the WebSocket service instance
        public WebSocketService WebSocketService => _webSocketService;

        // Initializes a new instance of the plugin class.
        public InlistedPlugin() {
            // Initialize the plugin log.
            PluginLog.Init(this.Log);

            // Initialize the plugin resources.
            PluginResources.Init(this.Assembly);

            // Initialize WebSocket service
            _webSocketService = new WebSocketService("ws://localhost:7777");
            SetupWebSocketEventHandlers();
        }

        // This method is called when the plugin is loaded.
        public override void Load() {
           
        }

        // This method is called when the plugin is unloaded.
        public override void Unload() {
        }

        private void SetupWebSocketEventHandlers() {
            _webSocketService.Connected += (sender, e) => {
                PluginLog.Info("WebSocket connected to server");
            };

            _webSocketService.Disconnected += (sender, e) => {
                PluginLog.Warning("WebSocket disconnected from server");

                // Attempt to reconnect after a delay
                _ = Task.Run(async () => {
                    await Task.Delay(5000); // Wait 5 seconds before reconnecting
                    try {
                        if (!_webSocketService.IsConnected) {
                            PluginLog.Info("Attempting to reconnect to WebSocket server...");
                            await _webSocketService.ConnectAsync();
                        }
                    } catch (Exception ex) {
                        PluginLog.Error($"Failed to reconnect to WebSocket server: {ex.Message}");
                    }
                });
            };

            _webSocketService.MessageReceived += (sender, message) => {
                PluginLog.Info($"Received WebSocket message: {message}");
                // Handle incoming messages here
                HandleWebSocketMessage(message);
            };

            _webSocketService.ErrorOccurred += (sender, exception) => {
                PluginLog.Error($"WebSocket error: {exception.Message}");
            };
        }

        private void HandleWebSocketMessage(string message) {
            try {
                // Parse and handle the message based on your API protocol
                // This is where you would implement your specific message handling logic
                PluginLog.Verbose($"Processing message: {message}");

                // Parse JSON messages
                var messageData = JsonSerializer.Deserialize<JsonElement>(message);
                
                if (messageData.TryGetProperty("command", out var commandProperty)) {
                    var command = commandProperty.GetString();
                    var data = messageData.TryGetProperty("data", out var dataProperty) ? dataProperty : new JsonElement();

                    // Handle pomodoro commands
                    if (command.StartsWith("pomodoro-")) {
                        HandlePomodoroCommand(command, data);
                    } else {
                        PluginLog.Info($"Received unhandled command: {command}");
                    }
                } else {
                    PluginLog.Warning("Received message without command property");
                }
            } catch (JsonException ex) {
                PluginLog.Error($"Error parsing JSON message: {ex.Message}");
            } catch (Exception ex) {
                PluginLog.Error($"Error handling WebSocket message: {ex.Message}");
            }
        }

        private void HandlePomodoroCommand(string command, JsonElement data) {
            try {
                // Forward pomodoro commands to the ShowPomodoroTimeCommand instance
                var pomodoroCommand = ShowPomodoroTimeCommand.Instance;
                if (pomodoroCommand != null) {
                    pomodoroCommand.HandlePomodoroCommand(command, data);
                } else {
                    PluginLog.Warning("ShowPomodoroTimeCommand instance not found, cannot handle pomodoro command");
                }
            } catch (Exception ex) {
                PluginLog.Error($"Error handling pomodoro command '{command}': {ex.Message}");
            }
        }

        // Helper method to send JSON data to the WebSocket server
        public async Task SendJsonToServerAsync<T>(T data) {
            try {
                if (_webSocketService.IsConnected) {
                    await _webSocketService.SendJsonAsync(data);
                } else {
                    PluginLog.Warning("Cannot send data: WebSocket is not connected");
                }
            } catch (Exception ex) {
                PluginLog.Error($"Failed to send JSON data to server: {ex.Message}");
            }
        }
    }
}
