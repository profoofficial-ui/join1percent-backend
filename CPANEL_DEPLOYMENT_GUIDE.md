# cPanel Node.js Deployment Guide — Coursellm Backend

This guide walks you through deploying the **Coursellm Backend** (Node.js + Express + TypeScript + MongoDB + Razorpay) to any cPanel hosting account using **"Setup Node.js App"** (Phusion Passenger).

---

## 1. Prerequisites Before You Begin

1. **MongoDB Database (MongoDB Atlas)**:
   - Shared cPanel hosting servers **do not support local MongoDB**.
   - Create a free cloud database cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
   - In MongoDB Atlas:
     - **Database Access**: Create a database user with read/write access.
     - **Network Access**: Add IP address `0.0.0.0/0` ("Allow Access from Anywhere") because cPanel shared server IPs change or use internal routing.
     - **Connection String**: Copy your connection string (format: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/coursellm?retryWrites=true&w=majority`).

2. **Domain / Subdomain in cPanel**:
   - Best practice: Create a subdomain such as `api.yourdomain.com` (or `backend.yourdomain.com`).
   - Enable SSL (cPanel AutoSSL or Let's Encrypt) on the subdomain so your API runs on `https://`.

---

## 2. Files Prepared for Deployment

The backend has already been compiled with `npm run build` and configured for cPanel:
- `app.js` is created in the root directory to act as the cPanel Phusion Passenger entry point (points directly to `./dist/index.js`).
- Dynamic port detection is enabled (handles both standard ports and cPanel Passenger Unix sockets).
- Reverse proxy trust (`trust proxy`) is enabled for proper HTTPS/IP resolution.
- Comma-separated or wildcard CORS support is configured.

### What to Upload:
- ✅ `dist/` (the compiled JavaScript production bundle)
- ✅ `uploads/` (directory with `images/` and `videos/` subdirectories)
- ✅ `app.js` (entry point for cPanel)
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `.env` (can be uploaded or configured in cPanel UI)

### What NOT to Upload:
- ❌ `node_modules/` (Do **not** upload! Uploading Windows `node_modules` to Linux will break dependencies. Always run `npm install` on the server).
- ❌ `src/` (Not strictly needed on the server because `dist/` contains all compiled code).
- ❌ `.git/`

---

## 3. Step-by-Step Deployment on cPanel

### Step 1: Create the Node.js Application in cPanel
1. Log into your **cPanel**.
2. Under the **Software** section, click **Setup Node.js App** (or **Node.js Selector**).
3. Click the blue **Create Application** button.
4. Fill in the following fields:
   - **Node.js version**: Select **`20.x`** (or `18.x` LTS).
   - **Application mode**: Select **`Production`**.
   - **Application root**: Enter a directory name, e.g. `api` or `coursellm-backend` (this folder will be created in your home directory: `/home/yourusername/api`).
   - **Application URL**: Select your subdomain (e.g. `api.yourdomain.com`) or domain path.
   - **Application startup file**: Enter **`app.js`** (the file we created in the root).
5. Click **Create** (top right).
6. Note the command shown at the top: `source /home/yourusername/nodevenv/.../activate`.

---

### Step 2: Upload Application Files
1. Open cPanel **File Manager**.
2. Navigate to your application root directory (e.g., `/home/yourusername/api` or `/home/yourusername/coursellm-backend`).
3. If cPanel created a default placeholder `app.js` or `package.json`, delete or overwrite them.
4. Upload a `.zip` file containing:
   - `dist`
   - `uploads`
   - `app.js`
   - `package.json`
   - `package-lock.json`
   - `.env`
5. Extract the `.zip` file into the application root folder.
6. Verify file permissions:
   - Folders (including `uploads`, `uploads/images`, `uploads/videos`) should be `0755`.
   - Files should be `0644`.

---

### Step 3: Configure Environment Variables

You can configure them either in the `.env` file in the application root, or in the cPanel Node.js App UI under **Environment variables**:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/coursellm?retryWrites=true&w=majority
CLIENT_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
JWT_SECRET=use_a_very_secure_random_string_here_32_chars_min
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_password
ADMIN_NAME=Coursellm Admin
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

> **Note on `CLIENT_ORIGIN`**: If your frontend is deployed on `https://yourdomain.com`, make sure you include `https://` and both `www` and non-`www` versions separated by a comma.

---

### Step 4: Install Dependencies

1. Go back to **Setup Node.js App** in cPanel.
2. Click the edit (pencil) icon next to your app.
3. Click the **Run NPM Install** button.
   - Wait 1-2 minutes until cPanel finishes installing the production dependencies.
   - *(Alternative via Terminal)*: Open cPanel Terminal, copy and paste the `source /home/.../activate` command, and run:
     ```bash
     npm install --omit=dev
     ```

---

### Step 5: Start or Restart the Application

1. In the Node.js App screen, click **Restart** (or **Run App**).
2. The application status should change to **Running**.

---

## 4. Verification

Test your API in a web browser or Postman:

1. **Health check**:
   ```
   https://api.yourdomain.com/api/health
   ```
   **Expected Response**:
   ```json
   {
     "ok": true,
     "service": "coursellm-api",
     "phase": 4,
     "payments": "razorpay"
   }
   ```

2. **Swagger Documentation**:
   ```
   https://api.yourdomain.com/api/docs
   ```

3. **Catalogue / Public Courses**:
   ```
   https://api.yourdomain.com/api/courses
   ```

---

## 5. Troubleshooting Common cPanel Issues

### Problem 1: `503 Service Unavailable` or `Incomplete response received from application`
- **Cause**: The application crashed during startup (usually unable to connect to MongoDB).
- **Fix**:
  1. Check your MongoDB Atlas connection string.
  2. Verify that MongoDB Atlas **Network Access** includes `0.0.0.0/0`.
  3. Check the error log: in cPanel File Manager, check `stderr.log` in your application root folder or look in `/home/username/virtualenv/...`.

### Problem 2: CORS Error (`Access to fetch blocked by CORS policy`)
- **Cause**: `CLIENT_ORIGIN` does not match the frontend's origin URL.
- **Fix**: Update `CLIENT_ORIGIN` to match your exact frontend domain, including `https://` and any subdomains (comma-separated):
  ```
  CLIENT_ORIGIN=https://myapp.com,https://www.myapp.com
  ```
  Restart the Node.js app in cPanel after updating.

### Problem 3: Uploaded images/videos return 404 or upload fails
- **Cause**: The `uploads/` directory does not exist or has restrictive write permissions.
- **Fix**: In cPanel File Manager, ensure `uploads/images` and `uploads/videos` exist and have permission `755`.

### Problem 4: Changes to code or `.env` are not showing up
- **Cause**: Phusion Passenger caches the Node.js process in memory.
- **Fix**: Click **Restart** in the cPanel Node.js App interface, or in Terminal run:
  ```bash
  mkdir -p tmp && touch tmp/restart.txt
  ```
