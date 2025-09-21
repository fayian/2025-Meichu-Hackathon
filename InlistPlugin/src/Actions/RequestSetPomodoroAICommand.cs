namespace Loupedeck.InlistPlugin.Actions {
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class RequestSetPomodoroAICommand : PluginDynamicFolder {
        private readonly string[] _aiOptions = { "", "", "良好", "一般", "疲憊", "太短", "剛好", "太長" };

        public RequestSetPomodoroAICommand() {
            this.DisplayName = "番茄鐘AI回饋";
            this.Description = "提供AI番茄鐘學習回饋";
            this.GroupName = "Inlisted";
        }

        public override IEnumerable<String> GetButtonPressActionNames(DeviceType deviceType) {
            foreach (var option in _aiOptions) {
                yield return this.CreateCommandName(option);
            }
        }

        public override void RunCommand(String actionName) {
            // No RunCommand functionality as requested
        }
    }
}