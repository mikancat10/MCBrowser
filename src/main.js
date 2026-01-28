const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');

log.transports.file.level = 'info';
autoUpdater.logger = log;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile('index.html');

  // ダウンロード処理
  session.defaultSession.on('will-download', (event, item) => {
    const savePath = path.join(app.getPath('downloads'), item.getFilename());
    item.setSavePath(savePath);

    item.on('updated', (_, state) => {
      if (state === 'progressing') {
        const percent = Math.round((item.getReceivedBytes() / item.getTotalBytes()) * 100);
        mainWindow.setProgressBar(percent / 100);
      }
    });

    item.once('done', (_, state) => {
      mainWindow.setProgressBar(-1);
      if (state === 'completed') {
        mainWindow.webContents.send('download-complete', savePath);
      }
    });
  });

  // 🔥 起動時アップデート確認
  autoUpdater.checkForUpdatesAndNotify();
}

/* ===== アップデートイベント ===== */

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'アップデートがあります',
    message: '新しいバージョンをダウンロードしています…'
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'question',
    buttons: ['今すぐ再起動', 'あとで'],
    defaultId: 0,
    message: 'アップデートが完了しました。再起動しますか？'
  }).then(result => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});

ipcMain.on('close-app', () => app.quit());

app.whenReady().then(createWindow);
