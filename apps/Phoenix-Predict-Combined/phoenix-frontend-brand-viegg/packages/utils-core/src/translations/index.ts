const path = require("path");

const generateLocales = (sourcePaths: any, outPath: any) => {
  console.log("[Utils:translations] Generating...");

  const paths = typeof sourcePaths === "string" ? [sourcePaths] : sourcePaths;
  paths.reverse();

  Object.keys(require.cache).forEach(function(key) {
    delete require.cache[key];
  });

  const { readdirSync, writeFileSync, mkdirSync } = require("fs");

  const getDirectories = (source: string) =>
    readdirSync(source, { withFileTypes: true })
      .filter((dirent: any) => dirent.isDirectory())
      .map((dirent: any) => dirent.name)
      .filter((name: string) => name && name !== "/");

  paths.forEach((sourcePath: string) => {
    getDirectories(sourcePath).forEach((langDir: string) => {
      const outDir = `${outPath}/${langDir}`;
      try {
        mkdirSync(outDir, { recursive: true });
      } catch (e) {
        console.log(`Cannot create directory: ${outDir}`, e);
      }

      readdirSync(path.join(sourcePath, langDir), { withFileTypes: true })
        .filter((dirent: any) => !dirent.isDirectory())
        .map((dirent: any) => dirent.name)
        .filter((name: string) => name.endsWith(".js") && !name.endsWith(".js.map"))
        .forEach((name: string) => {
          const file = require(path.join(sourcePath, `${langDir}/${name}`));
          const outFile = `${outDir}/${name.replace(".js", ".json")}`;
          const { unlinkSync } = require("fs");
          try {
            unlinkSync(outFile);
          } catch (e) {}
          try {
            writeFileSync(outFile, JSON.stringify(file, null, 2));
          } catch (e) {
            console.log(`Cannot create file: ${outFile}`, e);
          }
        });
    });
  });

  console.log("[Utils:translations] Finished...");
};

const watchFiles = (sourcePaths: any, outPath: any, generateOnInit = false) => {
  const [sourcePath] =
    typeof sourcePaths === "string" ? [sourcePaths] : sourcePaths;
  const watch = require("watch");
  if (generateOnInit) {
    console.log("[Utils:translations] Initializing...");
    generateLocales(sourcePaths, outPath);
  }
  watch.watchTree(sourcePath, (f: any, curr: any, prev: any) => {
    if (typeof f == "object" && prev === null && curr === null) {
      console.log("[Utils:translations] Watching directory...");
      return;
    } else {
      generateLocales(sourcePath, outPath);
    }
  });
};

export const translations = {
  generateLocales,
  watchFiles,
};
