<div align="center">

# 🛠️ LSLib VS Code Tools

**Набор инструментов для моддинга Baldur's Gate 3 и Divinity: Original Sin 2 прямо в VS Code**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?logo=github)](https://github.com/ldiellyoungl/lslib-vs-code-tools)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.70+-blue.svg)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## 📖 О расширении

**LSLib VS Code Tools** — это расширение для Visual Studio Code, которое интегрирует инструменты [LSLib](https://github.com/Norbyte/LSLib) прямо в ваш редактор. Распаковывайте моды, конвертируйте ресурсы и редактируйте файлы прямо в привычной среде разработки.

---

### ⚙️ Divine CLI

#### 📦 Работа с `.pak` файлами

- **Пакетная распаковка `.pak`** — извлечение `.pak` архивов в папку с тем же именем.
- **Пакетная запаковка `.pak`** — создание `.pak` архивов из папки одним кликом.

#### 🔄 Конвертация ресурсов

- **Пакетная конвертация ресурсов**:
  - `LSF ↔ LSX` (бинарный формат ↔ XML)
  - `LSF ↔ LSJ` (бинарный формат ↔ JSON)
  - `LSB ↔ LSX/LSJ` (скриптовые бинарные форматы)
  - `loca ↔ LSX` (файлы локализации)

#### 🎛️ Конфигурация CLI

Вы можете настроить `game`, `compressionMethod` и `logLevel` для `divine CLI` прямо в настройках расширения.

<div align="center">

![Настройки расширения](screenshots/settings.png)

</div>

### 📄 Поддержка `meta.lsx`

- **Надёжный парсер на базе `sax`**.
- **HoverProvider** — подсказки по атрибутам, типам и нодам.

<div align="center">

![HoverProvider превью](screenshots/hoverProvider.png)

</div>

- **DiagnosticProvider** — полноценная диагностика файлов (ошибки XML, неверные атрибуты, невалидные версии и т.д.).

<div align="center">

![DiagnosticProvider превью](screenshots/diagnosticProvider.png)

</div>

- **InlayHints** — визуальное декодирование и быстрое редактирование `Version64`, а также генерация нового `UUID` в один клик.
  - **Декодирование и подсказки:**
    ![InlayHints превью](screenshots/inlayHints.png)
  - **Быстрое редактирование версии:**
    ![InlayHintsVersionEdit превью](screenshots/inlayHintsVersionEdit.png)
  - **Диалог выбора версии:**
    ![versionPick превью](screenshots/versionPick.png)
  - **Генерация нового UUID:**
    ![InlayHintsGenerateUUID превью](screenshots/inlayHintsGenerateUUID.png)

<br />

- **CodeLens** — быстрые действия для копирования и вставки `ModuleShortDesc`.

<div align="center">

![CodeLens превью](screenshots/codeLensProvider.png)

</div>

### 🔗 Навигация по файлам (Document Link Provider)

- Пути к ресурсам в атрибутах `source` и `value` теперь кликабельны. Вы можете переходить прямо к `.GR2`, `.DDS` и другим файлам в вашем моде.

<div align="center">

![Навигация по файлам превью](screenshots/documentLinkProvider.png)

</div>

### 🌍 Работа с локализацией

- **Умные декорации**: просмотр переводов для `handle` прямо в редакторе.
- **Быстрый переход**: клик по ссылке открывает файл локализации на нужной строке.

<div align="center">

![Работа с локализацией превью](screenshots/translationDecorator.png)

</div>

### 🙏 Благодарности

- **Norbyte** — за создание LSLib.
- **Larian Studios** — за прекрасные игры!
