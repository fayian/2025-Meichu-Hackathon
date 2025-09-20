namespace Loupedeck.InlistPlugin
{
    using System;
    using System.Threading.Tasks;

    // This class implements an example command that counts button presses.

    public class CounterCommand : PluginDynamicCommand
    {
        private Int32 _counter = 0;

        // Initializes the command class.
        public CounterCommand()
            : base(displayName: "Press Counter", description: "Counts button presses", groupName: "Commands")
        {
        }

        // This method is called when the user executes the command.
        protected override void RunCommand(String actionParameter)
        {
            this._counter++;
            this.ActionImageChanged(); // Notify the plugin service that the command display name and/or image has changed.
            PluginLog.Info($"Counter value is {this._counter}"); // Write the current counter value to the log file.

            // Send counter data to WebSocket server
            _ = Task.Run(async () =>
            {
                try
                {
                    var plugin = this.Plugin as InlistPlugin;
                    if (plugin?.WebSocketService?.IsConnected == true)
                    {
                        var counterData = new
                        {
                            action = "counter_update",
                            value = this._counter,
                            timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                        };

                        await plugin.SendJsonToServerAsync(counterData);
                        PluginLog.Info($"Sent counter update to server: {this._counter}");
                    }
                    else
                    {
                        PluginLog.Warning("WebSocket not connected, counter update not sent");
                    }
                }
                catch (Exception ex)
                {
                    PluginLog.Error($"Failed to send counter update: {ex.Message}");
                }
            });
        }

        // This method is called when Loupedeck needs to show the command on the console or the UI.
        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) =>
            $"Press Counter{Environment.NewLine}{this._counter}";
    }
}
