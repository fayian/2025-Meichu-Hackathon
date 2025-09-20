namespace Loupedeck.InlistPlugin
{
    using System;
    using System.Threading.Tasks;
    using Loupedeck.InlistPlugin.Services;

    // This class contains the plugin-level logic of the Loupedeck plugin.

    public class InlistPlugin : Plugin {
        private WebSocketService _webSocketService;

        // Gets a value indicating whether this is an API-only plugin.
        public override Boolean UsesApplicationApiOnly => true;

        // Gets a value indicating whether this is a Universal plugin or an Application plugin.
        public override Boolean HasNoApplication => false;

        // Gets the WebSocket service instance
        public WebSocketService WebSocketService => _webSocketService;

        // Initializes a new instance of the plugin class.
        public InlistPlugin() {
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

                // Example: Parse JSON messages
                // var messageData = System.Text.Json.JsonSerializer.Deserialize<YourMessageType>(message);
                // Process the message data...
            }
            catch (Exception ex) {
                PluginLog.Error($"Error handling WebSocket message: {ex.Message}");
            }
        }

        // Helper method to send messages to the WebSocket server
        public async Task SendMessageToServerAsync(string message) {
            try {
                if (_webSocketService.IsConnected) {
                    await _webSocketService.SendMessageAsync(message);
                } else {
                    PluginLog.Warning("Cannot send message: WebSocket is not connected");
                }
            } catch (Exception ex) {
                PluginLog.Error($"Failed to send message to server: {ex.Message}");
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
