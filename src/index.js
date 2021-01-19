process.env.NODE_ENV = 'development';
const isDev = process.env.NODE_ENV !== 'production' ? true : false;
const isMac = process.platform === 'darwin' ? true : false;
const { app, BrowserWindow, Menu, ipcMain} = require('electron');
const path = require('path');
const { createWorker } = require('tesseract.js');

let mainWindow;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
	app.quit();
}

const createWindow = () => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		icon: `${__dirname}/assets/icons/Icon_256x256.png`,
		resizable: isDev,
		webPreferences: {
			nodeIntegration: true
		}
	});

	// and load the index.html of the app.
	mainWindow.loadFile(path.join(__dirname, 'index.html'));

	if (isDev) {
		// Open the DevTools.
		mainWindow.webContents.openDevTools();
	}

};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (!isMac) {
		app.quit();
	}
});

app.on('activate', () => {
// On OS X it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.
if (BrowserWindow.getAllWindows().length === 0) {
	createWindow();
}
});

ipcMain.on('image:ocr', (e, options) => {
	processImage(options);
});

async function processImage({ imgPath, lang }) {
	try {

		const worker = createWorker({
			cachePath: path.join(__dirname, 'traineddata'),
			logger: m => console.log(m),
		});

		(async () => {
			await worker.load();
			await worker.loadLanguage(lang);
			await worker.initialize(lang);
			const { data: { text } } = await worker.recognize(imgPath);
			console.log(text);
			await worker.terminate();
			mainWindow.webContents.send('image:done', text);
		})();

	} catch (err) {
		log.error(err);
	}
};