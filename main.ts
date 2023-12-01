import {App, Editor, Plugin, PluginSettingTab, Setting} from 'obsidian';

interface CustomListCharacterSettings {
    listCharacter: string;
    keepIndentation: boolean;
}

const DEFAULT_SETTINGS: CustomListCharacterSettings = {
    listCharacter: '-',
    keepIndentation: true
}

export default class CustomListCharacterPlugin extends Plugin {
    settings: CustomListCharacterSettings;

    async onload() {
        await this.loadSettings();

        // Add an editor command that adds the custom list character befor each line of the selection
        this.addCommand({
            id: "toggle-or-format-bullet-list",
            name: "Toggle or format bullet list",
            icon: "list",
            editorCallback: (editor: Editor) => {
                this.setBulletList(editor)
            }
        });

        // Add setting tab
        this.addSettingTab(new CustomListCharacterSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // Format the selection to make a bullet list with the custom character
    private setBulletList(editor: Editor) {
        let processedSelection = "";

        // Select whole lines of the selection
        const selectionRange = this.getSelection(editor);
        editor.setSelection(selectionRange.begin, selectionRange.end);

        // Cleaning the selection
        let selection = editor.getSelection().split('\n');
        if (! this.settings.keepIndentation) {
            selection = this.trimSelection(selection);
        }

        // Check if selection is already a well formatted bullet list
        // If true, remove the bullet list
        // Else, format the selection to make a bullet list with the custom character
        if (this.isFormattedBulletList(selection)) {
            processedSelection = this.unsetBulletList(selection);
        } else {
            processedSelection = this.formatSelection(selection);
        }

        // Remove extra new line
        processedSelection = processedSelection.substring(0, processedSelection.length - 1)

        // Replace selection with the bullet list and keep selection active
        editor.replaceSelection(processedSelection);
        selectionRange.end.ch = editor.getLine(selectionRange.end.line).length;
        editor.setSelection(selectionRange.begin, selectionRange.end);
    }

    // Get the range of the selection, adding parts of the lines that are not selected
    private getSelection(editor: Editor) {
        const selectionBeginLine = editor.getCursor("from").line;
        const selectionEndLine = editor.getCursor("to").line;
        const endLineLength = editor.getLine(selectionEndLine).length;
        return {begin: {ch: 0, line: selectionBeginLine}, end: {ch: endLineLength, line: selectionEndLine}};
    }

    // Check if all selected lines are formatted with the custom character or are an empty line
    private isFormattedBulletList(selection: Array<string>) {
        let customListCharacterCount = 0;
        const regexWellFormatted = new RegExp("^ *\\" + this.settings.listCharacter + " .*$");
        for (const line of selection) {
            if (regexWellFormatted.test(line) || line == "") {
                customListCharacterCount++
            }
        }
        return selection.length == customListCharacterCount;
    }

    // Remove the bullet list character from the lines of the selected bullet list
    // Note: it keeps indentation
    private unsetBulletList(selection: Array<string>) {
        let startPos = 0
        let processedSelection = "";
        for (let line of selection) {
            if (line != "") {
                startPos = line.indexOf(this.settings.listCharacter)
                line = " ".repeat(startPos) + line.substring(startPos + 2);
            }
            processedSelection += line + '\n';
        }
        return processedSelection;
    }

    // Format all selected lines to make a bullet list with the custom character
    // Note: it keeps indentation
    private formatSelection(selection: Array<string>) {
        let formattedSelection = "";
        let startPos = 0;
        const regexDashFormat = new RegExp("^ *\\- .*$");
        const regexAsteriskFormat = new RegExp("^ *\\* .*$");
        const regexPlusFormat = new RegExp("^ *\\+ .*$");

        for (let line of selection) {
            let characterToSearch = '';
            if (regexDashFormat.test(line)) {
                characterToSearch = '-';
            }

            if (regexAsteriskFormat.test(line)) {
                characterToSearch = '*';
            }

            if (regexPlusFormat.test(line)) {
                characterToSearch = '+';
            }

            if (characterToSearch != '') {
                startPos = line.indexOf(characterToSearch)
                line = " ".repeat(startPos) + this.settings.listCharacter + line.substring(startPos + 1);
            } else {
                startPos = line.search(/\S/);
                line = " ".repeat(startPos) + this.settings.listCharacter + ' ' + line.substring(startPos);
            }
            formattedSelection += line + '\n';
        }
        return formattedSelection;
    }

    //Trim all selected lines before formatting
    private trimSelection(selection: Array<string>) {
        const trimmedSelection = new Array<string>();

        for (const line of selection) {
            trimmedSelection.push(line.trim());
        }
        return trimmedSelection;
    }
}

class CustomListCharacterSettingTab extends PluginSettingTab {
    plugin: CustomListCharacterPlugin;

    constructor(app: App, plugin: CustomListCharacterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('List character')
            .setDesc('Use this character to make your bullet lists')
            .addDropdown(dropDown => dropDown
                .addOption('-', '-')
                .addOption('*', '*')
                .addOption('+', '+')
                .setValue(this.plugin.settings.listCharacter)
                .onChange(async (value) => {
                    this.plugin.settings.listCharacter = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Keep indentation')
            .setDesc('Keep indentation while formatting or unformatting')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.keepIndentation)
                .onChange(async (value) => {
                    this.plugin.settings.keepIndentation = value;
                    await this.plugin.saveSettings();
                }));
    }
}
