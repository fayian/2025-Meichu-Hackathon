namespace Loupedeck.InlistPlugin.Actions {
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;

    public class RequestSetPomodoroAICommand : PluginDynamicFolder {
        private readonly string[] _aiOptions = { "", "", "�}�n", "�@��", "�h��", "�ӵu", "��n", "�Ӫ�" };

        public RequestSetPomodoroAICommand() {
            this.DisplayName = "�f�X��AI�^�X";
            this.Description = "����AI�f�X���ǲߦ^�X";
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