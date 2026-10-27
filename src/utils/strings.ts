export function dedent(str: string): string {
  const lines = str.split("\n");
  // Находим минимальный отступ среди непустых строк
  const minIndent = Math.min(
    ...lines
      .filter((l) => l.trim().length > 0)
      .map((l) => l.match(/^\s*/)?.[0].length ?? 0),
  );
  // Убираем его
  return lines.map((l) => l.slice(minIndent)).join("\n");
}

export function compactXml(xml: string): string {
  // 1. Убираем лишние пробелы в начале и в конце
  const trimmed = xml.trim();

  // 2. Разбиваем на строки и убираем отступы, оставляя только сами теги
  const lines = trimmed.split("\n").map((line) => line.trim());

  // 3. Расставляем отступы: 2 пробела на уровень вложенности
  let indentLevel = 0;
  const formatted: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Если это закрывающий тег, уменьшаем отступ ДО записи строки
    if (line.startsWith("</")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    formatted.push("  ".repeat(indentLevel) + line);

    // Если это открывающий тег (но не самозакрывающийся и не закрывающий),
    // увеличиваем отступ для следующих строк
    if (
      line.startsWith("<") &&
      !line.startsWith("</") &&
      !line.endsWith("/>") &&
      !line.includes("</") // если тег и открывается, и закрывается в одной строке
    ) {
      indentLevel++;
    }
  }

  return formatted.join("\n");
}

export function truncate(str: string, maxLength: number = 12) {
  return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
}
