'use strict';

const { Clutter } = imports.gi;

const EndSessionDialog = imports.ui.endSessionDialog.EndSessionDialog;

const Gettext = imports.gettext;

function gettext(msg)
{
    return Gettext.dgettext("gnome-shell", msg);
}


function pgettext(ctx, msg)
{
    return Gettext.dpgettext("gnome-shell", ctx, msg);
}

class Extension {
    enable() {
        this._originUpdateButtonsFunc = EndSessionDialog.prototype._updateButtons;
        EndSessionDialog.prototype._updateButtons = function () {
            this.clearButtons();

            const addButton = (buttonInfo) => {
                const button = this.addButton(buttonInfo);
                if (buttonInfo.setKeyFocus) {
                    this.setInitialKeyFocus(button);
                }
                return button;
            };

            addButton({
                label: gettext("Cancel"),
                key: Clutter.KEY_Escape,
                action: this.cancel.bind(this),
            });

            addButton({
                label: pgettext("button", "Log Out"),
                setKeyFocus: this._type === 0,
                action: () => {
                    const signalId = this.connect(`closed`, () => {
                        this.disconnect(signalId);
                        this._confirm(`ConfirmedLogout`);
                    });
                    this.close(true);
                },
            });

            const rebootAndInstall = this._pkOfflineProxy && (this._updateInfo.UpdateTriggered || this._updateInfo.UpgradeTriggered);
            this._rebootButton = addButton({
                label: rebootAndInstall ? pgettext("button", "Restart &amp; Install") : pgettext("button", "Restart"),
                setKeyFocus: this._type >= 2 && this._type <= 4,
                action: () => {
                    const signalId = this.connect(`closed`, () => {
                        this.disconnect(signalId);
                        this._confirm(`ConfirmedReboot`);
                    });
                    this.close(true);
                },
            });

            if (this._canRebootToBootLoaderMenu) {
                this._rebootButtonAlt = addButton({
                    label: pgettext("button", "Boot Options"),
                    action: () => {
                        const signalId = this.connect(`closed`, () => {
                            this.disconnect(signalId);
                            this._confirmRebootToBootLoaderMenu();
                        });
                        this.close(true);
                    },
                });
                this._rebootButtonAlt.visible = false;
                this._capturedEventId = this.connect(`captured-event`, this._onCapturedEvent.bind(this));
            }

            addButton({
                label: pgettext("button", "Power Off"),
                setKeyFocus: this._type === 1,
                action: () => {
                    const signalId = this.connect(`closed`, () => {
                        this.disconnect(signalId);
                        this._confirm(`ConfirmedShutdown`);
                    });
                    this.close(true);
                },
            });
        };
    }

    disable() {
        EndSessionDialog.prototype._updateButtons = this._originUpdateButtonsFunc;
        delete this._originUpdateButtonsFunc;
    }
}

var init = () => {
    return new Extension();
};
