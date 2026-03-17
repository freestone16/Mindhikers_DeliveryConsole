const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let loaded = false;

function loadRuntimeEnv() {
  if (!loaded) {
    const envFiles = ['.env.local', '.env'];
    for (const fileName of envFiles) {
      const filePath = path.resolve(process.cwd(), fileName);
      if (fs.existsSync(filePath)) {
        dotenv.config({ path: filePath, override: false });
      }
    }
    loaded = true;
  }

  return {
    frontendPort: Number(process.env.VITE_APP_PORT || 5176),
    backendPort: Number(process.env.VITE_BACKEND_PORT || process.env.PORT || 3004),
  };
}

module.exports = { loadRuntimeEnv };
