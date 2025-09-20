namespace Loupedeck.InlistPlugin.Services
{
    using System;
    using System.Net.WebSockets;
    using System.Text;
    using System.Threading;
    using System.Threading.Tasks;

    public class WebSocketService : IDisposable {
        private ClientWebSocket _webSocket;
        private CancellationTokenSource _cancellationTokenSource;
        private readonly string _serverUrl;
        private bool _isConnected;
        private bool _disposed;

        public event EventHandler<string> MessageReceived;
        public event EventHandler Connected;
        public event EventHandler Disconnected;
        public event EventHandler<Exception> ErrorOccurred;

        public bool IsConnected => _isConnected && _webSocket?.State == WebSocketState.Open;

        public WebSocketService(string serverUrl = "ws://localhost:7777") {
            this._serverUrl = serverUrl;
        }

        public async Task ConnectAsync() {
            try {
                if (_webSocket?.State == WebSocketState.Open) {
                    return;
                }

                _webSocket?.Dispose();
                _cancellationTokenSource?.Dispose();

                _webSocket = new ClientWebSocket();
                _cancellationTokenSource = new CancellationTokenSource();

                PluginLog.Info($"Connecting to WebSocket server at {_serverUrl}");
                
                await _webSocket.ConnectAsync(new Uri(_serverUrl), _cancellationTokenSource.Token);
                
                _isConnected = true;
                PluginLog.Info("WebSocket connection established successfully");
                
                Connected?.Invoke(this, EventArgs.Empty);

                // Start listening for messages
                _ = Task.Run(ListenForMessages, _cancellationTokenSource.Token);
            } catch (Exception ex) {
                _isConnected = false;
                PluginLog.Error($"Failed to connect to WebSocket server: {ex.Message}");
                ErrorOccurred?.Invoke(this, ex);
            }
        }

        public async Task DisconnectAsync() {
            try {
                _isConnected = false;
                
                if (_webSocket?.State == WebSocketState.Open) {
                    await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client disconnecting", CancellationToken.None);
                }
                
                _cancellationTokenSource?.Cancel();
                Disconnected?.Invoke(this, EventArgs.Empty);
                PluginLog.Info("WebSocket disconnected");
            } catch (Exception ex) {
                PluginLog.Error($"Error during WebSocket disconnect: {ex.Message}");
            }
        }

        public async Task SendMessageAsync(string message)
        {
            if (!IsConnected) {
                throw new InvalidOperationException("WebSocket is not connected");
            }

            try {
                var buffer = Encoding.UTF8.GetBytes(message);
                await _webSocket.SendAsync(
                    new ArraySegment<byte>(buffer),
                    WebSocketMessageType.Text,
                    true,
                    _cancellationTokenSource.Token);
                
                PluginLog.Verbose($"Sent message: {message}");
            } catch (Exception ex) {
                PluginLog.Error($"Failed to send message: {ex.Message}");
                ErrorOccurred?.Invoke(this, ex);
            }
        }

        public async Task SendJsonAsync<T>(T data) {
            var json = System.Text.Json.JsonSerializer.Serialize(data);
            await SendMessageAsync(json);
        }

        private async Task ListenForMessages() {
            var buffer = new byte[1024 * 4];

            try {
                while (_webSocket.State == WebSocketState.Open && !_cancellationTokenSource.Token.IsCancellationRequested) {
                    var result = await _webSocket.ReceiveAsync(
                        new ArraySegment<byte>(buffer),
                        _cancellationTokenSource.Token);

                    if (result.MessageType == WebSocketMessageType.Text) {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        PluginLog.Verbose($"Received message: {message}");
                        MessageReceived?.Invoke(this, message);
                    } else if (result.MessageType == WebSocketMessageType.Close) {
                        _isConnected = false;
                        Disconnected?.Invoke(this, EventArgs.Empty);
                        break;
                    }
                }
            } catch (OperationCanceledException) {
                // Expected when cancellation is requested
                PluginLog.Info("WebSocket message listening was cancelled");
            } catch (Exception ex) {
                _isConnected = false;
                PluginLog.Error($"Error while listening for WebSocket messages: {ex.Message}");
                ErrorOccurred?.Invoke(this, ex);
                Disconnected?.Invoke(this, EventArgs.Empty);
            }
        }

        public void Dispose()
        {
            if (_disposed)
                return;

            _disposed = true;
            
            try {
                DisconnectAsync().Wait(TimeSpan.FromSeconds(5));
            } catch (Exception ex) {
                PluginLog.Error($"Error during WebSocket disposal: {ex.Message}");
            } finally {
                _cancellationTokenSource?.Dispose();
                _webSocket?.Dispose();
            }
        }
    }
}