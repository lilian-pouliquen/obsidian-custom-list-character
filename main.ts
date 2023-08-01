import { App, Editor, setIcon, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface CustomListCharacterSettings {
    listCharacter: string;
}

const DEFAULT_SETTINGS: CustomListCharacterSettings = {
    listCharacter: '-'
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
        selection = this.trimLines(selection);

        // Check if selection is already a well formated bullet list
        // If true, remove the bullet list
        // Else, format the selection to make a bullet list with the custom character
        if (this.isBulletList(selection)) {
            for (let line of selection) {
                if (line != "") {
                    line = line.substring(2);
                }
                processedSelection += line + '\n';
            }
        }
        else {
            for (let line of selection) {
                if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("+ ")) {
                    line = line.substring(2);
                }
                if (line != "") {
                    processedSelection += this.settings.listCharacter + ' ' + line + '\n';
                } else {
                    processedSelection += line + '\n';
                }
            }
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
        return { begin: { ch: 0, line: selectionBeginLine }, end: { ch: endLineLength, line: selectionEndLine } };
    }

    // Trim all lines
    private trimLines(selection: Array<string>) {
        const trimedSelection = [];
        for (const line of selection) {
            trimedSelection.push(line.trim());
        }
        return trimedSelection;
    }

    // Check if all selected lines start with the custom character or is an empty line
    private isBulletList(selection: Array<string>) {
        let customListCharacterCount = 0;
        for (const line of selection) {
            if (line.startsWith(this.settings.listCharacter + ' ') || line == "") {
                customListCharacterCount++
            }
        }
        return selection.length == customListCharacterCount;
    }
}

class CustomListCharacterSettingTab extends PluginSettingTab {
    plugin: CustomListCharacterPlugin;

    constructor(app: App, plugin: CustomListCharacterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

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
    }
}
