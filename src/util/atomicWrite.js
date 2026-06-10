const fs = require("node:fs");

async function writeFileAtomic(targetPath, bytes) {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;

  try {
    await fs.promises.writeFile(tmpPath, bytes);
    await fs.promises.rename(tmpPath, targetPath);
  } finally {
    await removeFileIfPresent(tmpPath);
  }
}

async function removeFileIfPresent(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }
}

module.exports = {
  writeFileAtomic,
};
