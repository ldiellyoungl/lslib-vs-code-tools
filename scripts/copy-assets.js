const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "../src/glossary");
const outDir = path.join(__dirname, "../out/glossary");

const WATCH_MODE = process.argv.includes("--watch");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    const ext = path.extname(src).toLowerCase();
    // Копируем только нужные файлы
    if (
      [".html", ".png", ".jpg", ".svg", ".ttf", ".woff", ".woff2"].includes(ext)
    ) {
      fs.copyFileSync(src, dest);
      console.log(`[copy] Скопирован: ${path.relative(process.cwd(), dest)}`);
    }
  }
}

// 1. Первичное копирование при запуске
copyRecursive(srcDir, outDir);

// 2. Режим наблюдения
if (WATCH_MODE) {
  console.log("Ожидание изменений в папке src/glossary...");

  // fs.watch с recursive: true следит за всеми вложенными папками
  fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    const srcPath = path.join(srcDir, filename);
    const outPath = path.join(outDir, filename);

    // Если файл удален
    if (!fs.existsSync(srcPath)) {
      if (fs.existsSync(outPath)) {
        fs.unlinkSync(outPath);
        console.log(`[copy] Удален: ${filename}`);
      }
      return;
    }

    // Если файл добавлен или изменен
    const ext = path.extname(filename).toLowerCase();
    if (
      [".html", ".png", ".jpg", ".svg", ".ttf", ".woff", ".woff2"].includes(ext)
    ) {
      try {
        // Создаем папку, если её нет
        const dir = path.dirname(outPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.copyFileSync(srcPath, outPath);
        console.log(`[copy] Обновлен: ${filename}`);
      } catch (err) {
        console.error(`[copy] Ошибка копирования ${filename}:`, err.message);
      }
    }
  });
}
